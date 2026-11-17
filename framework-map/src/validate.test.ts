import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkVocabulary, parsePhases, validateGraph } from './validate';
import type { Vocabulary } from './validate';

const vocabulary: Vocabulary = {
  decision_class: ['Core v1', 'Build'],
  hosting: ['Hub', 'Cloud'],
  stream: ['OS'],
  kind: { Skill: ['Skill', 'Claude Code skill'], Model: ['Model'] },
  gate: { None: ['None'], Guarded: ['Guarded: credentials'] },
};

/** The smallest graph with no fault: one tier, one cluster, one tool, one need. */
const validGraph = () => ({
  meta: { counts: { tools: 1, clusters: 1, tiers: 1, needs: 1, edges: 1 } },
  nodes: [
    { id: 'role:A', type: 'role', label: 'Architect' },
    { id: 'T0', type: 'tier', label: 'Substrate' },
    { id: '0A', type: 'cluster', label: 'Models', tier: 'T0', hosting: 'Hub', stream: 'OS', gate: 'None', tools: 1 },
    {
      id: 'tool:a',
      type: 'tool',
      label: 'a',
      tier: 'T0',
      cluster: '0A',
      kind: 'Skill',
      decision_class: 'Core v1',
      hosting: 'Hub',
      stream: 'OS',
      gate: 'None',
    },
    { id: 'N01', type: 'need', label: 'A need', phase: 'P1-P2' },
  ] as Record<string, unknown>[],
  edges: [{ source: 'tool:a', target: 'N01', type: 'serves' }],
});

type TestGraph = ReturnType<typeof validGraph>;

/** Validates the valid graph after one change, so the result holds only that change's fault. */
const faultsAfter = (change: (graph: TestGraph) => void) => {
  const graph = validGraph();
  change(graph);
  return validateGraph(graph, vocabulary);
};

