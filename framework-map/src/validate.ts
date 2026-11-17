/**
 * validate: checks the graph JSON for consistency and against the vocabulary
 * file, and reports every fault it finds.
 *
 * It imports nothing, so scripts/validate-graph.ts can run it under Node
 * during the build as well as the tests.
 */

/**
 * The vocabulary file: the values the graph may use. Kind and gate values are
 * listed under the family the map groups them into, so a raw value cannot be
 * allowed without also being given a family.
 */
export interface Vocabulary {
  decision_class: string[];
  hosting: string[];
  stream: string[];
  /** Kind family to the raw kind values in it. */
  kind: Record<string, string[]>;
  /** Gate family to the raw gate values in it. */
  gate: Record<string, string[]>;
}

export type FaultType =
  | 'malformed'
  | 'duplicate-id'
  | 'missing-node'
  | 'no-cluster'
  | 'tier-mismatch'
  | 'unknown-value'
  | 'unserved-need'
  | 'bad-phase'
  | 'count-mismatch'
  | 'vocabulary';

export interface Fault {
  fault: FaultType;
  /** The node, metadata entry or vocabulary value at fault. */
  id: string;
  message: string;
}

type VocabularyField = 'kind' | 'decision_class' | 'hosting' | 'stream' | 'gate';

/** The fields checked against the vocabulary, by node type. */
const CHECKED_FIELDS: Record<string, VocabularyField[]> = {
  tool: ['kind', 'decision_class', 'hosting', 'stream', 'gate'],
  cluster: ['hosting', 'stream', 'gate'],
};

/** Node type to its key in the metadata counts. */
const COUNTED_TYPES: Record<string, string> = { tool: 'tools', cluster: 'clusters', tier: 'tiers', need: 'needs' };

const PHASE_COUNT = 5;
const PHASE_ITEM = /^P(\d)(?:-P(\d))?$/;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const show = (value: unknown): string => (value === undefined ? 'nothing' : JSON.stringify(value));

/**
 * Reads a need's phase string, such as "P2", "P2-P3" or "P1, P3", into the
 * phases it covers, in order. Returns null if the string is not a list of
 * phases or rising ranges within P0 to P4.
 */
export function parsePhases(text: string): string[] | null {
  const covered = new Set<number>();
  for (const item of text.split(',')) {
    const match = PHASE_ITEM.exec(item.trim());
    if (!match) return null;
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    if (last >= PHASE_COUNT || (match[2] !== undefined && last <= first)) return null;
    for (let phase = first; phase <= last; phase += 1) covered.add(phase);
  }
  return [...covered].sort((a, b) => a - b).map((phase) => `P${phase}`);
}

function allowedValues(vocabulary: Vocabulary): Record<VocabularyField, Set<string>> {
  return {
    kind: new Set(Object.values(vocabulary.kind).flat()),
    decision_class: new Set(vocabulary.decision_class),
    hosting: new Set(vocabulary.hosting),
    stream: new Set(vocabulary.stream),
    gate: new Set(Object.values(vocabulary.gate).flat()),
  };
}

/** Reports any kind or gate value that the vocabulary lists under more than one family. */
export function checkVocabulary(vocabulary: Vocabulary): Fault[] {
  const faults: Fault[] = [];
  for (const field of ['kind', 'gate'] as const) {
    const familyOf = new Map<string, string>();
    for (const [family, values] of Object.entries(vocabulary[field])) {
      for (const value of values) {
        const earlier = familyOf.get(value);
        if (earlier === undefined) {
          familyOf.set(value, family);
        } else {
          faults.push({
            fault: 'vocabulary',
            id: value,
            message: `The vocabulary lists the ${field} ${show(value)} twice, under ${show(earlier)} and ${show(family)}.`,
          });
        }
      }
    }
  }
  return faults;
}

/**
 * Checks a parsed graph JSON and returns every fault found; an empty list
 * means the graph is consistent. It never throws, whatever it is given.
 */
