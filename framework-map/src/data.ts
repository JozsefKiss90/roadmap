/**
 * data: validates and indexes the graph.
 *
 * readGraph runs the same validator as the build (src/validate.ts) and refuses
 * a graph with any fault, so nothing downstream has to guard against bad data.
 * It imports no file, so the build can run it under Node; src/inlined-graph.ts
 * feeds it the graph that is inlined in the page.
 */
import type { ClusterNode, Graph, TierNode, ToolNode } from './graph';
import { validateGraph } from './validate.ts';
import type { Fault, Vocabulary } from './validate.ts';

/** Thrown for a graph the validator rejects. */
export class GraphRejected extends Error {
  readonly faults: readonly Fault[];

  constructor(faults: readonly Fault[]) {
    const lines = faults.map((fault) => `  - [${fault.fault}] ${fault.message}`);
    super(`The graph failed validation with ${faults.length} fault(s):\n${lines.join('\n')}`);
    this.name = 'GraphRejected';
    this.faults = faults;
  }
}

/** A validated graph, with the lookups the map needs. */
export interface GraphIndex {
  readonly graph: Graph;
  /** The tiers from the top of the stack (T7) down. */
  readonly tiers: readonly TierNode[];
  /** A tier's clusters, in the order they sit on its plate. */
  clustersOf(tierId: string): readonly ClusterNode[];
  /** A cluster's tools, in the graph's own order. */
  toolsOf(clusterId: string): readonly ToolNode[];
  /** How many tools a tier holds across its clusters. */
  toolCountOf(tierId: string): number;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

/** Validates a parsed graph and indexes it. Throws GraphRejected on any fault. */
export function readGraph(candidate: unknown, vocabulary: Vocabulary): GraphIndex {
  const faults = validateGraph(candidate, vocabulary);
  if (faults.length > 0) throw new GraphRejected(faults);
  const graph = candidate as Graph;

  const tiers: TierNode[] = [];
  const clusters: ClusterNode[] = [];
  const tools: ToolNode[] = [];
  for (const node of graph.nodes) {
    if (node.type === 'tier') tiers.push(node);
    else if (node.type === 'cluster') clusters.push(node);
    else if (node.type === 'tool') tools.push(node);
  }

  tiers.sort((a, b) => b.layout.z - a.layout.z);
  clusters.sort((a, b) => a.layout.sector - b.layout.sector);
  const clustersByTier = groupBy(clusters, (cluster) => cluster.tier);
  const toolsByCluster = groupBy(tools, (tool) => tool.cluster);
  const toolsByTier = groupBy(tools, (tool) => tool.tier);

  return {
    graph,
    tiers,
    clustersOf: (tierId) => clustersByTier.get(tierId) ?? [],
    toolsOf: (clusterId) => toolsByCluster.get(clusterId) ?? [],
    toolCountOf: (tierId) => toolsByTier.get(tierId)?.length ?? 0,
  };
}
