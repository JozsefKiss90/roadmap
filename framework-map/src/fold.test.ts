import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readGraph } from './data';
import { createFold, folds, rowsInStack } from './fold';
import { STACK_METRICS, WRAPPED_STACK, layoutStack } from './layout';
import type { Vocabulary } from './validate';

const inToolDiscovery = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../tool-discovery/${name}`, import.meta.url), 'utf8'));
const index = readGraph(inToolDiscovery('tool-framework.graph.json'), inToolDiscovery('vocabulary.json') as Vocabulary);
const whole = layoutStack(index);
const wrapped = layoutStack(index, STACK_METRICS, WRAPPED_STACK);
const rowStep = STACK_METRICS.rows * STACK_METRICS.pitch + 2 * STACK_METRICS.cellPadding + WRAPPED_STACK.rowGap;

describe('the rows of the layout', () => {
  it('hold every cluster of their tier once, in the order of its cells', () => {
    for (const layout of [whole, wrapped]) {
      for (const plate of layout.plates) {
        const inRows = layout.rows.filter((row) => row.tier === plate.tier).flatMap((row) => row.clusters);
        expect(inRows).toEqual(layout.cells.filter((cell) => cell.tier === plate.tier).map((cell) => cell.cluster));
      }
    }
  });

  it('are one to a plate, with no lift, where the layout is not wrapped', () => {
    expect(whole.rows.map((row) => row.tier)).toEqual(whole.plates.map((plate) => plate.tier));
    expect(folds(whole)).toBe(false);
    expect(rowsInStack(whole)).toEqual(whole.plates);
  });

  it('lie over their own cells on the plate, each as long as the plate', () => {
    for (const row of wrapped.rows) {
      const plate = wrapped.plates.find((each) => each.tier === row.tier)!;
      expect([row.x, row.y, row.width]).toEqual([plate.x, plate.y, plate.width]);
      for (const cell of wrapped.cells.filter((each) => row.clusters.includes(each.cluster))) {
        expect([cell.y, cell.z]).toEqual([row.y, row.z]);
      }
    }
  });
});

describe('the rows as they stand in the stack', () => {
  const inStack = rowsInStack(wrapped);

  it('stand in a column for each tier: one over the other, a rise apart, the first on top', () => {
    expect(folds(wrapped)).toBe(true);
    for (const plate of wrapped.plates) {
      const column = inStack.filter((row) => row.tier === plate.tier);
      column.forEach((row, at) => {
        expect([row.x, row.width, row.depth]).toEqual([column[0]!.x, column[0]!.width, column[0]!.depth]);
        expect(row.z).toBeCloseTo(0, 9);
        expect(row.y).toBeCloseTo(plate.y + (column.length - 1 - at) * WRAPPED_STACK.rowRise, 9);
      });
    }
  });

  it('leave each tier the height of a plate under the tier above', () => {
    const upward = [...inStack].sort((a, b) => a.y - b.y);
    upward.slice(1).forEach((row, at) => {
      const under = upward[at]!;
      const apart = row.tier === under.tier ? WRAPPED_STACK.rowRise : STACK_METRICS.plateSpacing;
      expect(row.y - under.y).toBeCloseTo(apart, 9);
    });
  });
});

describe('the fold', () => {
  it('starts unfolded, as the layout lies, and leaves the layout as it was', () => {
    const before = structuredClone(wrapped);
    const fold = createFold(wrapped);
    expect(fold.at).toBe(0);
    expect(fold.stack).toEqual(wrapped);
    fold.set(1);
    fold.set(0.3);
    expect(wrapped).toEqual(before);
    fold.set(0);
    expect(fold.stack).toEqual(wrapped);
  });

  it('folded, stands every row in the stack, with its cells and its marks on it', () => {
    const fold = createFold(wrapped);
    const { stack } = fold;
    const [cell, mark] = [stack.cells[0]!, stack.marks[0]!];
    fold.set(1);
    // The same objects are moved, so whatever holds one reads where it is now.
    expect([stack.cells[0], stack.marks[0]]).toEqual([cell, mark]);
    expect(stack.rows.map(({ tier, x, y, z, width, depth }) => ({ tier, x, y, z, width, depth }))).toEqual(rowsInStack(wrapped));
    stack.rows.forEach((row, at) => {
      const flat = wrapped.rows[at]!;
      for (const [moved, were] of [
        [stack.cells, wrapped.cells],
        [stack.marks, wrapped.marks],
      ] as const) {
        moved.forEach((each, i) => {
          if (!row.clusters.includes(each.cluster)) return;
          expect(each.y).toBe(row.y);
          expect(each.x).toBe(were[i]!.x);
          expect(each.z - row.z).toBeCloseTo(were[i]!.z - flat.z, 9);
        });
      }
    });
  });

  it('folded, has each tier’s plate where its first row stands', () => {
    const fold = createFold(wrapped);
    fold.set(1);
    for (const plate of fold.stack.plates) {
      const first = fold.stack.rows.find((row) => row.tier === plate.tier)!;
      expect([plate.x, plate.y, plate.z, plate.width, plate.depth]).toEqual([first.x, first.y, first.z, first.width, first.depth]);
    }
  });

  it('half folded, has every row half its way', () => {
    const fold = createFold(wrapped);
    fold.set(0.5);
    fold.stack.rows.forEach((row, at) => {
      const flat = wrapped.rows[at]!;
      expect(row.y).toBeCloseTo(flat.y + flat.lift.y / 2, 9);
      expect(row.z).toBeCloseTo(flat.z + flat.lift.z / 2, 9);
    });
    expect(Math.max(...wrapped.rows.map((row) => row.lift.z))).toBeCloseTo(rowStep, 9);
  });

  it('moves nothing in a layout that is not wrapped', () => {
    const fold = createFold(whole);
    fold.set(1);
    expect(fold.at).toBe(1);
    expect(fold.stack).toEqual(whole);
  });
});