const node = (graph: TestGraph, id: string): Record<string, unknown> => {
  const found = graph.nodes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No node ${id} in the test graph`);
  return found;
};

describe('validateGraph', () => {
  it('passes a consistent graph', () => {
    expect(validateGraph(validGraph(), vocabulary)).toEqual([]);
  });

  it('rejects an edge that points to a missing node', () => {
    const faults = faultsAfter((graph) => {
      graph.edges.push({ source: 'tool:a', target: 'N99', type: 'serves' });
      graph.meta.counts.edges = 2;
    });
    expect(faults).toEqual([
      { fault: 'missing-node', id: 'N99', message: expect.stringMatching(/tool:a.*N99.*serves/) },
    ]);
  });

  it('rejects a duplicate id', () => {
    const faults = faultsAfter((graph) => {
      graph.nodes.push({ id: 'role:A', type: 'role', label: 'Architect again' });
    });
    expect(faults).toEqual([{ fault: 'duplicate-id', id: 'role:A', message: expect.stringContaining('role:A') }]);
  });

  it('rejects a tool with no cluster', () => {
    const faults = faultsAfter((graph) => {
      delete node(graph, 'tool:a').cluster;
      node(graph, '0A').tools = 0;
    });
    expect(faults).toEqual([{ fault: 'no-cluster', id: 'tool:a', message: expect.stringContaining('tool:a') }]);
  });

  it('rejects a tool whose cluster is not a cluster in the graph', () => {
    const faults = faultsAfter((graph) => {
      node(graph, 'tool:a').cluster = 'T0';
      node(graph, '0A').tools = 0;
    });
    expect(faults).toEqual([{ fault: 'no-cluster', id: 'tool:a', message: expect.stringContaining('"T0"') }]);
  });

  it("rejects a tool whose tier disagrees with its cluster's tier", () => {
    const faults = faultsAfter((graph) => {
      node(graph, 'tool:a').tier = 'T3';
    });
    expect(faults).toEqual([
      { fault: 'tier-mismatch', id: 'tool:a', message: expect.stringMatching(/tool:a.*T3.*0A.*T0/) },
    ]);
  });

  it.each(['kind', 'decision_class', 'hosting', 'stream', 'gate'])(
    'rejects a tool whose %s is not in the vocabulary file',
    (field) => {
      const faults = faultsAfter((graph) => {
        node(graph, 'tool:a')[field] = 'Unheard of';
      });
      expect(faults).toEqual([
        { fault: 'unknown-value', id: 'tool:a', message: expect.stringMatching(new RegExp(`tool:a.*${field}.*Unheard of`)) },
      ]);
    },
  );

  it.each(['hosting', 'stream', 'gate'])('rejects a cluster whose %s is not in the vocabulary file', (field) => {
    const faults = faultsAfter((graph) => {
      node(graph, '0A')[field] = 'Unheard of';
    });
    expect(faults).toEqual([
      { fault: 'unknown-value', id: '0A', message: expect.stringMatching(new RegExp(`0A.*${field}.*Unheard of`)) },
    ]);
  });

  it('accepts every raw value listed under a kind or gate family', () => {
    const faults = faultsAfter((graph) => {
      node(graph, 'tool:a').kind = 'Claude Code skill';
      node(graph, 'tool:a').gate = 'Guarded: credentials';
    });
    expect(faults).toEqual([]);
  });

  it('rejects a need with no serving tool', () => {
    const faults = faultsAfter((graph) => {
      graph.edges = [];
      graph.meta.counts.edges = 0;
    });
    expect(faults).toEqual([{ fault: 'unserved-need', id: 'N01', message: expect.stringContaining('N01') }]);
  });

  it('rejects a need whose phase does not parse into P0 to P4', () => {
    const faults = faultsAfter((graph) => {
      node(graph, 'N01').phase = 'P2-P5';
    });
    expect(faults).toEqual([{ fault: 'bad-phase', id: 'N01', message: expect.stringMatching(/N01.*P2-P5/) }]);
  });

  it.each(['tools', 'clusters', 'tiers', 'needs', 'edges'] as const)(
    'rejects a metadata count of %s that disagrees with the graph',
    (key) => {
      const faults = faultsAfter((graph) => {
        graph.meta.counts[key] = 7;
      });
      expect(faults).toEqual([
        { fault: 'count-mismatch', id: `meta.counts.${key}`, message: expect.stringMatching(/7.*\b1\b/) },
      ]);
    },
  );

  it("rejects a cluster whose tool count disagrees with the tools that name it", () => {
    const faults = faultsAfter((graph) => {
      node(graph, '0A').tools = 4;
    });
    expect(faults).toEqual([{ fault: 'count-mismatch', id: '0A', message: expect.stringMatching(/0A.*4.*\b1\b/) }]);
  });

  it('reports every fault in a graph, not only the first', () => {
    const faults = faultsAfter((graph) => {
      node(graph, 'tool:a').kind = 'Unheard of';
      node(graph, 'N01').phase = 'soon';
    });
    expect(faults.map((fault) => fault.fault).sort()).toEqual(['bad-phase', 'unknown-value']);
  });

  it('rejects something that is not a graph without throwing', () => {
    expect(validateGraph({ nodes: 'none' }, vocabulary)).toEqual([
      { fault: 'malformed', id: 'graph', message: expect.any(String) },
    ]);
  });
});

describe('parsePhases', () => {
  it.each([
    ['P0', ['P0']],
    ['P2-P3', ['P2', 'P3']],
    ['P0-P4', ['P0', 'P1', 'P2', 'P3', 'P4']],
    ['P1, P3', ['P1', 'P3']],
    ['P0, P3-P4', ['P0', 'P3', 'P4']],
  ])('reads %j', (text, phases) => {
    expect(parsePhases(text)).toEqual(phases);
  });

  it.each(['', 'P5', 'P3-P2', 'P1-', 'Phase 1', 'P1; P2', 'P1,,P2'])('does not read %j', (text) => {
    expect(parsePhases(text)).toBeNull();
  });
});

describe('checkVocabulary', () => {
  it('passes a vocabulary that lists each value once', () => {
    expect(checkVocabulary(vocabulary)).toEqual([]);
  });

  it('rejects a kind listed under two families', () => {
    const faults = checkVocabulary({ ...vocabulary, kind: { Skill: ['Skill'], Model: ['Model', 'Skill'] } });
    expect(faults).toEqual([{ fault: 'vocabulary', id: 'Skill', message: expect.stringMatching(/kind.*Skill.*Model/) }]);
  });
});

describe('the files in tool-discovery', () => {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(new URL(`../../tool-discovery/${name}`, import.meta.url), 'utf8'));
  const currentVocabulary = read('vocabulary.json') as Vocabulary;

  it('hold a vocabulary that lists each value once', () => {
    expect(checkVocabulary(currentVocabulary)).toEqual([]);
  });

  it('hold a graph that passes the validator', () => {
    expect(validateGraph(read('tool-framework.graph.json'), currentVocabulary)).toEqual([]);
  });
});
