/**
 * trace-drawing: what the scene draws for a need trace, beside the traced
 * marks' own fill.
 *
 * - The need's home cell takes an outline.
 * - A line runs from the home cell to each traced tool outside it. A traced
 *   tool of the home cluster stands inside the outline, and has no line.
 * - A best-fit tool's mark takes a ring, which stands a gap clear of it.
 *
 * The filters apply on top of the trace: a traced tool they leave out is
 * faded, and has no line and no ring. The lines cross plates, so no plate
 * hides them. All of it goes when the need changes or the lens is switched
 * off.
 */
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import type { GraphIndex } from './data';
import type { CellLayout, MarkLayout, StackLayout } from './layout';
import { MARK_LIFT, MARK_SHARE_OF_QUAD, OVER_THE_MARKS, markMaterial } from './mark-material';
import { tracedNeedOf } from './state';
import type { MapState } from './state';
import { MAP_TOKENS, colourOf } from './tokens';
import type { MarkToken } from './tokens';

/** The outline of the home cell is drawn as a mark with no fill, on a rectangle the size of the cell. */
const HOME_CELL = MAP_TOKENS['map-home-cell'];
const HOME_CELL_MARK: MarkToken = { fill: null, outline: HOME_CELL.line, widthPx: HOME_CELL.widthPx, dashed: false };
/** The ring of a best-fit tool is drawn the same way, on a square of its own around the mark. */
const BEST_FIT_RING = MAP_TOKENS['map-bestfit-ring'];
const BEST_FIT_MARK: MarkToken = {
  fill: null,
  outline: BEST_FIT_RING.line,
  widthPx: BEST_FIT_RING.widthPx,
  dashed: false,
};

export interface TraceDrawing {
  /** Draws the trace of a state, and takes away the one before. A state with no need traced draws nothing. */
  show(state: Pick<MapState, 'lens' | 'filters'>): void;
  /**
   * Sizes the rings so that each stands its gap clear of its mark, in pixels
   * on screen. The scene calls it when the camera moves.
   * @param unitsPerPixelAt How many layout units one pixel covers at a point of the scene.
   */
  place(unitsPerPixelAt: (x: number, y: number, z: number) => number): void;
  /** The widths of the outline and the rings are in screen pixels, so they follow the display's pixel ratio. */
  setPixelRatio(pixelRatio: number): void;
}

export function createTraceDrawing(
  add: (object: Object3D) => void,
  index: GraphIndex,
  layout: StackLayout,
  pixelRatio: number,
): TraceDrawing {
  const markOf = new Map<string, MarkLayout>(layout.marks.map((mark) => [mark.tool, mark]));
  const cellOf = new Map<string, CellLayout>(layout.cells.map((cell) => [cell.cluster, cell]));
  const square = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  const outlineMaterial = markMaterial(HOME_CELL_MARK, pixelRatio);
  const homeOutline = new Mesh(square, outlineMaterial);
  homeOutline.renderOrder = OVER_THE_MARKS;
  homeOutline.visible = false;
  add(homeOutline);

  // WebGL draws every line one pixel wide, which is the width the trace-line token asks for.
  const lineToken = MAP_TOKENS['map-trace-line'];
  if (lineToken.widthPx !== 1) throw new Error('The scene draws 1px trace lines only.');
  const lineColour = colourOf(lineToken.line);
  const lines = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: lineColour.hex,
      transparent: true,
      opacity: lineColour.alpha,
      depthTest: false,
      depthWrite: false,
    }),
  );
  lines.renderOrder = OVER_THE_MARKS;
  lines.frustumCulled = false;
  lines.visible = false;
  add(lines);

  // One ring for each best-fit tool on show. A ring is kept for the next trace once it is made.
  const ringMaterial = markMaterial(BEST_FIT_MARK, pixelRatio);
  const rings: Mesh[] = [];
  let ringed: MarkLayout[] = [];
  let unitsPerPixel: ((x: number, y: number, z: number) => number) | null = null;

  /** Shows a ring on each best-fit mark, once the scene has said how large a pixel is there. */
  function placeRings(): void {
    rings.forEach((ring, at) => {
      ring.visible = unitsPerPixel !== null && at < ringed.length;
    });
    if (!unitsPerPixel) return;
    ringed.forEach((mark, at) => {
      const ring = rings[at]!;
      const y = mark.y + MARK_LIFT * 1.5;
      const side = mark.size + 2 * (BEST_FIT_RING.gapPx + BEST_FIT_RING.widthPx) * unitsPerPixel!(mark.x, y, mark.z);
      ring.position.set(mark.x, y, mark.z);
      ring.scale.setScalar(side / MARK_SHARE_OF_QUAD);
    });
  }

  return {
    show(state) {
      const need = index.need(tracedNeedOf(state.lens) ?? '');
      const home = need ? cellOf.get(need.home_cluster) : undefined;
      homeOutline.visible = home !== undefined;
      if (home) {
        homeOutline.position.set(home.x, home.y + MARK_LIFT, home.z);
        homeOutline.scale.set(home.width / MARK_SHARE_OF_QUAD, 1, home.depth / MARK_SHARE_OF_QUAD);
      }

      const shown = index.emphasised(state);
      const marksOf = (ids: ReadonlySet<string>): MarkLayout[] =>
        [...ids].filter((id) => shown.has(id)).flatMap((id) => markOf.get(id) ?? []);

      const corners: number[] = [];
      if (home) {
        for (const mark of marksOf(index.traced(state.lens))) {
          // A traced tool of the home cluster stands inside the outline, which ties it to the need already.
          if (mark.cluster === home.cluster) continue;
          // The line leaves the home cell at the middle of an edge, not on one of its marks:
          // the back edge for a tool on a higher plate, and the front edge for any other.
          const edgeZ = home.z + (mark.y > home.y ? -1 : 1) * (home.depth / 2);
          corners.push(home.x, home.y + MARK_LIFT, edgeZ, mark.x, mark.y + MARK_LIFT, mark.z);
        }
      }
      lines.geometry.dispose();
      lines.geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(corners, 3));
      lines.visible = corners.length > 0;

      ringed = marksOf(index.bestFit(state.lens));
      while (rings.length < ringed.length) {
        const ring = new Mesh(square, ringMaterial);
        ring.renderOrder = OVER_THE_MARKS;
        add(ring);
        rings.push(ring);
      }
      placeRings();
    },
    place(unitsPerPixelAt) {
      unitsPerPixel = unitsPerPixelAt;
      placeRings();
    },
    setPixelRatio(ratio) {
      outlineMaterial.uniforms.uPixelRatio!.value = ratio;
      ringMaterial.uniforms.uPixelRatio!.value = ratio;
    },
  };
}
