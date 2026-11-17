/**
 * data: loads, validates and indexes the graph.
 *
 * For now it only carries the graph JSON into the built file. The JSON is
 * imported as text, so the build inlines it as one string and the type checker
 * does not have to infer a type for 863 nodes.
 */
import graphText from '../../tool-discovery/tool-framework.graph.json?raw';

export function parseGraph(): unknown {
  return JSON.parse(graphText);
}
