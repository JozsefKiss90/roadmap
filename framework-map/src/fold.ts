/**
 * fold: the stack as it stands now, between its two forms.
 *
 * The layout gives every plate, cell and mark where it lies with its tier
 * open, and every row of a plate its `lift`: the way to where the row stands
 * in the stack (see src/layout.ts). Folded, at 1, each row stands in the
 * stack, a plate of its own. Unfolded, at 0, the rows of a tier lie on its one
 * plate. In a layout that is not wrapped no row has a lift, and the two are
 * the same.
 *
 * The fold keeps a copy of the layout and moves what is in the copy. The
 * layout itself is never changed. Pure arithmetic, so it has no three.js in it.
 */
import type { PlateLayout, RowLayout, StackLayout } from './layout';

export interface Fold {
  /**
   * The stack as it stands now. Its objects stay the same ones and are moved, so whatever holds
   * one reads where it is now. A tier's plate is its first row's plate while the stack is folded.
   */
  readonly stack: StackLayout;
  /** How far the stack is folded, from 0 to 1. */
  readonly at: number;
  set(fold: number): void;
}

/** The plates of the stack with every row a plate of its own, where it stands in the stack. */
export function rowsInStack(layout: StackLayout): PlateLayout[] {
  return layout.rows.map(({ tier, x, y, z, width, depth, lift }) => ({ tier, x, y: y + lift.y, z: z + lift.z, width, depth }));
}

/** Whether any plate of the layout has more rows than one, so that folding moves something. */
export const folds = (layout: StackLayout): boolean => layout.rows.some((row) => row.lift.y !== 0 || row.lift.z !== 0);

export function createFold(layout: StackLayout): Fold {
  const stack: StackLayout = {
    plates: layout.plates.map((plate) => ({ ...plate })),
    rows: layout.rows.map((row) => ({ ...row })),
    cells: layout.cells.map((cell) => ({ ...cell })),
    marks: layout.marks.map((mark) => ({ ...mark })),
    bounds: layout.bounds,
  };
  const rowOfCluster = new Map<string, RowLayout>(layout.rows.flatMap((row) => row.clusters.map((cluster) => [cluster, row])));
  const firstRowOf = new Map<string, RowLayout>();
  for (const row of layout.rows) if (!firstRowOf.has(row.tier)) firstRowOf.set(row.tier, row);
  const between = (from: number, to: number, fold: number): number => from + (to - from) * fold;
  const moves = folds(layout);
  let at = 0;

  return {
    stack,
    get at() {
      return at;
    },
    set(fold) {
      at = fold;
      if (!moves) return;
      layout.rows.forEach((flat, i) => {
        const row = stack.rows[i]!;
        row.y = flat.y + fold * flat.lift.y;
        row.z = flat.z + fold * flat.lift.z;
      });
      for (const [flats, moved] of [
        [layout.cells, stack.cells],
        [layout.marks, stack.marks],
      ] as const) {
        flats.forEach((flat, i) => {
          const lift = rowOfCluster.get(flat.cluster)?.lift;
          if (!lift) return;
          moved[i]!.y = flat.y + fold * lift.y;
          moved[i]!.z = flat.z + fold * lift.z;
        });
      }
      layout.plates.forEach((flat, i) => {
        const first = firstRowOf.get(flat.tier);
        if (!first) return;
        const plate = stack.plates[i]!;
        plate.y = between(flat.y, first.y + first.lift.y, fold);
        plate.z = between(flat.z, first.z + first.lift.z, fold);
        plate.depth = between(flat.depth, first.depth, fold);
      });
    },
  };
}
