/**
 * data: validates and indexes the graph.
 *
 * readGraph runs the same validator as the build (src/validate.ts) and refuses
 * a graph with any fault, so nothing downstream has to guard against bad data.
 * It imports no file, so the build can run it under Node; src/inlined-graph.ts
 * feeds it the graph that is inlined in the page.
 */
import { DECISION_STEPS, decisionStep } from './display.ts';
import type { ClusterNode, Graph, NeedNode, TierNode, ToolNode } from './graph';
import {
  bestFit as isBestFit,
  emphasised as isEmphasised,
  inReach as isInReach,
  traced as isTraced,
  tracedNeedOf,
} from './state.ts';
import type { Facets, FilterName, Lens, MapState, Traits } from './state.ts';
import { parsePhases, validateGraph } from './validate.ts';
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
  /** Every tool, in the graph's own order. */
  readonly tools: readonly ToolNode[];
  /** The tiers from the top of the stack (T7) down. */
  readonly tiers: readonly TierNode[];
  /** A tier's clusters, in the order they sit on its plate. */
  clustersOf(tierId: string): readonly ClusterNode[];
  /** A cluster's tools, in the graph's own order. */
  toolsOf(clusterId: string): readonly ToolNode[];
  /** How many tools a tier holds across its clusters. Under a lens, how many of them are in reach. */
  toolCountOf(tierId: string, lens?: Lens | null): number;
  /** The tier, cluster, tool or need with this id, if the graph has one. */
  tier(id: string): TierNode | undefined;
  cluster(id: string): ClusterNode | undefined;
  tool(id: string): ToolNode | undefined;
  need(id: string): NeedNode | undefined;
  /** Whether a tool serves a need. */
  serves(toolId: string, needId: string): boolean;
  /** The needs a tool serves, in the graph's own order, and whether the tool is a best fit for each. */
  needsOf(toolId: string): readonly ServedNeed[];
  /** The tools that are a best fit for a need. */
  bestFitToolsOf(needId: string): readonly ToolNode[];
  /** Every tool that serves a need, best fit or not, in the graph's own order. */
  servingToolsOf(needId: string): readonly ToolNode[];
  /** The phases that have needs, in turn, each with its needs in the graph's own order. A need that spans phases is under each of them. */
  readonly needsByPhase: readonly PhaseNeeds[];
  /** A tool's overlap group: its name and its other members. Undefined for a tool in no group. */
  overlapOf(toolId: string): OverlapGroup | undefined;
  /** The clusters a tool implements, and the tools that implement a cluster. */
  implementsOf(toolId: string): readonly ClusterNode[];
  implementedBy(clusterId: string): readonly ToolNode[];
  /** The name of a role, and of a value stream, by its code in the data. An unknown code is its own name. */
  roleName(code: string): string;
  streamName(code: string): string;
  /** The family the vocabulary file lists a raw kind or gate value under. */
  kindFamilyOf(kind: string): string;
  gateFamilyOf(gate: string): string;
  /**
   * The values a filter lists. Decision classes run from the committed step to
   * the guarded one; kind and gate are the families of the vocabulary file;
   * "used" and "operated" are the roles' codes.
   */
  filterValues(name: FilterName): readonly string[];
  /** What a tool has for each filter: its kind and its gate as their families. */
  facetsOf(toolId: string): Facets;
  /** How many tools have a value of a filter. */
  toolCountWith(name: FilterName, value: string): number;
  /** The ids of the tools in reach under a lens, whatever the filters. No lens leaves every tool in reach. */
  inReach(lens: Lens | null): ReadonlySet<string>;
  /**
   * The ids of the tools drawn at full strength: in reach under the lens and
   * passing the filters. Every other tool is faded.
   */
  emphasised(state: Pick<MapState, 'lens' | 'filters'>): ReadonlySet<string>;
  /** The ids of the traced tools: those that serve the need the need trace is on for, whatever the filters. */
  traced(lens: Lens | null): ReadonlySet<string>;
  /** The ids of the traced tools that are a best fit for the need. */
  bestFit(lens: Lens | null): ReadonlySet<string>;
}

export interface PhaseNeeds {
  /** The phase's code, such as "P2". */
  phase: string;
  needs: readonly NeedNode[];
}

export interface ServedNeed {
  need: NeedNode;
  bestFit: boolean;
}

