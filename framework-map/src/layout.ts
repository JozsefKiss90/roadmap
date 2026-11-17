/**
 * layout: the pure position function. Takes the graph and returns a position
 * and size for every plate, cell and mark (ADR 0002).
 *
 * The build runs it once and inlines the result (see vite.config.ts), so the
 * page never computes a position. It reads the graph and writes nothing to it.
 *
 * Axes: x runs along a plate, y is height, z is a plate's depth. One unit is
 * the pitch of the mark grid.
 *
 * Every cell uses the same mark grid, so a cell's area follows its tool count
 * and a plate's length follows its tier's. The plates share their left edge
 * and their depth. A cell is a block of columns, `rows` marks deep, filled a
 * column at a time, so only its last column can be part empty.
 */
import type { GraphIndex } from './data';
import { DECISION_STEPS, decisionStep } from './display.ts';
import type { ToolNode } from './graph';

export interface StackMetrics {
  /** Marks in one column of a cell: the depth of every cell, in marks. */
  rows: number;
  /** The distance between the centres of two neighbouring marks. */
  pitch: number;
  /** The side of a mark. */
  markSize: number;
  /** From a cell's outline to its grid of mark slots. */
  cellPadding: number;
  /** Between two cells on a plate. */
  cellGap: number;
  /** From a plate's edge to its cells. */
  platePadding: number;
  /** The height from one plate to the next. */
  plateSpacing: number;
}

export const STACK_METRICS: StackMetrics = {
  rows: 4,
  pitch: 1,
  markSize: 0.72,
  cellPadding: 0.3,
  cellGap: 0.7,
  platePadding: 0.55,
  plateSpacing: 6.5,
};

/** A plate: the rectangle of one tier. `x`, `z` are its centre, `y` its top face. */
export interface PlateLayout {
  tier: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
}

/** A cell: the rectangle of one cluster, lying on its plate. */
export interface CellLayout {
  cluster: string;
  tier: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  /** How many marks the cell's grid has room for. */
  slots: number;
}

/** A mark: the square of one tool, lying in its cell. */
export interface MarkLayout {
  tool: string;
  cluster: string;
  tier: string;
  x: number;
  y: number;
  z: number;
  size: number;
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface StackLayout {
  plates: PlateLayout[];
  cells: CellLayout[];
  marks: MarkLayout[];
  /** The box that holds every plate. Its centre is the origin in x and z. */
  bounds: { min: Point; max: Point };
}

const stepRank = (tool: ToolNode): number => DECISION_STEPS.indexOf(decisionStep(tool.decision_class));

/**
 * A cell's tools in the order its grid is filled: by decision step, from
 * committed to guarded, then by name. The order does not depend on the order
 * of the graph's node list.
 */
export function inGridOrder(tools: readonly ToolNode[]): ToolNode[] {
  const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return [...tools].sort(
    (a, b) =>
      stepRank(a) - stepRank(b) ||
      compareText(a.label.toLowerCase(), b.label.toLowerCase()) ||
      compareText(a.id, b.id),
  );
}

export function layoutStack(index: GraphIndex, metrics: StackMetrics = STACK_METRICS): StackLayout {
  const { rows, pitch, markSize, cellPadding, cellGap, platePadding, plateSpacing } = metrics;
  const cellDepth = rows * pitch + 2 * cellPadding;
  const plateDepth = cellDepth + 2 * platePadding;

  const plates: PlateLayout[] = [];
  const cells: CellLayout[] = [];
  const marks: MarkLayout[] = [];

  // First pass, with every plate's left edge at x = 0.
  for (const tier of index.tiers) {
    const y = tier.layout.z * plateSpacing;
    let cursor = platePadding;
    for (const cluster of index.clustersOf(tier.id)) {
      const tools = inGridOrder(index.toolsOf(cluster.id));
      const columns = Math.max(1, Math.ceil(tools.length / rows));
      const width = columns * pitch + 2 * cellPadding;
      cells.push({
        cluster: cluster.id,
        tier: tier.id,
        x: cursor + width / 2,
        y,
        z: 0,
        width,
        depth: cellDepth,
        slots: columns * rows,
      });
      tools.forEach((tool, i) => {
        const column = Math.floor(i / rows);
        const row = i % rows;
        marks.push({
          tool: tool.id,
          cluster: cluster.id,
          tier: tier.id,
          x: cursor + cellPadding + (column + 0.5) * pitch,
          y,
          z: (row + 0.5 - rows / 2) * pitch,
          size: markSize,
        });
      });
      cursor += width + cellGap;
    }
    const width = Math.max(cursor - cellGap, platePadding) + platePadding;
    plates.push({ tier: tier.id, x: width / 2, y, z: 0, width, depth: plateDepth });
  }

  // Second pass: centre the widest plate on the origin.
  const widest = Math.max(0, ...plates.map((plate) => plate.width));
  for (const placed of [...plates, ...cells, ...marks]) placed.x -= widest / 2;

  const heights = plates.length > 0 ? plates.map((plate) => plate.y) : [0];
  return {
    plates,
    cells,
    marks,
    bounds: {
      min: { x: -widest / 2, y: Math.min(...heights), z: -plateDepth / 2 },
      max: { x: widest / 2, y: Math.max(...heights), z: plateDepth / 2 },
    },
  };
}
