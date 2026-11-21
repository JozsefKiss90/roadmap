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
 *
 * A phone's window is too narrow for the long plates. For it the build makes a
 * second layout, the wrapped one (`WRAPPED_STACK`): a tier whose cells are
 * longer than a row may be stands them in two rows or more, on one plate that
 * is as much deeper. The near edges of the plates stay in line, so a deeper
 * plate runs further back.
 *
 * That is how a plate lies when its tier is open. In the stack each row is a
 * plate of its own, and the rows of a tier stand in a column: the first on
 * top, each next one straight under it, the last where the plate lies. Each
 * row's `lift` is the way from the one place to the other, and the plates
 * above stand as much higher. src/fold.ts moves the rows between the two.
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

export interface WrapMetrics {
  /** The longest a plate may be. A tier with more cells than that stands them in rows. */
  mostPlateWidth: number;
  /** Between two rows of cells on a plate. */
  rowGap: number;
  /** In the stack, the height from one row of a plate to the row over it. The plates above stand as much higher. */
  rowRise: number;
}

/**
 * The wrapped layout, for a phone's window. The length is what an upright phone shows of a plate
 * with the stack as tall as the window; the rise is the least that shows a row clear of the row
 * over it, as the camera sees the stack at rest under the bar.
 */
export const WRAPPED_STACK: WrapMetrics = {
  mostPlateWidth: 34,
  rowGap: 0.7,
  rowRise: 3.25,
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

/**
 * A row of a plate's cells. `x`, `z` are the centre and `y` the top face of the plate it is in the
 * stack, given where it lies with its tier open: on the tier's plate, over its own cells.
 */
export interface RowLayout {
  tier: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  /** From there to where the row stands in the stack: up, and forward to over the plate's last row. */
  lift: { y: number; z: number };
  /** The clusters whose cells stand in the row. */
  clusters: string[];
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
  /** Every plate's rows, a plate's first row first. A plate that is not wrapped has one, with no lift. */
  rows: RowLayout[];
  cells: CellLayout[];
  marks: MarkLayout[];
  /** The box that holds every plate. Its centre is the origin in x, and in z where no plate is wrapped. */
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

/**
 * Sets cells of the given widths in rows no longer than `most`, in their order. It takes the fewest
 * rows that hold them, and then makes the longest row as short as that number of rows allows, so
 * two rows are near one length. A cell longer than `most` has a row to itself.
 * @returns For each row, how many cells it holds.
 */
export function rowsOf(widths: readonly number[], gap: number, most: number): number[] {
  const fill = (limit: number): number[] => {
    const rows: number[] = [];
    let length = 0;
    for (const width of widths) {
      const longer = length + gap + width;
      if (rows.length > 0 && longer <= limit) {
        rows[rows.length - 1]! += 1;
        length = longer;
      } else {
        rows.push(1);
        length = width;
      }
    }
    return rows;
  };
  const fewest = fill(most);
  // The length of every run of neighbouring cells: the longest row is one of them.
  const runs: number[] = [];
  for (let from = 0; from < widths.length; from += 1) {
    let length = 0;
    for (let to = from; to < widths.length; to += 1) {
      length += (to > from ? gap : 0) + widths[to]!;
      if (length <= most) runs.push(length);
    }
  }
  for (const limit of runs.sort((a, b) => a - b)) {
    const rows = fill(limit);
    if (rows.length <= fewest.length) return rows;
  }
  return fewest;
}

/**
 * @param wrap Given, the layout is the wrapped one: no plate is longer than `wrap.mostPlateWidth`.
 */
export function layoutStack(index: GraphIndex, metrics: StackMetrics = STACK_METRICS, wrap?: WrapMetrics): StackLayout {
  const { rows, pitch, markSize, cellPadding, cellGap, platePadding, plateSpacing } = metrics;
  const cellDepth = rows * pitch + 2 * cellPadding;
  const plateDepth = cellDepth + 2 * platePadding;
  const rowStep = cellDepth + (wrap?.rowGap ?? 0);

  const plates: PlateLayout[] = [];
  const stackRows: RowLayout[] = [];
  const cells: CellLayout[] = [];
  const marks: MarkLayout[] = [];
  /** How many rows each plate has. */
  const rowCount = new Map<string, number>();

  // First pass, with every plate's left edge at x = 0 and its last row of cells at z = 0.
  for (const tier of index.tiers) {
    const clusters = index.clustersOf(tier.id).map((cluster) => {
      const tools = inGridOrder(index.toolsOf(cluster.id));
      const columns = Math.max(1, Math.ceil(tools.length / rows));
      return { cluster, tools, columns, width: columns * pitch + 2 * cellPadding };
    });
    const widths = clusters.map(({ width }) => width);
    const inRows = wrap ? rowsOf(widths, cellGap, wrap.mostPlateWidth - 2 * platePadding) : [clusters.length];
    // A tier with no cluster still has its plate, and the plate its one row.
    if (inRows.length === 0) inRows.push(0);
    const y = tier.layout.z * plateSpacing;
    let longest = 0;
    let next = 0;
    inRows.forEach((count, row) => {
      // The last row is where a plate of one row has its cells, and the rows before it stand behind it.
      const z = (row + 1 - inRows.length) * rowStep;
      let cursor = platePadding;
      for (const { cluster, tools, columns, width } of clusters.slice(next, next + count)) {
        cells.push({
          cluster: cluster.id,
          tier: tier.id,
          x: cursor + width / 2,
          y,
          z,
          width,
          depth: cellDepth,
          slots: columns * rows,
        });
        tools.forEach((tool, i) => {
          const column = Math.floor(i / rows);
          const markRow = i % rows;
          marks.push({
            tool: tool.id,
            cluster: cluster.id,
            tier: tier.id,
            x: cursor + cellPadding + (column + 0.5) * pitch,
            y,
            z: z + (markRow + 0.5 - rows / 2) * pitch,
            size: markSize,
          });
        });
        cursor += width + cellGap;
      }
      // In the stack the rows stand in a column over the last one, a rise apart.
      const over = inRows.length - 1 - row;
      stackRows.push({
        tier: tier.id,
        x: 0,
        y,
        z,
        width: 0,
        depth: plateDepth,
        lift: { y: over * (wrap?.rowRise ?? 0), z: over * rowStep },
        clusters: clusters.slice(next, next + count).map(({ cluster }) => cluster.id),
      });
      next += count;
      longest = Math.max(longest, cursor - cellGap);
    });
    const width = Math.max(longest, platePadding) + platePadding;
    // Every row is as long as its plate, so the rows of a tier stand in one column.
    for (const row of stackRows) if (row.tier === tier.id) Object.assign(row, { x: width / 2, width });
    const rowsHere = Math.max(1, inRows.length);
    rowCount.set(tier.id, rowsHere);
    // The plate's near edge is where a plate of one row has it.
    const deeper = (rowsHere - 1) * rowStep;
    plates.push({ tier: tier.id, x: width / 2, y, z: 0 - deeper / 2, width, depth: plateDepth + deeper });
  }

  // Second pass: centre the widest plate on the origin.
  const widest = Math.max(0, ...plates.map((plate) => plate.width));
  for (const placed of [...plates, ...stackRows, ...cells, ...marks]) placed.x -= widest / 2;

  // Third pass: in the stack the rows of a plate stand one over the other, so every plate above
  // it stands higher by the rises its rows take.
  if (wrap) {
    const rise = new Map<string, number>();
    let risen = 0;
    for (const plate of [...plates].sort((a, b) => a.y - b.y)) {
      rise.set(plate.tier, risen);
      risen += ((rowCount.get(plate.tier) ?? 1) - 1) * wrap.rowRise;
    }
    for (const placed of [...plates, ...stackRows, ...cells, ...marks]) placed.y += rise.get(placed.tier) ?? 0;
  }

  const heights = plates.length > 0 ? plates.map((plate) => plate.y) : [0];
  return {
    plates,
    rows: stackRows,
    cells,
    marks,
    bounds: {
      min: { x: -widest / 2, y: Math.min(...heights), z: Math.min(-plateDepth / 2, ...plates.map((plate) => plate.z - plate.depth / 2)) },
      max: { x: widest / 2, y: Math.max(...heights), z: plateDepth / 2 },
    },
  };
}
