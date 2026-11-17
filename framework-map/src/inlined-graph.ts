/**
 * The graph and the vocabulary file as the build inlines them in the page.
 *
 * Both are imported as text, so each is inlined as one string and the type
 * checker does not have to infer a type for 863 nodes.
 */
import graphText from '../../tool-discovery/tool-framework.graph.json?raw';
import vocabularyText from '../../tool-discovery/vocabulary.json?raw';
import { readGraph } from './data';
import type { GraphIndex } from './data';
import type { Vocabulary } from './validate';

export const vocabulary = JSON.parse(vocabularyText) as Vocabulary;

/** Reads the inlined graph. Throws GraphRejected if the validator rejects it. */
export function loadGraph(): GraphIndex {
  return readGraph(JSON.parse(graphText), vocabulary);
}