export interface OverlapGroup {
  group: string;
  /** The other tools of the group, in the graph's own order. */
  members: readonly ToolNode[];
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

/** Each raw value to the family the vocabulary file lists it under. */
function familyOfValue(families: Record<string, string[]>, field: string): (value: string) => string {
  const familyOf = new Map<string, string>();
  for (const [family, values] of Object.entries(families)) {
    for (const value of values) familyOf.set(value, family);
  }
  return (value) => {
    const family = familyOf.get(value);
    if (family === undefined) throw new Error(`The vocabulary file lists no ${field} family for "${value}".`);
    return family;
  };
}

/** Validates a parsed graph and indexes it. Throws GraphRejected on any fault. */
export function readGraph(candidate: unknown, vocabulary: Vocabulary): GraphIndex {
  const faults = validateGraph(candidate, vocabulary);
  if (faults.length > 0) throw new GraphRejected(faults);
  const graph = candidate as Graph;

  const tiers: TierNode[] = [];
  const clusters: ClusterNode[] = [];
  const tools: ToolNode[] = [];
  const needs = new Map<string, NeedNode>();
  const labels = new Map<string, string>();
  const roles: string[] = [];
  for (const node of graph.nodes) {
    if (node.type === 'role') roles.push(node.id.replace(/^role:/, ''));
    if (node.type === 'tier') tiers.push(node);
    else if (node.type === 'cluster') clusters.push(node);
    else if (node.type === 'tool') tools.push(node);
    else if (node.type === 'need') needs.set(node.id, node);
    else if (node.type === 'role' || node.type === 'stream') labels.set(node.id, node.label);
  }

  tiers.sort((a, b) => b.layout.z - a.layout.z);
  clusters.sort((a, b) => a.layout.sector - b.layout.sector);
  const clustersByTier = groupBy(clusters, (cluster) => cluster.tier);
  const toolsByCluster = groupBy(tools, (tool) => tool.cluster);
  const toolsByTier = groupBy(tools, (tool) => tool.tier);
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  /** The position of each tool in the graph, to list tools gathered from edges in the graph's own order. */
  const toolOrder = new Map(tools.map((tool, position) => [tool.id, position]));
  const inGraphOrder = (some: Iterable<ToolNode>): ToolNode[] =>
    [...some].sort((a, b) => (toolOrder.get(a.id) ?? 0) - (toolOrder.get(b.id) ?? 0));

  const needsByTool = new Map<string, ServedNeed[]>();
  const toolsByNeed = new Map<string, ToolNode[]>();
  const bestFitByNeed = new Map<string, ToolNode[]>();
  const groupByTool = new Map<string, string>();
  const toolsByGroup = new Map<string, Set<ToolNode>>();
  const clustersByImplementer = new Map<string, ClusterNode[]>();
  const implementersByCluster = new Map<string, ToolNode[]>();
  const push = <T>(lists: Map<string, T[]>, key: string, item: T): void => {
    const list = lists.get(key);
    if (list) list.push(item);
    else lists.set(key, [item]);
  };
  for (const edge of graph.edges) {
    const tool = toolById.get(edge.source);
    if (!tool) continue;
    if (edge.type === 'serves') {
      const need = needs.get(edge.target);
      if (!need) continue;
      const bestFit = edge.best_fit === true;
      push(needsByTool, tool.id, { need, bestFit });
      push(toolsByNeed, need.id, tool);
      if (bestFit) push(bestFitByNeed, need.id, tool);
    } else if (edge.type === 'overlaps' && edge.group !== undefined) {
      const other = toolById.get(edge.target);
      if (!other) continue;
      const members = toolsByGroup.get(edge.group) ?? new Set<ToolNode>();
      toolsByGroup.set(edge.group, members.add(tool).add(other));
      groupByTool.set(tool.id, edge.group);
      groupByTool.set(other.id, edge.group);
    } else if (edge.type === 'implements') {
      const cluster = clusterById.get(edge.target);
      if (!cluster) continue;
      push(clustersByImplementer, tool.id, cluster);
      push(implementersByCluster, cluster.id, tool);
    }
  }

  const scheduled = new Map<string, NeedNode[]>();
  for (const need of needs.values()) {
    for (const phase of parsePhases(need.phase) ?? []) push(scheduled, phase, need);
  }
  const needsByPhase: PhaseNeeds[] = [...scheduled.keys()]
    .sort()
    .map((phase) => ({ phase, needs: scheduled.get(phase) ?? [] }));

  const kindFamilyOf = familyOfValue(vocabulary.kind, 'kind');
  const gateFamilyOf = familyOfValue(vocabulary.gate, 'gate');
  const stepOrder = (decisionClass: string): number => DECISION_STEPS.indexOf(decisionStep(decisionClass));
  const filterValues: Readonly<Record<FilterName, readonly string[]>> = {
    decision: [...vocabulary.decision_class].sort((a, b) => stepOrder(a) - stepOrder(b)),
    kind: Object.keys(vocabulary.kind),
    used: roles,
    operated: roles,
    hosting: vocabulary.hosting,
    stream: vocabulary.stream,
    gate: Object.keys(vocabulary.gate),
  };
  const facets = new Map<string, Facets>();
  const facetsOf = (toolId: string): Facets => {
    const known = facets.get(toolId);
    if (known) return known;
    const tool = toolById.get(toolId);
    if (!tool) throw new Error(`The graph has no tool "${toolId}".`);
    const made: Facets = {
      decision: [tool.decision_class],
      kind: [kindFamilyOf(tool.kind)],
      used: tool.used_by,
      operated: tool.operated_by,
      hosting: [tool.hosting],
      stream: [tool.stream],
      gate: [gateFamilyOf(tool.gate)],
    };
    facets.set(toolId, made);
    return made;
  };
  /** The counts of one filter, made when the filter is first asked for. */
  const counts = new Map<FilterName, Map<string, number>>();
  const countsOf = (name: FilterName): Map<string, number> => {
    let made = counts.get(name);
    if (!made) {
      made = new Map();
      for (const tool of tools) {
        for (const value of facetsOf(tool.id)[name]) made.set(value, (made.get(value) ?? 0) + 1);
      }
      counts.set(name, made);
    }
    return made;
  };

  /** What a tool has for the lenses and the filters: its facets and the needs it serves. */
  const traits = new Map<string, Traits>();
  const traitsOf = (toolId: string): Traits => {
    let made = traits.get(toolId);
    if (!made) {
      const served = needsByTool.get(toolId) ?? [];
      made = {
        ...facetsOf(toolId),
        needs: served.map(({ need }) => need.id),
        bestFitFor: served.filter(({ bestFit }) => bestFit).map(({ need }) => need.id),
      };
      traits.set(toolId, made);
    }
    return made;
  };
  const idsWhere = (keep: (traits: Traits) => boolean): ReadonlySet<string> =>
    new Set(tools.filter((tool) => keep(traitsOf(tool.id))).map((tool) => tool.id));
  // The scene, the outline and the panels all ask for the same lens and filters after a change, so the last answers are kept.
  let reached: { lens: Lens | null; ids: ReadonlySet<string> } | null = null;
  const inReach = (lens: Lens | null): ReadonlySet<string> => {
    if (reached?.lens !== lens) reached = { lens, ids: idsWhere((each) => isInReach(lens, each)) };
    return reached.ids;
  };
  let shown: { state: Pick<MapState, 'lens' | 'filters'>; ids: ReadonlySet<string> } | null = null;
  const emphasised = (state: Pick<MapState, 'lens' | 'filters'>): ReadonlySet<string> => {
    if (shown?.state.lens !== state.lens || shown.state.filters !== state.filters) {
      shown = { state, ids: idsWhere((each) => isEmphasised(state, each)) };
    }
    return shown.ids;
  };

  // A trace has a few tools, so it is read from the need's own edges, and the last answer is kept as the others are.
  let lastTrace: { lens: Lens | null; traced: ReadonlySet<string>; bestFit: ReadonlySet<string> } | null = null;
  const trace = (lens: Lens | null): { traced: ReadonlySet<string>; bestFit: ReadonlySet<string> } => {
    if (lastTrace?.lens !== lens) {
      const serving = inGraphOrder(toolsByNeed.get(tracedNeedOf(lens) ?? '') ?? []);
      const idsOf = (keep: (traits: Traits) => boolean): ReadonlySet<string> =>
        new Set(serving.filter((tool) => keep(traitsOf(tool.id))).map((tool) => tool.id));
      lastTrace = {
        lens,
        traced: idsOf((each) => isTraced(lens, each)),
        bestFit: idsOf((each) => isBestFit(lens, each)),
      };
    }
    return lastTrace;
  };

  return {
    graph,
    tools,
    tiers,
    clustersOf: (tierId) => clustersByTier.get(tierId) ?? [],
    toolsOf: (clusterId) => toolsByCluster.get(clusterId) ?? [],
    toolCountOf(tierId, lens = null) {
      const held = toolsByTier.get(tierId) ?? [];
      if (lens === null) return held.length;
      const reach = inReach(lens);
      return held.filter((tool) => reach.has(tool.id)).length;
    },
    tier: (id) => tiers.find((tier) => tier.id === id),
    cluster: (id) => clusterById.get(id),
    tool: (id) => toolById.get(id),
    need: (id) => needs.get(id),
    serves: (toolId, needId) => traitsOf(toolId).needs.includes(needId),
    needsOf: (toolId) => needsByTool.get(toolId) ?? [],
    bestFitToolsOf: (needId) => inGraphOrder(bestFitByNeed.get(needId) ?? []),
    servingToolsOf: (needId) => inGraphOrder(toolsByNeed.get(needId) ?? []),
    needsByPhase,
    overlapOf(toolId) {
      const group = groupByTool.get(toolId);
      if (group === undefined) return undefined;
      const members = inGraphOrder(toolsByGroup.get(group) ?? []).filter((member) => member.id !== toolId);
      return { group, members };
    },
    implementsOf: (toolId) => clustersByImplementer.get(toolId) ?? [],
    implementedBy: (clusterId) => inGraphOrder(implementersByCluster.get(clusterId) ?? []),
    roleName: (code) => labels.get(`role:${code}`) ?? code,
    streamName: (code) => labels.get(`stream:${code}`) ?? code,
    kindFamilyOf,
    gateFamilyOf,
    filterValues: (name) => filterValues[name],
    facetsOf,
    toolCountWith: (name, value) => countsOf(name).get(value) ?? 0,
    inReach,
    emphasised,
    traced: (lens) => trace(lens).traced,
    bestFit: (lens) => trace(lens).bestFit,
  };
}
