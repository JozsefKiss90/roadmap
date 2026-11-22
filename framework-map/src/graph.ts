/**
 * graph: the shape of the graph JSON in ../tool-discovery.
 *
 * These types describe a graph that has passed the validator. The build runs
 * the validator before it bundles the JSON, so the map can rely on them.
 */

/** A role's code in the data: Architect, Designer, Analyst or Trader. */
export type RoleCode = 'A' | 'D' | 'M' | 'T';

export interface RootNode {
  id: 'root';
  type: 'root';
  label: string;
}

/** A role, value stream or phase: a node that carries only a label. */
export interface LabelNode {
  id: string;
  type: 'role' | 'stream' | 'phase';
  label: string;
}

export interface TierNode {
  id: string;
  type: 'tier';
  label: string;
  description: string;
  layout: { z: number };
}

export interface ClusterNode {
  id: string;
  type: 'cluster';
  label: string;
  tier: string;
  operated_by: RoleCode[];
  used_by: RoleCode[];
  hosting: string;
  stream: string;
  gate: string;
  /** How many tools name this cluster. */
  tools: number;
  /** `sector` is the cluster's order on its plate (ADR 0002); nothing else here is used. */
  layout: { z: number; sector: number; sectors: number };
}

export interface ToolNode {
  id: string;
  type: 'tool';
  label: string;
  tier: string;
  cluster: string;
  kind: string;
  capability: string;
  decision_class: string;
  /** The decision as first recorded, before it was sorted into a decision class. */
  decision: string;
  decision_source: string;
  best_fit: boolean;
  operated_by: RoleCode[];
  used_by: RoleCode[];
  hosting: string;
  stream: string;
  gate: string;
  origin: string;
  repo: string | null;
  url: string | null;
  stars: number | null;
  last_commit: string | null;
  licence: string | null;
  verification: string;
  note: string | null;
  size: number;
}

export interface NeedNode {
  id: string;
  type: 'need';
  label: string;
  domain: string;
  /** One or more phases, such as "P2", "P2-P3" or "P1, P3". Read it with parsePhases. */
  phase: string;
  verdict: string;
  lead_role: RoleCode;
  home_cluster: string;
  approach: string;
  gap: string;
  source: string;
}

export type GraphNode = RootNode | LabelNode | TierNode | ClusterNode | ToolNode | NeedNode;

export type EdgeType =
  | 'contains'
  | 'homed_in'
  | 'implements'
  | 'operates'
  | 'overlaps'
  | 'scheduled_in'
  | 'serves'
  | 'serves_stream'
  | 'uses';

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  /** On `serves` edges only. */
  best_fit?: boolean;
  /** On `overlaps` edges only: the overlap group's name. */
  group?: string;
}

export interface GraphMeta {
  title: string;
  /** The data date, as YYYY-MM-DD. */
  generated: string;
  note: string;
  counts: { tools: number; clusters: number; tiers: number; needs: number; edges: number };
}

export interface Graph {
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
