/**
 * selection-drawing: what the scene draws for the selection, beside the
 * selected mark's own fill.
 *
 * - A selected cluster's cell takes an outline.
 * - `implements` lines run from a selected tool to the clusters it implements,
 *   and from a selected cluster to the tools that implement it. The far end of
 *   each line is outlined too, so the line ends on something that can be seen:
 *   a cell for a selected tool, a mark for a selected cluster.
 *
 * The lines cross plates, so no plate hides them. The scene asks this module
 * for the ends of the lines, to frame them and to fade the plates between.
 */
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import type { Box } from './camera';
import type { GraphIndex } from './data';
import type { CellLayout, MarkLayout, StackLayout } from './layout';
import { MARK_LIFT, MARK_SHARE_OF_QUAD, OVER_THE_MARKS, markMaterial } from './mark-material';
import type { Selection } from './state';
import { MAP_TOKENS, colourOf } from './tokens';
import type { MarkToken } from './tokens';

/** The outline of a selected cluster's cell is drawn as a mark with no fill, on a rectangle the size of the cell. */
const SELECTED_CELL = MAP_TOKENS['map-selected-cell'];
const SELECTED_CELL_MARK: MarkToken = {
  fill: null,
  outline: SELECTED_CELL.line,
  widthPx: SELECTED_CELL.widthPx,
  dashed: false,
};
/** How far the outline of a line's far mark stands from the mark, in layout units. */
const FAR_MARK_MARGIN = 0.1;

/** The two ends of one `implements` line: a tool's mark and a cluster's cell. */
export interface ImplementsEnd {
  mark: MarkLayout;
  cell: CellLayout;
  /** Which of the two is not the selection: the end the partner has to be shown. */
  far: 'mark' | 'cell';
}

export interface SelectionDrawing {
  /** The ends of the `implements` lines of a selection. A selection with none, or no selection, gives none. */
  endsOf(selection: Selection | null): ImplementsEnd[];
  /** The box that holds the far ends of a selection's lines, or null when it has no lines. */
  reachOf(selection: Selection | null): Box | null;
  /** Draws the outline and the lines of a selection, and takes away those of the one before. */
  show(selection: Selection | null): void;
  /** The outline's width is in screen pixels, so it follows the display's pixel ratio. */
  setPixelRatio(pixelRatio: number): void;
}

/** The four sides of a flat rectangle, as line segments. */
function sides(x: number, y: number, z: number, width: number, depth: number): number[] {
  const [left, right] = [x - width / 2, x + width / 2];
  const [back, front] = [z - depth / 2, z + depth / 2];
  return [
    ...[left, y, back, right, y, back],
    ...[right, y, back, right, y, front],
    ...[right, y, front, left, y, front],
    ...[left, y, front, left, y, back],
  ];
}

export function createSelectionDrawing(
  add: (object: Object3D) => void,
  index: GraphIndex,
  layout: StackLayout,
  pixelRatio: number,
): SelectionDrawing {
  const markOf = new Map<string, MarkLayout>(layout.marks.map((mark) => [mark.tool, mark]));
  const cellOf = new Map<string, CellLayout>(layout.cells.map((cell) => [cell.cluster, cell]));

  const outlineMaterial = markMaterial(SELECTED_CELL_MARK, pixelRatio);
  const cellOutline = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), outlineMaterial);
  cellOutline.renderOrder = OVER_THE_MARKS;
  cellOutline.visible = false;
  add(cellOutline);

  // WebGL draws every line one pixel wide, which is the width the trace-line token asks for.
  const traceToken = MAP_TOKENS['map-trace-line'];
  if (traceToken.widthPx !== 1) throw new Error('The scene draws 1px trace lines only.');
  const traceColour = colourOf(traceToken.line);
  const traces = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: traceColour.hex,
      transparent: true,
      opacity: traceColour.alpha,
      depthTest: false,
      depthWrite: false,
    }),
  );
  traces.renderOrder = OVER_THE_MARKS;
  traces.frustumCulled = false;
  traces.visible = false;
  add(traces);

  function endsOf(selection: Selection | null): ImplementsEnd[] {
    const pairs: [string, string, 'mark' | 'cell'][] =
      selection?.type === 'tool'
        ? index.implementsOf(selection.id).map((cluster) => [selection.id, cluster.id, 'cell'])
        : selection?.type === 'cluster'
          ? index.implementedBy(selection.id).map((tool) => [tool.id, selection.id, 'mark'])
          : [];
    const ends: ImplementsEnd[] = [];
    for (const [toolId, clusterId, far] of pairs) {
      const mark = markOf.get(toolId);
      const cell = cellOf.get(clusterId);
      if (mark && cell) ends.push({ mark, cell, far });
    }
    return ends;
  }

  return {
    endsOf,
    reachOf(selection) {
      const ends = endsOf(selection);
      if (ends.length === 0) return null;
      const reach: Box = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity },
      };
      for (const { mark, cell, far } of ends) {
        const [x, y, z, width, depth] =
          far === 'cell' ? [cell.x, cell.y, cell.z, cell.width, cell.depth] : [mark.x, mark.y, mark.z, mark.size, mark.size];
        reach.min = {
          x: Math.min(reach.min.x, x - width / 2),
          y: Math.min(reach.min.y, y),
          z: Math.min(reach.min.z, z - depth / 2),
        };
        reach.max = {
          x: Math.max(reach.max.x, x + width / 2),
          y: Math.max(reach.max.y, y),
          z: Math.max(reach.max.z, z + depth / 2),
        };
      }
      return reach;
    },
    show(selection) {
      const cell = selection?.type === 'cluster' ? cellOf.get(selection.id) : undefined;
      cellOutline.visible = cell !== undefined;
      if (cell) {
        cellOutline.position.set(cell.x, cell.y + MARK_LIFT, cell.z);
        cellOutline.scale.set(cell.width / MARK_SHARE_OF_QUAD, 1, cell.depth / MARK_SHARE_OF_QUAD);
      }

      const corners: number[] = [];
      const outlined = new Set<string>();
      for (const { mark, cell: end, far } of endsOf(selection)) {
        // The line meets the cell at the middle of an edge, not on one of its marks:
        // the back edge for a tool on a higher plate, and the front edge for any other.
        const edgeZ = end.z + (mark.y > end.y ? -1 : 1) * (end.depth / 2);
        corners.push(mark.x, mark.y + MARK_LIFT, mark.z, end.x, end.y + MARK_LIFT, edgeZ);
        // The far end is outlined once, however many lines end on it.
        const farId = far === 'cell' ? end.cluster : mark.tool;
        if (outlined.has(farId)) continue;
        outlined.add(farId);
        if (far === 'cell') corners.push(...sides(end.x, end.y + MARK_LIFT, end.z, end.width, end.depth));
        else {
          const side = mark.size + 2 * FAR_MARK_MARGIN;
          corners.push(...sides(mark.x, mark.y + MARK_LIFT, mark.z, side, side));
        }
      }
      traces.geometry.dispose();
      traces.geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(corners, 3));
      traces.visible = corners.length > 0;
    },
    setPixelRatio(ratio) {
      outlineMaterial.uniforms.uPixelRatio!.value = ratio;
    },
  };
}
