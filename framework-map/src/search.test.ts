import { describe, expect, it } from 'vitest';
import { createSearch } from './search';

/** A small framework: three tools, two clusters and two needs. */
const search = createSearch({
  tools: [
    { id: 'tool:serena', label: 'Serena', capability: 'Semantic code retrieval and editing over language servers' },
    { id: 'tool:floorplan', label: 'Floorplan', capability: 'Draws a plan of a codebase' },
    { id: 'tool:dagster', label: 'Dagster', capability: 'Orchestrates data pipelines' },
  ],
  clusters: [
    { id: '4A', label: 'Engineering graph and code intelligence' },
    { id: '3B', label: 'Data pipelines' },
  ],
  needs: [
    { id: 'N01', label: 'Semantic layer for metrics' },
    { id: 'N02', label: 'Blast-radius classification of changes' },
  ],
});

describe('searching the framework', () => {
  it('finds a tool by its name', () => {
    expect(search('serena').tools).toEqual(['tool:serena']);
  });

  it('finds a tool by a word of its capability', () => {
    expect(search('orchestrates').tools).toEqual(['tool:dagster']);
  });

  it('groups what it finds as tools, clusters and needs', () => {
    expect(search('pipelines')).toEqual({ tools: ['tool:dagster'], clusters: ['3B'], needs: [] });
    expect(search('semantic')).toEqual({ tools: ['tool:serena'], clusters: [], needs: ['N01'] });
  });

  it('tolerates a small typo', () => {
    expect(search('serana').tools).toEqual(['tool:serena']);
    expect(search('piplines').clusters).toEqual(['3B']);
  });

  it('finds a word from its first letters, as the partner types', () => {
    expect(search('floor').tools).toEqual(['tool:floorplan']);
  });

  it('asks for every word of the query', () => {
    expect(search('code plan').tools).toEqual(['tool:floorplan']);
  });

  it('puts a match on a name before a match on a capability', () => {
    const found = createSearch({
      tools: [
        { id: 'tool:helper', label: 'Helper', capability: 'Works beside Serena' },
        { id: 'tool:serena', label: 'Serena', capability: 'Semantic code retrieval' },
      ],
      clusters: [],
      needs: [],
    });
    expect(found('serena').tools).toEqual(['tool:serena', 'tool:helper']);
  });

  it('finds nothing for a word the framework lacks, and for an empty query', () => {
    const nothing = { tools: [], clusters: [], needs: [] };
    expect(search('zeppelin')).toEqual(nothing);
    expect(search('')).toEqual(nothing);
    expect(search('   ')).toEqual(nothing);
  });
});