export function validateGraph(graph: unknown, vocabulary: Vocabulary): Fault[] {
  if (!isRecord(graph) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return [{ fault: 'malformed', id: 'graph', message: 'The graph must hold a "nodes" list and an "edges" list.' }];
  }

  const faults: Fault[] = [];
  const report = (fault: FaultType, id: string, message: string): void => {
    faults.push({ fault, id, message });
  };

  // Nodes: every one needs an id, and no id may be used twice.
  const nodes = new Map<string, Json>();
  const duplicated = new Set<string>();
  const perType = new Map<string, number>();
  graph.nodes.forEach((node: unknown, index) => {
    if (!isRecord(node) || typeof node.id !== 'string' || typeof node.type !== 'string') {
      report('malformed', `nodes[${index}]`, `Node ${index} in the list has no id or no type.`);
      return;
    }
    perType.set(node.type, (perType.get(node.type) ?? 0) + 1);
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    } else if (!duplicated.has(node.id)) {
      duplicated.add(node.id);
      report('duplicate-id', node.id, `The id ${show(node.id)} is used by more than one node.`);
    }
  });

  // Edges: both ends must be nodes in the graph.
  const servedNeeds = new Set<string>();
  graph.edges.forEach((edge: unknown, index) => {
    if (!isRecord(edge) || typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      report('malformed', `edges[${index}]`, `Edge ${index} in the list has no source or no target.`);
      return;
    }
    for (const end of [edge.source, edge.target]) {
      if (!nodes.has(end)) {
        report(
          'missing-node',
          end,
          `The edge from ${show(edge.source)} to ${show(edge.target)} (${String(edge.type)}) points to ${show(end)}, which is not a node.`,
        );
      }
    }
    if (edge.type === 'serves' && nodes.get(edge.source)?.type === 'tool') servedNeeds.add(edge.target);
  });

  const allowed = allowedValues(vocabulary);
  const toolsPerCluster = new Map<string, number>();

  for (const [id, node] of nodes) {
    for (const field of CHECKED_FIELDS[String(node.type)] ?? []) {
      const value = node[field];
      if (typeof value !== 'string' || !allowed[field].has(value)) {
        report(
          'unknown-value',
          id,
          `The ${String(node.type)} ${show(id)} has the ${field} ${show(value)}, which is not in the vocabulary file.`,
        );
      }
    }

    if (node.type === 'tool') {
      const cluster = typeof node.cluster === 'string' ? nodes.get(node.cluster) : undefined;
      if (cluster?.type !== 'cluster') {
        const reason =
          node.cluster === undefined || node.cluster === null || node.cluster === ''
            ? 'has no cluster'
            : `names the cluster ${show(node.cluster)}, which is not a cluster in the graph`;
        report('no-cluster', id, `The tool ${show(id)} ${reason}.`);
      } else {
        const clusterId = String(node.cluster);
        toolsPerCluster.set(clusterId, (toolsPerCluster.get(clusterId) ?? 0) + 1);
        if (node.tier !== cluster.tier) {
          report(
            'tier-mismatch',
            id,
            `The tool ${show(id)} is in tier ${show(node.tier)}, but its cluster ${show(clusterId)} is in tier ${show(cluster.tier)}.`,
          );
        }
      }
    }

    if (node.type === 'need') {
      if (!servedNeeds.has(id)) {
        report('unserved-need', id, `The need ${show(id)} has no tool serving it.`);
      }
      if (typeof node.phase !== 'string' || parsePhases(node.phase) === null) {
        report(
          'bad-phase',
          id,
          `The need ${show(id)} has the phase ${show(node.phase)}, which does not parse into phases P0 to P4.`,
        );
      }
    }
  }

  // Counts: each cluster's own tool count, then the metadata.
  for (const [id, node] of nodes) {
    if (node.type !== 'cluster') continue;
    const actual = toolsPerCluster.get(id) ?? 0;
    if (node.tools !== actual) {
      report(
        'count-mismatch',
        id,
        `The cluster ${show(id)} says it has ${show(node.tools)} tools, but ${actual} tools name it as their cluster.`,
      );
    }
  }

  const counts = isRecord(graph.meta) && isRecord(graph.meta.counts) ? graph.meta.counts : {};
  const actualCounts: Record<string, number> = { edges: graph.edges.length };
  for (const [type, key] of Object.entries(COUNTED_TYPES)) actualCounts[key] = perType.get(type) ?? 0;
  for (const [key, actual] of Object.entries(actualCounts)) {
    if (counts[key] !== actual) {
      report(
        'count-mismatch',
        `meta.counts.${key}`,
        `The metadata counts ${show(counts[key])} ${key}, but the graph holds ${actual}.`,
      );
    }
  }

  return faults;
}
