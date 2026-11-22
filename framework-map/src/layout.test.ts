import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readGraph } from './data';
import type { GraphIndex } from './data';
import { STACK_METRICS, WRAPPED_STACK, layoutStack, rowsOf } from './layout';
import type { CellLayout, MarkLayout, StackLayout } from './layout';
import type { Vocabulary } from './validate';

const inToolDiscovery = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../tool-discovery/${name}`, import.meta.url), 'utf8'));

const realVocabulary = inToolDiscovery('vocabulary.json') as Vocabulary;
const realIndex = (): GraphIndex => readGraph(inToolDiscovery('tool-framework.graph.json'), realVocabulary);

const vocabulary: Vocabulary = {
  decision_class: ['Core v1', 'Build', 'Optional / benchmark', 'Delay / guarded'],
  hosting: ['Hub'],
  stream: ['OS'],
  kind: { Skill: ['Skill'] },
  gate: { None: ['None'] },
};

/**
 * A graph from a plan: one list of cluster sizes per tier, the bottom tier
 * first. Tool decision classes cycle through the vocabulary.
 */
function graphOf(plan: number[][]) {
  const nodes: Record<string, unknown>[] = [];
  let toolCount = 0;
  plan.forEach((clusterSizes, tierNumber) => {
    const tier = `T${tierNumber}`;
    nodes.push({ id: tier, type: 'tier', label: `Tier ${tierNumber}`, layout: { z: tierNumber } });
    clusterSizes.forEach((size, sector) => {
      const cluster = `${tierNumber}${String.fromCharCode(65 + sector)}`;
      nodes.push({
        id: cluster,
        type: 'cluster',
        label: `Cluster ${cluster}`,
        tier,
        hosting: 'Hub',
        stream: 'OS',
        gate: 'None',
        tools: size,
        layout: { z: tierNumber, sector, sectors: clusterSizes.length },
      });
      for (let i = 0; i < size; i += 1) {
        nodes.push({
          id: `tool:${cluster}-${i}`,
          type: 'tool',
          label: `${cluster} tool ${i}`,
          tier,
          cluster,
          kind: 'Skill',
          decision_class: vocabulary.decision_class[toolCount % vocabulary.decision_class.length],
          hosting: 'Hub',
          stream: 'OS',
          gate: 'None',
        });
        toolCount += 1;
      }
    });
  });
  nodes.push({ id: 'N01', type: 'need', label: 'A need', phase: 'P1' });
  return {
    meta: { counts: { tools: toolCount, clusters: plan.flat().length, tiers: plan.length, needs: 1, edges: 1 } },
    nodes,
    edges: [{ source: 'tool:0A-0', target: 'N01', type: 'serves' }],
  };
}

const PLAN = [
  [20, 9, 6],
  [57, 4, 13, 1],
  [5, 7],
];

const layoutOf = (plan: number[][]): StackLayout => layoutStack(readGraph(graphOf(plan), vocabulary));

const TOLERANCE = 1e-9;

interface Footprint {
  x: number;
  z: number;
  width: number;
  depth: number;
}

const markFootprint = (mark: MarkLayout): Footprint => ({ x: mark.x, z: mark.z, width: mark.size, depth: mark.size });

/** True if `inner` lies wholly inside `outer`, seen from above. */
const liesInside = (inner: Footprint, outer: Footprint): boolean =>
  Math.abs(inner.x - outer.x) + inner.width / 2 <= outer.width / 2 + TOLERANCE &&
  Math.abs(inner.z - outer.z) + inner.depth / 2 <= outer.depth / 2 + TOLERANCE;

/** True if two footprints share any area, seen from above. */
const overlap = (a: Footprint, b: Footprint): boolean =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 - TOLERANCE &&
  Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 - TOLERANCE;

function overlappingPairs<T>(items: readonly T[], footprint: (item: T) => Footprint): [T, T][] {
  const pairs: [T, T][] = [];
  items.forEach((a, i) => {
    for (const b of items.slice(i + 1)) if (overlap(footprint(a), footprint(b))) pairs.push([a, b]);
  });
  return pairs;
}

const byId = <T>(items: readonly T[], id: (item: T) => string): Map<string, T> =>
  new Map(items.map((item) => [id(item), item]));

function expectSoundLayout(layout: StackLayout): void {
  const plates = byId(layout.plates, (plate) => plate.tier);
  const cells = byId(layout.cells, (cell) => cell.cluster);

  for (const cell of layout.cells) {
    const plate = plates.get(cell.tier);
    expect(plate, `plate of cell ${cell.cluster}`).toBeDefined();
    expect(liesInside(cell, plate!), `cell ${cell.cluster} inside its plate`).toBe(true);
    expect(cell.y).toBe(plate!.y);
  }
  for (const mark of layout.marks) {
    const cell = cells.get(mark.cluster);
    expect(cell, `cell of mark ${mark.tool}`).toBeDefined();
    expect(liesInside(markFootprint(mark), cell!), `mark ${mark.tool} inside its cell`).toBe(true);
    expect(mark.y).toBe(cell!.y);
  }
  for (const plate of layout.plates) {
    const onPlate = layout.marks.filter((mark) => mark.tier === plate.tier);
    expect(overlappingPairs(onPlate, markFootprint), `overlapping marks on ${plate.tier}`).toEqual([]);
    const cellsOnPlate = layout.cells.filter((cell) => cell.tier === plate.tier);
    expect(overlappingPairs(cellsOnPlate, (cell) => cell), `overlapping cells on ${plate.tier}`).toEqual([]);
  }
}

const area = (cell: CellLayout): number => cell.width * cell.depth;

describe('layoutStack', () => {
  it('gives every plate, cell and mark a place', () => {
    const layout = layoutOf(PLAN);
    expect(layout.plates.map((plate) => plate.tier).sort()).toEqual(['T0', 'T1', 'T2']);
    expect(layout.cells).toHaveLength(9);
    expect(layout.marks).toHaveLength(122);
    expect(new Set(layout.marks.map((mark) => mark.tool)).size).toBe(122);
  });

  it('stacks the plates by tier, evenly spaced, the highest tier on top', () => {
    const plates = byId(layoutOf(PLAN).plates, (plate) => plate.tier);
    const [bottom, middle, top] = [plates.get('T0')!, plates.get('T1')!, plates.get('T2')!];
    expect(middle.y).toBeGreaterThan(bottom.y);
    expect(top.y - middle.y).toBeCloseTo(middle.y - bottom.y);
  });

  it('keeps every mark inside its cell and every cell inside its plate, with no overlap', () => {
    expectSoundLayout(layoutOf(PLAN));
  });

  it('never makes a cell with more tools smaller than one with fewer', () => {
    const index = readGraph(graphOf(PLAN), vocabulary);
    const cells = layoutStack(index).cells.map((cell) => ({ tools: index.toolsOf(cell.cluster).length, cell }));
    for (const a of cells) {
      for (const b of cells) {
        if (a.tools > b.tools) {
          expect(area(a.cell), `${a.cell.cluster} against ${b.cell.cluster}`).toBeGreaterThanOrEqual(area(b.cell));
        }
      }
    }
  });

  it('gives a larger cell to the largest cluster than to the smallest', () => {
    const cells = byId(layoutOf(PLAN).cells, (cell) => cell.cluster);
    expect(area(cells.get('1A')!)).toBeGreaterThan(area(cells.get('1B')!));
  });

  it("sets a plate's cells along it in the order the graph gives its clusters", () => {
    const cells = layoutOf(PLAN).cells.filter((cell) => cell.tier === 'T1');
    const alongThePlate = [...cells].sort((a, b) => a.x - b.x).map((cell) => cell.cluster);
    expect(alongThePlate).toEqual(['1A', '1B', '1C', '1D']);
  });

  it("fills a cell from its committed tools to its guarded ones", () => {
    // 0B has 9 tools; the plan gives it the decision classes in a cycle.
    const index = readGraph(graphOf(PLAN), vocabulary);
    const marks = layoutStack(index).marks.filter((mark) => mark.cluster === '0B');
    const inFillOrder = [...marks].sort((a, b) => a.x - b.x || a.z - b.z);
    const classes = new Map(index.toolsOf('0B').map((tool) => [tool.id, tool.decision_class]));
    const runs = inFillOrder.map((mark) => classes.get(mark.tool)).filter((value, i, all) => value !== all[i - 1]);
    expect(runs).toEqual(['Core v1', 'Build', 'Optional / benchmark', 'Delay / guarded']);
  });

  it('gives the same positions on every run', () => {
    expect(layoutOf(PLAN)).toEqual(layoutOf(PLAN));
  });

  it('gives the same positions whatever order the graph lists its nodes in', () => {
    const reversed = graphOf(PLAN);
    reversed.nodes.reverse();
    expect(layoutStack(readGraph(reversed, vocabulary))).toEqual(layoutOf(PLAN));
  });

  it('stores nothing in the graph', () => {
    const graph = graphOf(PLAN);
    const before = structuredClone(graph);
    layoutStack(readGraph(graph, vocabulary));
    // readGraph sorts nothing in place either, so the graph is untouched.
    expect(graph).toEqual(before);
  });

  it('reports bounds that hold every plate', () => {
    const layout = layoutOf(PLAN);
    for (const plate of layout.plates) {
      expect(plate.x - plate.width / 2).toBeGreaterThanOrEqual(layout.bounds.min.x - TOLERANCE);
      expect(plate.x + plate.width / 2).toBeLessThanOrEqual(layout.bounds.max.x + TOLERANCE);
      expect(plate.y).toBeGreaterThanOrEqual(layout.bounds.min.y);
      expect(plate.y).toBeLessThanOrEqual(layout.bounds.max.y);
    }
  });
});

describe('layoutStack on the real graph', () => {
  const index = realIndex();
  const layout = layoutStack(index);

  it('places 8 plates, 55 cells and 773 marks', () => {
    expect(layout.plates).toHaveLength(8);
    expect(layout.cells).toHaveLength(55);
    expect(layout.marks).toHaveLength(773);
  });

  it('is sound: marks inside cells, cells inside plates, no overlap', () => {
    expectSoundLayout(layout);
  });

  it('lays out the largest cluster (58 tools) and the smallest (4) with no empty-looking cell', () => {
    const sizes = layout.cells.map((cell) => index.toolsOf(cell.cluster).length);
    expect(Math.max(...sizes)).toBe(58);
    expect(Math.min(...sizes)).toBe(4);
    // A cell is a grid of mark-sized slots. With four marks to a column and at
    // least four tools to a cluster, the emptiest cell is 5 of 8. This fails if
    // the grid is made deeper without a thought for the small clusters.
    for (const cell of layout.cells) {
      const marks = layout.marks.filter((mark) => mark.cluster === cell.cluster);
      const filled = marks.length / cell.slots;
      expect(filled, `cell ${cell.cluster} with ${marks.length} tools`).toBeGreaterThanOrEqual(0.6);
    }
  });
});

describe('rowsOf', () => {
  it('keeps cells that fit in one row', () => {
    expect(rowsOf([4, 4, 4], 1, 14)).toEqual([3]);
    expect(rowsOf([], 1, 14)).toEqual([]);
  });

  it('takes the fewest rows, and makes them near one length', () => {
    // Filled a row at a time these would stand 4 and 1.
    expect(rowsOf([4, 4, 4, 4, 4], 1, 20)).toEqual([3, 2]);
    expect(rowsOf([10, 2, 2, 2, 2, 2], 1, 16)).toEqual([2, 4]);
  });

  it('gives a cell longer than a row a row to itself', () => {
    expect(rowsOf([3, 30, 3], 1, 10)).toEqual([1, 1, 1]);
  });
});

describe('layoutStack, wrapped, on the real graph', () => {
  const index = realIndex();
  const whole = layoutStack(index);
  const wrapped = layoutStack(index, STACK_METRICS, WRAPPED_STACK);

  it('places every plate, cell and mark, and is sound', () => {
    expect(wrapped.plates).toHaveLength(whole.plates.length);
    expect(wrapped.cells.map((cell) => cell.cluster)).toEqual(whole.cells.map((cell) => cell.cluster));
    expect(wrapped.marks.map((mark) => mark.tool)).toEqual(whole.marks.map((mark) => mark.tool));
    expectSoundLayout(wrapped);
  });

  it('has no plate longer than a row may be, and at least one plate of two rows', () => {
    for (const plate of wrapped.plates) expect(plate.width).toBeLessThanOrEqual(WRAPPED_STACK.mostPlateWidth + TOLERANCE);
    expect(Math.max(...whole.plates.map((plate) => plate.width))).toBeGreaterThan(WRAPPED_STACK.mostPlateWidth);
    expect(new Set(wrapped.plates.map((plate) => plate.depth)).size).toBeGreaterThan(1);
  });

  it('keeps the plates left ends and their near edges in line, inside the bounds', () => {
    for (const plate of wrapped.plates) {
      expect(plate.x - plate.width / 2).toBeCloseTo(wrapped.bounds.min.x, 9);
      expect(plate.z + plate.depth / 2).toBeCloseTo(wrapped.bounds.max.z, 9);
      expect(plate.z - plate.depth / 2).toBeGreaterThanOrEqual(wrapped.bounds.min.z - TOLERANCE);
    }
  });

  it('stands the plate above a deeper plate higher by the rise of each row after the first, and no other', () => {
    const upward = [...wrapped.plates].sort((a, b) => a.y - b.y);
    const shallow = Math.min(...upward.map((plate) => plate.depth));
    const rowStep = STACK_METRICS.rows * STACK_METRICS.pitch + 2 * STACK_METRICS.cellPadding + WRAPPED_STACK.rowGap;
    upward.slice(1).forEach((plate, at) => {
      const under = upward[at]!;
      const moreRows = Math.round((under.depth - shallow) / rowStep);
      expect(plate.y - under.y).toBeCloseTo(STACK_METRICS.plateSpacing + moreRows * WRAPPED_STACK.rowRise, 9);
    });
  });

  it('leaves the whole layout as it was', () => {
    expect(layoutStack(index)).toEqual(whole);
    expect(new Set(whole.plates.map((plate) => plate.depth)).size).toBe(1);
  });
});
