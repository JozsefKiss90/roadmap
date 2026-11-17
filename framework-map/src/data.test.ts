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
  edges: [{ source: 'tool:a', target: 'N01', type: 'serves' }] as Record<string, unknown>[],
});

/** The valid graph with a second need, an overlap group of three, two `implements` edges, a role and a stream. */
const wiredGraph = () => {
  const graph = validGraph();
  graph.nodes.push(
    { id: 'N02', type: 'need', label: 'Another need', phase: 'P2' },
    { id: 'role:D', type: 'role', label: 'Designer' },
    { id: 'stream:OS', type: 'stream', label: 'Hermes OS and RAG Factory' },
  );
  graph.edges.push(
    { source: 'tool:a', target: 'N02', type: 'serves', best_fit: true },
    { source: 'tool:b', target: 'N02', type: 'serves', best_fit: false },
    { source: 'tool:c', target: 'N02', type: 'serves', best_fit: true },
    { source: 'tool:a', target: 'tool:b', type: 'overlaps', group: 'same-job' },
    { source: 'tool:a', target: 'tool:c', type: 'overlaps', group: 'same-job' },
    { source: 'tool:b', target: 'tool:c', type: 'overlaps', group: 'same-job' },
    { source: 'tool:a', target: '1A', type: 'implements' },
    { source: 'tool:b', target: '1A', type: 'implements' },
  );
  graph.meta.counts.needs = 2;
  graph.meta.counts.edges = graph.edges.length;
  return graph;
};

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

  it('finds a tool or a need by its id', () => {
    const index = readGraph(validGraph(), vocabulary);
    expect(index.tool('tool:b')?.cluster).toBe('0B');
    expect(index.need('N01')?.label).toBe('A need');
    expect(index.tool('N01')).toBeUndefined();
    expect(index.need('tool:b')).toBeUndefined();
  });

  it('lists the needs a tool serves, and says which it is a best fit for', () => {
    const index = readGraph(wiredGraph(), vocabulary);
    expect(index.needsOf('tool:a').map(({ need, bestFit }) => [need.id, bestFit])).toEqual([
      ['N01', false],
      ['N02', true],
    ]);
    expect(index.needsOf('tool:d')).toEqual([]);
  });

  it("lists a need's best-fit tools, and leaves out the tools that only serve it", () => {
    const index = readGraph(wiredGraph(), vocabulary);
    expect(ids(index.bestFitToolsOf('N02'))).toEqual(['tool:a', 'tool:c']);
    expect(ids(index.bestFitToolsOf('N01'))).toEqual([]);
  });

  it("names a tool's overlap group and lists its other members", () => {
    const index = readGraph(wiredGraph(), vocabulary);
    const overlap = index.overlapOf('tool:b');
    expect(overlap?.group).toBe('same-job');
    expect(ids(overlap?.members ?? [])).toEqual(['tool:a', 'tool:c']);
    expect(index.overlapOf('tool:d')).toBeUndefined();
  });

  it('lists the clusters a tool implements, and the tools that implement a cluster', () => {
    const index = readGraph(wiredGraph(), vocabulary);
    expect(ids(index.implementedBy('1A'))).toEqual(['tool:a', 'tool:b']);
    expect(ids(index.implementsOf('tool:a'))).toEqual(['1A']);
    expect(index.implementsOf('tool:d')).toEqual([]);
    expect(index.implementedBy('0A')).toEqual([]);
  });

  it('gives the name of a role and of a value stream', () => {
    const index = readGraph(wiredGraph(), vocabulary);
    expect(index.roleName('D')).toBe('Designer');
    expect(index.streamName('OS')).toBe('Hermes OS and RAG Factory');
    expect(index.streamName('Unheard of')).toBe('Unheard of');
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

  describe('for the filters', () => {
    const filterVocabulary: Vocabulary = {
      decision_class: ['Core v1', 'Core later', 'Adapter', 'Build', 'Delay / guarded', 'Optional / benchmark'],
      hosting: ['Hub', 'Cloud'],
      stream: ['OS', 'Build'],
      kind: { 'Skill or command': ['Skill', 'Ruleset'], Model: ['Reranker'] },
      gate: { None: ['None'], Guarded: ['Guarded: client data'] },
    };
    /** Four tools: `a` and `c` are plain skills, `b` is a guarded ruleset in the cloud, `d` a reranker. */
    const filterGraph = () => {
      const graph = validGraph();
      const facets: Record<string, Record<string, unknown>> = {
        'tool:a': { used_by: ['A', 'D'], operated_by: ['A'] },
        'tool:b': {
          kind: 'Ruleset',
          decision_class: 'Build',
          hosting: 'Cloud',
          gate: 'Guarded: client data',
          used_by: ['M'],
          operated_by: ['A'],
        },
        'tool:c': { used_by: ['A'], operated_by: ['A'] },
        'tool:d': { kind: 'Reranker', stream: 'Build', used_by: ['D', 'A'], operated_by: ['D'] },
      };
      graph.nodes = graph.nodes.map((node) => ({ ...node, ...facets[node.id as string] }));
      graph.nodes.push(
        { id: 'role:A', type: 'role', label: 'Architect' },
        { id: 'role:D', type: 'role', label: 'Designer' },
        { id: 'role:M', type: 'role', label: 'Analyst' },
      );
      return graph;
    };

    it('lists every tool', () => {
      expect(ids(readGraph(filterGraph(), filterVocabulary).tools)).toEqual(['tool:a', 'tool:b', 'tool:c', 'tool:d']);
    });

    it('gives what a tool has for each filter, with its kind and its gate as their families', () => {
      const index = readGraph(filterGraph(), filterVocabulary);
      expect(index.facetsOf('tool:b')).toEqual({
        decision: ['Build'],
        kind: ['Skill or command'],
        used: ['M'],
        operated: ['A'],
        hosting: ['Cloud'],
        stream: ['OS'],
        gate: ['Guarded'],
      });
      expect(index.facetsOf('tool:d').used).toEqual(['D', 'A']);
    });

    it('lists the values of each filter: decision classes by their step, families and the rest as the vocabulary file has them, and the roles', () => {
      const index = readGraph(filterGraph(), filterVocabulary);
      expect(index.filterValues('decision')).toEqual([
        'Core v1',
        'Adapter',
        'Core later',
        'Build',
        'Optional / benchmark',
        'Delay / guarded',
      ]);
      expect(index.filterValues('kind')).toEqual(['Skill or command', 'Model']);
      expect(index.filterValues('gate')).toEqual(['None', 'Guarded']);
      expect(index.filterValues('hosting')).toEqual(['Hub', 'Cloud']);
      expect(index.filterValues('stream')).toEqual(['OS', 'Build']);
      expect(index.filterValues('used')).toEqual(['A', 'D', 'M']);
      expect(index.filterValues('operated')).toEqual(['A', 'D', 'M']);
    });

    it('gives the tools that pass the filters: any chosen value within a filter, and every filter', () => {
      const index = readGraph(filterGraph(), filterVocabulary);
      const none = { decision: [], kind: [], used: [], operated: [], hosting: [], stream: [], gate: [] };
      expect([...index.passing(none)]).toEqual(['tool:a', 'tool:b', 'tool:c', 'tool:d']);
      expect([...index.passing({ ...none, used: ['D', 'M'] })]).toEqual(['tool:a', 'tool:b', 'tool:d']);
      expect([...index.passing({ ...none, used: ['D', 'M'], kind: ['Skill or command'] })]).toEqual(['tool:a', 'tool:b']);
      expect([...index.passing({ ...none, gate: ['Guarded'], hosting: ['Hub'] })]).toEqual([]);
    });

    it('counts the tools that have each value of a filter', () => {
      const index = readGraph(filterGraph(), filterVocabulary);
      expect(index.toolCountWith('kind', 'Skill or command')).toBe(3);
      expect(index.toolCountWith('used', 'A')).toBe(3);
      expect(index.toolCountWith('used', 'D')).toBe(2);
      expect(index.toolCountWith('operated', 'M')).toBe(0);
      expect(index.toolCountWith('decision', 'Adapter')).toBe(0);
    });
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
