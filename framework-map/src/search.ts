/**
 * search: the index and its results.
 *
 * MiniSearch over tool names and capabilities, cluster names and need names.
 * It knows nothing of the page; src/search-box.ts shows what it finds.
 */
import MiniSearch from 'minisearch';

/** What the search reads of the framework. */
export interface Searchable {
  tools: readonly { id: string; label: string; capability: string }[];
  clusters: readonly { id: string; label: string }[];
  needs: readonly { id: string; label: string }[];
}

/** The ids of what a query found, best match first within each group. */
export interface SearchResults {
  tools: string[];
  clusters: string[];
  needs: string[];
}

export type Search = (query: string) => SearchResults;

type Group = keyof SearchResults;

interface Entry {
  id: string;
  group: Group;
  name: string;
  capability?: string;
}

export function createSearch(source: Searchable): Search {
  const engine = new MiniSearch<Entry>({
    fields: ['name', 'capability'],
    storeFields: ['group'],
    searchOptions: {
      // The first letters of a word find it, and so does a typo of one letter in five.
      prefix: true,
      fuzzy: 0.2,
      // Every word of the query must match, so a second word narrows the results.
      combineWith: 'AND',
      boost: { name: 3 },
    },
  });
  engine.addAll([
    ...source.tools.map((tool): Entry => ({ id: tool.id, group: 'tools', name: tool.label, capability: tool.capability })),
    ...source.clusters.map((cluster): Entry => ({ id: cluster.id, group: 'clusters', name: cluster.label })),
    ...source.needs.map((need): Entry => ({ id: need.id, group: 'needs', name: need.label })),
  ]);

  return (query) => {
    const results: SearchResults = { tools: [], clusters: [], needs: [] };
    for (const hit of engine.search(query)) results[hit.group as Group].push(hit.id as string);
    return results;
  };
}
