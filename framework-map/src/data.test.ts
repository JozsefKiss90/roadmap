import { describe, expect, it } from 'vitest';
import { GraphRejected, readGraph } from './data';
import type { Vocabulary } from './validate';

const vocabulary: Vocabulary = {
  decision_class: ['Core v1', 'Build'],
  hosting: ['Hub'],
  stream: ['OS'],
  kind: { Skill: ['Skill'] },
  gate: { None: ['None'] },
};

const tool = (id: string, cluster: string, tier: string) => ({
  id,
  type: 'tool',
  label: id,
  tier,
  cluster,
  kind: 'Skill',
  decision_class: 'Core v1',
  hosting: 'Hub',
  stream: 'OS',
  gate: 'None',
});

const cluster = (id: string, tier: string, sector: number, tools: number) => ({
  id,
  type: 'cluster',
  label: `Cluster ${id}`,
  tier,
  hosting: 'Hub',
  stream: 'OS',
  gate: 'None',
  tools,
  layout: { z: 0, sector, sectors: 2 },
});

/** Two tiers and three clusters, listed out of order on purpose. */
const validGraph = () => ({
  meta: { counts: { tools: 4, clusters: 3, tiers: 2, needs: 1, edges: 1 } },
  nodes: [
    { id: 'T0', type: 'tier', label: 'Substrate', layout: { z: 0 } },
    { id: 'T1', type: 'tier', label: 'Extension primitives', layout: { z: 1 } },
    cluster('0B', 'T0', 1, 1),
    cluster('0A', 'T0', 0, 2),
    cluster('1A', 'T1', 0, 1),
    tool('tool:a', '0A', 'T0'),
    tool('tool:b', '0B', 'T0'),
    tool('tool:c', '0A', 'T0'),
    tool('tool:d', '1A', 'T1'),
    { id: 'N01', type: 'need', label: 'A need', phase: 'P1' },
  ] as Record<string, unknown>[],
  edges: [{ source: 'tool:a', target: 'N01', type: 'serves' }],
});

const ids = (nodes: readonly { id: string }[]): string[] => nodes.map((node) => node.id);

describe('readGraph', () => {
  it('lists the tiers from the top of the stack down', () => {
    expect(ids(readGraph(validGraph(), vocabulary).tiers)).toEqual(['T1', 'T0']);
  });

  it("lists a tier's clusters in the order they sit on its plate", () => {
    expect(ids(readGraph(validGraph(), vocabulary).clustersOf('T0'))).toEqual(['0A', '0B']);
  });

  it("lists a cluster's tools", () => {
    const index = readGraph(validGraph(), vocabulary);
    expect(ids(index.toolsOf('0A'))).toEqual(['tool:a', 'tool:c']);
    expect(ids(index.toolsOf('1A'))).toEqual(['tool:d']);
  });

  it('counts the tools of a tier', () => {
    const index = readGraph(validGraph(), vocabulary);
    expect(index.toolCountOf('T0')).toBe(3);
    expect(index.toolCountOf('T1')).toBe(1);
  });

  it('finds a tier or a cluster by its id, and nothing for an id of another type', () => {
    const index = readGraph(validGraph(), vocabulary);
    expect(index.tier('T1')?.label).toBe('Extension primitives');
    expect(index.cluster('0B')?.tier).toBe('T0');
    expect(index.tier('0B')).toBeUndefined();
    expect(index.cluster('tool:a')).toBeUndefined();
  });

  it('gives the family the vocabulary file lists a kind or gate value under', () => {
    const families: Vocabulary = {
      ...vocabulary,
      kind: { 'Skill or command': ['Skill', 'Ruleset'] },
      gate: { None: ['None'], Guarded: ['Guarded: client data'] },
    };
    const index = readGraph(validGraph(), families);
    expect(index.kindFamilyOf('Ruleset')).toBe('Skill or command');
    expect(index.gateFamilyOf('Guarded: client data')).toBe('Guarded');
    expect(() => index.gateFamilyOf('Unheard of')).toThrow(/gate family/);
  });

  it('refuses a graph the validator rejects, and names the faults', () => {
    const graph = validGraph();
    graph.nodes.push(tool('tool:e', '9Z', 'T0'));
    graph.meta.counts.tools = 5;

    let thrown: unknown;
    try {
      readGraph(graph, vocabulary);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GraphRejected);
    const rejected = thrown as GraphRejected;
    expect(rejected.faults.map((fault) => fault.fault)).toContain('no-cluster');
    expect(rejected.message).toContain('tool:e');
  });

  it('refuses something that is not a graph', () => {
    expect(() => readGraph({ nodes: 'none' }, vocabulary)).toThrow(GraphRejected);
  });
});
