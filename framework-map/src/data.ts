/**
 * data: loads, validates and indexes the graph.
 *
 * Validation happens in the build, not in the page: scripts/validate-graph.ts
 * runs src/validate.ts on the graph JSON before the JSON is bundled, so the
 * page can trust what it loads. The JSON is imported as text, so the build
 * inlines it as one string and the type checker does not have to infer a type
 * for 863 nodes.
 */
import graphText from '../../tool-discovery/tool-framework.graph.json?raw';
import type { Graph } from './graph';

export function loadGraph(): Graph {
  return JSON.parse(graphText) as Graph;
}
