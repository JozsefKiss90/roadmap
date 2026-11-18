/**
 * label-layout: where a tier's label, the names of a tier's clusters and the
 * names of a cluster's tools stand, in pixels. Pure arithmetic; src/labels.ts
 * draws the result and src/scene.ts leaves room for it.
 *
 * A tier's label stands in the scene at the left end of its plate, upright,
 * and runs along the plate: its count over its name.
 *
 * Cluster names stand above their plate as a staircase. Each starts at its
 * cell's left edge, one row above the name of the cell to its right, so a name
 * can run on past its cell and over the names to its right without touching one.
 *
 * Tool names stand above their cell as a list in columns, in the order the
 * cell's grid is filled.
 */

/** A tier name's line, as a multiple of its size. */
export const TIER_NAME_LINE_HEIGHT = 1.2;

/**
 * A tier's label stands upright in the scene and runs along its plate, so the camera sees it at
 * an angle: its turn narrows the label and its tilt makes it shorter. The label is stretched by
 * these two numbers, along the plate and upward, so that at rest it is drawn at its own size.
 * As the partner turns or tilts the camera, the label then changes as its plate does.
 */
export function standingStretch(restTiltDegrees: number, restTurnDegrees: number): { along: number; up: number } {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  return { along: 1 / Math.cos(radians(restTurnDegrees)), up: 1 / Math.sin(radians(restTiltDegrees)) };
}

/** The sizes a tier's label is made of: all of them are in src/constants.ts. */
export interface TierLabelSizes {
  labelGapPx: number;
  labelColumnPx: number;
  labelCountPx: number;
  labelRisePx: number;
  countGapPx: number;
  tagPx: number;
  tierNamePx: number;
  tierLabelGapPx: number;
}

/**
 * What a tier's label covers beside its plate, in pixels of the label: from the end of the plate
 * to the label's near and far ends, and how far it stands above and below the plate's top face.
 * The far end is the room kept for the longest name, or for the longest count where the names
 * are left out. A count on its own stands level with the plate's top face. src/scene.ts leaves
 * the room for the label.
 * @param names Whether the label has its name under its count.
 */
export function tierLabelBlock(
  sizes: TierLabelSizes,
  names = true,
): { near: number; far: number; above: number; below: number } {
  if (!names) {
    return { near: sizes.labelGapPx, far: sizes.labelGapPx + sizes.labelCountPx, above: sizes.tagPx / 2, below: sizes.tagPx / 2 };
  }
  return {
    near: sizes.labelGapPx,
    far: sizes.labelGapPx + sizes.labelColumnPx,
    above: sizes.labelRisePx + sizes.countGapPx + sizes.tagPx,
    below: sizes.tierNamePx * TIER_NAME_LINE_HEIGHT - sizes.labelRisePx,
  };
}

/**
 * Whether plates that stand `apartPx` from one to the next on screen leave each tier's label
 * the room for its name: the label's height, and a clear space to the next label.
 */
export function tierNamesFit(apartPx: number, sizes: TierLabelSizes): boolean {
  const block = tierLabelBlock(sizes);
  return apartPx >= block.above + block.below + sizes.tierLabelGapPx;
}

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

/**
 * The widest a name may be for a list to fit its room: Infinity where the list
 * fits as it is. `names` are the widths of the names, and `extras` what each
 * row holds beside its name: its icon, its badge and the gaps between them.
 * No name is cut below `leastPx`, so a list may still be wider than its room.
 */
export function nameCap(
  names: readonly number[],
  extras: readonly number[],
  mostRows: number,
  columnGapPx: number,
  roomPx: number,
  leastPx = 0,
): number {
  const widthAt = (cap: number): number =>
    listLayout(
      names.map((name, i) => Math.min(name, cap) + (extras[i] ?? 0)),
      mostRows,
      0,
      columnGapPx,
    ).width;
  if (widthAt(Infinity) <= roomPx) return Infinity;
  // The list's width never falls as the cap rises, so the cap is found by halving.
  let fits = leastPx;
  let tooWide = Math.max(leastPx, ...names);
  if (widthAt(fits) > roomPx) return leastPx;
  while (tooWide - fits > 0.5) {
    const middle = (fits + tooWide) / 2;
    if (widthAt(middle) <= roomPx) fits = middle;
    else tooWide = middle;
  }
  return fits;
}
