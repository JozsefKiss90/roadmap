/**
 * label-layout: where the names of a tier's clusters and of a cluster's tools
 * stand, in pixels. Pure arithmetic; src/labels.ts draws the result and
 * src/scene.ts leaves room for it.
 *
 * Cluster names stand above their plate as a staircase. Each starts at its
 * cell's left edge, one row above the name of the cell to its right, so a name
 * can run on past its cell and over the names to its right without touching one.
 *
 * Tool names stand above their cell as a list in columns, in the order the
 * cell's grid is filled.
 */

/** How far above its cell the foot of a cluster name stands. `position` counts cells from the left. */
export function staircaseRise(position: number, count: number, rowPx: number, gapPx: number): number {
  return gapPx + (count - 1 - position) * rowPx;
}

/** The height the names of `count` cells take above their plate. */
export function staircaseHeight(count: number, rowPx: number, gapPx: number): number {
  return count > 0 ? gapPx + count * rowPx : 0;
}

export interface ListShape {
  columns: number;
  rows: number;
}

/** The fewest columns that keep a list of `count` names within `mostRows` rows, and the rows they then need. */
export function listShape(count: number, mostRows: number): ListShape {
  if (count <= 0) return { columns: 0, rows: 0 };
  const columns = Math.ceil(count / Math.max(1, mostRows));
  return { columns, rows: Math.ceil(count / columns) };
}

export interface ListLayout {
  /** The left edge and the top of each name's row, from the list's top left corner. */
  slots: { x: number; y: number }[];
  /** The width of each name's column: the widest name in it. */
  columnWidths: number[];
  width: number;
  height: number;
}

/**
 * Sets names of the given widths in columns. The list fills a column from top
 * to bottom before it starts the next, and each column is as wide as its
 * widest name.
 */
export function listLayout(
  widths: readonly number[],
  mostRows: number,
  rowPx: number,
  columnGapPx: number,
): ListLayout {
  const { columns, rows } = listShape(widths.length, mostRows);
  const slots: { x: number; y: number }[] = [];
  const columnWidths: number[] = [];
  let left = 0;
  for (let column = 0; column < columns; column += 1) {
    const inColumn = widths.slice(column * rows, (column + 1) * rows);
    const widest = Math.max(...inColumn);
    inColumn.forEach((_width, row) => {
      slots.push({ x: left, y: row * rowPx });
      columnWidths.push(widest);
    });
    left += widest + columnGapPx;
  }
  return { slots, columnWidths, width: Math.max(0, left - columnGapPx), height: rows * rowPx };
}
