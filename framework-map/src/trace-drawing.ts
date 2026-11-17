/**
 * trace-drawing: what the scene draws for a need trace, beside the traced
 * marks' own fill.
 *
 * - The need's home cell takes an outline.
 * - A line runs from the home cell to each traced tool outside it. A traced
 *   tool of the home cluster stands inside the outline, and has no line.
 * - A best-fit tool's mark takes a ring, which stands a gap clear of it.
 * - The selected tool's mark takes a ring of its own, in `ink`. While a need
 *   is traced the selected fill says "traced", so it cannot say "selected".
 *
 * A best-fit ring never reaches a neighbouring mark. Where the marks are drawn
 * too small for the token's gap and width, the ring keeps to the space between
 * two marks, and its line thins with it.
 *
 * The filters apply on top of the trace: a traced tool they leave out is
 * faded, and has no line and no ring. The lines cross plates, so no plate
 * hides them. All of it goes when the need changes or the lens is switched
 * off.
 */
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import type { GraphIndex } from './data';
import { STACK_METRICS } from './layout';
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
/** The ring of the selected tool, while a need is traced. */
const SELECTED_RING = MAP_TOKENS['map-trace-selected'];
const SELECTED_MARK: MarkToken = { fill: null, outline: SELECTED_RING.line, widthPx: SELECTED_RING.widthPx, dashed: false };
/** The space between two neighbouring marks, in layout units: the most a best-fit ring may stand out from its mark. */
const ROOM_AROUND_A_MARK = STACK_METRICS.pitch - STACK_METRICS.markSize;
/** The thinnest a best-fit ring's line is drawn, in pixels. */
const THINNEST_RING_PX = 1;

export interface TraceDrawing {
  /** Draws the trace of a state, and takes away the one before. A state with no need traced draws nothing. */
  show(state: Pick<MapState, 'lens' | 'filters' | 'selection'>): void;
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

  // The ring of the selected tool. It stands outside a best-fit ring.
  const selectedMaterial = markMaterial(SELECTED_MARK, pixelRatio);
  const selectedRing = new Mesh(square, selectedMaterial);
  selectedRing.renderOrder = OVER_THE_MARKS;
  selectedRing.visible = false;
  add(selectedRing);
  let selected: MarkLayout | null = null;

  /** Puts a ring round a mark, standing `reach` layout units out from it. */
  function ringRound(ring: Mesh, mark: MarkLayout, reach: number): void {
    ring.position.set(mark.x, mark.y + MARK_LIFT * 1.5, mark.z);
    ring.scale.setScalar((mark.size + 2 * reach) / MARK_SHARE_OF_QUAD);
  }

  /** Shows the rings, once the scene has said how large a pixel is at each mark. */
  function placeRings(): void {
    rings.forEach((ring, at) => {
      ring.visible = unitsPerPixel !== null && at < ringed.length;
    });
    selectedRing.visible = unitsPerPixel !== null && selected !== null;
    if (!unitsPerPixel) return;
    const pixelAt = (mark: MarkLayout): number => unitsPerPixel!(mark.x, mark.y + MARK_LIFT * 1.5, mark.z);
    const fullPx = BEST_FIT_RING.gapPx + BEST_FIT_RING.widthPx;
    /** How far a best-fit ring stands out from its mark: as far as the token says, where there is room for that. */
    const bestFitReach = (mark: MarkLayout): number => Math.min(fullPx * pixelAt(mark), ROOM_AROUND_A_MARK);
    // One line width for every ring: the thinnest any of them needs, so that each keeps its gap.
    let share = 1;
    ringed.forEach((mark, at) => {
      const reach = bestFitReach(mark);
      share = Math.min(share, reach / (fullPx * pixelAt(mark)));
      ringRound(rings[at]!, mark, reach);
    });
    ringMaterial.uniforms.uOutlinePx!.value = Math.max(THINNEST_RING_PX, BEST_FIT_RING.widthPx * share);
    if (!selected) return;
    const inside = ringed.includes(selected) ? bestFitReach(selected) : 0;
    ringRound(selectedRing, selected, inside + (SELECTED_RING.gapPx + SELECTED_RING.widthPx) * pixelAt(selected));
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
        const [left, right] = [home.x - home.width / 2, home.x + home.width / 2];
        for (const mark of marksOf(index.traced(state.lens))) {
          // A traced tool of the home cluster stands inside the outline, which ties it to the need already.
          if (mark.cluster === home.cluster) continue;
          // Each line leaves the home cell's outline at a point of its own, so the lines spread and none
          // starts on a mark. To a tool on the same plate it leaves the nearer side, level with the tool.
          // To a tool on another plate it leaves the back edge for a higher plate and the front edge for
          // a lower one, as near under or over the tool as the edge reaches.
          const alongside = mark.y === home.y;
          const startX = alongside ? (mark.x < home.x ? left : right) : Math.min(right, Math.max(left, mark.x));
          const startZ = alongside ? mark.z : home.z + (mark.y > home.y ? -1 : 1) * (home.depth / 2);
          corners.push(startX, home.y + MARK_LIFT, startZ, mark.x, mark.y + MARK_LIFT, mark.z);
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
      // The selected tool is ringed whether the need pulls it in or not, and whatever the filters do to it.
      const tool = need && state.selection?.type === 'tool' ? state.selection.id : null;
      selected = tool === null ? null : (markOf.get(tool) ?? null);
      placeRings();
    },
    place(unitsPerPixelAt) {
      unitsPerPixel = unitsPerPixelAt;
      placeRings();
    },
    setPixelRatio(ratio) {
      outlineMaterial.uniforms.uPixelRatio!.value = ratio;
      ringMaterial.uniforms.uPixelRatio!.value = ratio;
      selectedMaterial.uniforms.uPixelRatio!.value = ratio;
    },
  };
}
