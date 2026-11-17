import { describe, expect, it } from 'vitest';
import {
  AT_STACK,
  FILTER_NAMES,
  NO_FILTERS,
  clearFilters,
  createStore,
  focusCluster,
  focusTier,
  fromFragment,
  isFiltered,
  passes,
  select,
  setFilter,
  stepBack,
  stepOut,
  toFragment,
  toggleFilter,
} from './state';
import type { Facets, FilterName, Filters, MapState, Places } from './state';

/** Two tiers; T1 holds the clusters 1A and 1B, T0 holds 0A. */
const clusters: Record<string, { id: string; tier: string }> = {
  '1A': { id: '1A', tier: 'T1' },
  '1B': { id: '1B', tier: 'T1' },
  '0A': { id: '0A', tier: 'T0' },
};
/** The tool "tool:a" lies in 1A and "tool:b" in 0A; the graph has one need, N1. */
const tools: Record<string, { id: string; cluster: string }> = {
  'tool:a': { id: 'tool:a', cluster: '1A' },
  'tool:b': { id: 'tool:b', cluster: '0A' },
};
/** The values each filter lists, in the order it lists them. */
const filterValues: Record<FilterName, readonly string[]> = {
  decision: ['Core v1', 'Core later', 'Build', 'Optional / benchmark'],
  kind: ['Skill or command', 'Plug-in, subagent or hook', 'Model'],
  used: ['A', 'D', 'M'],
  operated: ['A', 'D', 'M'],
  hosting: ['Hub', 'Cloud'],
  stream: ['OS', 'Build'],
  gate: ['None', 'Guarded'],
};
const places: Places = {
  filterValues: (name) => filterValues[name],
  tier: (id) => (['T0', 'T1'].includes(id) ? { id } : undefined),
  cluster: (id) => (Object.hasOwn(clusters, id) ? clusters[id] : undefined),
  tool: (id) => (Object.hasOwn(tools, id) ? tools[id] : undefined),
  need: (id) => (id === 'N1' ? { id } : undefined),
};

const atTier = (tier: string): MapState => ({ distance: 'tier', tier, cluster: null, selection: null, filters: NO_FILTERS });
const atCluster = (tier: string, cluster: string): MapState => ({
  distance: 'cluster',
  tier,
  cluster,
  selection: null,
  filters: NO_FILTERS,
});
const withTool = (tier: string, cluster: string, id: string): MapState => ({
  ...atCluster(tier, cluster),
  selection: { type: 'tool', id },
});

describe('moving between the distances', () => {
  it('goes from the stack to a tier', () => {
    expect(focusTier(AT_STACK, places, 'T1')).toEqual(atTier('T1'));
  });

  it('goes from one tier to another', () => {
    expect(focusTier(atTier('T1'), places, 'T0')).toEqual(atTier('T0'));
  });

  it('goes from a tier to one of its clusters', () => {
    expect(focusCluster(atTier('T1'), places, '1B')).toEqual(atCluster('T1', '1B'));
  });

  it("goes straight from the stack to a cluster, and focuses the cluster's tier with it", () => {
    expect(focusCluster(AT_STACK, places, '0A')).toEqual(atCluster('T0', '0A'));
  });

  it('goes from a cluster to a cluster of another tier', () => {
    expect(focusCluster(atCluster('T1', '1A'), places, '0A')).toEqual(atCluster('T0', '0A'));
  });

  it('goes from a cluster back to its tier, and drops the cluster', () => {
    expect(focusTier(atCluster('T1', '1A'), places, 'T1')).toEqual(atTier('T1'));
  });

  it('stays where it is for a tier or cluster the graph does not have', () => {
    expect(focusTier(atTier('T1'), places, 'T9')).toEqual(atTier('T1'));
    expect(focusCluster(atTier('T1'), places, '9Z')).toEqual(atTier('T1'));
    expect(focusTier(AT_STACK, places, '1A')).toEqual(AT_STACK);
  });
});

describe('selecting', () => {
  it("selects a tool and goes to its cluster, from anywhere", () => {
    expect(select(AT_STACK, places, 'tool:a')).toEqual(withTool('T1', '1A', 'tool:a'));
    expect(select(atCluster('T1', '1B'), places, 'tool:b')).toEqual(withTool('T0', '0A', 'tool:b'));
  });

  it('selects a cluster and goes to it', () => {
    expect(select(atTier('T1'), places, '1B')).toEqual({
      ...atCluster('T1', '1B'),
      selection: { type: 'cluster', id: '1B' },
    });
  });

  it('selects a need and leaves the map where it is', () => {
    expect(select(atTier('T1'), places, 'N1')).toEqual({ ...atTier('T1'), selection: { type: 'need', id: 'N1' } });
    expect(select(withTool('T1', '1A', 'tool:a'), places, 'N1')).toEqual({
      ...atCluster('T1', '1A'),
      selection: { type: 'need', id: 'N1' },
    });
  });

  it('moves from one selection to another', () => {
    expect(select(withTool('T1', '1A', 'tool:a'), places, 'tool:b')).toEqual(withTool('T0', '0A', 'tool:b'));
  });

  it('keeps the selection for an id the graph does not have, or one that is only a tier', () => {
    const selected = withTool('T1', '1A', 'tool:a');
    expect(select(selected, places, 'tool:zz')).toEqual(selected);
    expect(select(selected, places, 'T0')).toEqual(selected);
  });

  it('drops the selection when the partner goes somewhere else', () => {
    const selected = withTool('T1', '1A', 'tool:a');
    expect(focusTier(selected, places, 'T0')).toEqual(atTier('T0'));
    expect(focusCluster(selected, places, '1A')).toEqual(atCluster('T1', '1A'));
    expect(stepOut(selected)).toEqual(atTier('T1'));
  });
});

describe('stepping back with Escape', () => {
  it('closes the detail card first, and stays at the same distance', () => {
    expect(stepBack(withTool('T1', '1A', 'tool:a'))).toEqual(atCluster('T1', '1A'));
  });

  it('steps out one distance once nothing is selected', () => {
    expect(stepBack(atCluster('T1', '1A'))).toEqual(atTier('T1'));
    expect(stepBack(AT_STACK)).toEqual(AT_STACK);
  });
});

describe('stepping out', () => {
  it('steps from a cluster out to its tier', () => {
    expect(stepOut(atCluster('T1', '1A'))).toEqual(atTier('T1'));
  });

  it('steps from a tier out to the stack', () => {
    expect(stepOut(atTier('T1'))).toEqual(AT_STACK);
  });

  it('stays at the stack', () => {
    expect(stepOut(AT_STACK)).toEqual(AT_STACK);
  });

  it('takes two steps from a cluster to the stack', () => {
    expect(stepOut(stepOut(atCluster('T0', '0A')))).toEqual(AT_STACK);
  });
});

/** A skill on the Hub that the Architect and the Designer use; the Architect operates it. */
const skill: Facets = {
  decision: ['Core v1'],
  kind: ['Skill or command'],
  used: ['A', 'D'],
  operated: ['A'],
  hosting: ['Hub'],
  stream: ['OS'],
  gate: ['None'],
};
/** An optional model in the cloud that only the Analyst uses. */
const model: Facets = {
  decision: ['Optional / benchmark'],
  kind: ['Model'],
  used: ['M'],
  operated: ['A'],
  hosting: ['Cloud'],
  stream: ['Build'],
  gate: ['Guarded'],
};
const filtersOf = (state: MapState): Filters => state.filters;
const choose = (...choices: [FilterName, string][]): MapState =>
  choices.reduce((state, [name, value]) => toggleFilter(state, places, name, value), AT_STACK);

describe('filtering', () => {
  it('lets every tool pass while no filter has a value chosen', () => {
    expect(passes(NO_FILTERS, skill)).toBe(true);
    expect(isFiltered(NO_FILTERS)).toBe(false);
  });

  it('passes a tool that has either of two values chosen in one filter', () => {
    const filters = filtersOf(choose(['kind', 'Skill or command'], ['kind', 'Model']));
    expect(passes(filters, skill)).toBe(true);
    expect(passes(filters, model)).toBe(true);
    expect(passes(filtersOf(choose(['kind', 'Model'])), skill)).toBe(false);
  });
});

describe('filtering across filters, and clearing', () => {
  it('passes only a tool that passes every filter with a value chosen', () => {
    const filters = filtersOf(choose(['kind', 'Skill or command'], ['kind', 'Model'], ['hosting', 'Hub']));
    expect(passes(filters, skill)).toBe(true);
    expect(passes(filters, model)).toBe(false);
  });

  it('passes a tool that one of the chosen roles uses, among the roles that use it', () => {
    expect(passes(filtersOf(choose(['used', 'D'])), skill)).toBe(true);
    expect(passes(filtersOf(choose(['used', 'D'])), model)).toBe(false);
    expect(passes(filtersOf(choose(['used', 'D'], ['operated', 'D'])), skill)).toBe(false);
  });

  it('takes a chosen value out when it is chosen again', () => {
    const state = toggleFilter(choose(['kind', 'Model'], ['hosting', 'Hub']), places, 'kind', 'Model');
    expect(state.filters).toEqual({ ...NO_FILTERS, hosting: ['Hub'] });
  });

  it('keeps the chosen values in the order the filter lists them, whatever order they were chosen in', () => {
    expect(choose(['used', 'M'], ['used', 'A']).filters.used).toEqual(['A', 'M']);
  });

  it('ignores a value the filter does not list', () => {
    expect(choose(['hosting', 'Moon'])).toEqual(AT_STACK);
    expect(setFilter(AT_STACK, places, 'decision', ['Build', 'Nonsense', 'Core v1']).filters.decision).toEqual([
      'Core v1',
      'Build',
    ]);
  });

  it('clears every filter at once, and leaves the place and the selection', () => {
    const selected = select(choose(['kind', 'Model'], ['used', 'A'], ['gate', 'Guarded']), places, 'tool:a');
    expect(isFiltered(selected.filters)).toBe(true);
    expect(clearFilters(selected)).toEqual(withTool('T1', '1A', 'tool:a'));
  });

  it('keeps the filters wherever the map goes', () => {
    const filtered = choose(['hosting', 'Cloud']);
    const hosting = { ...NO_FILTERS, hosting: ['Cloud'] };
    expect(focusTier(filtered, places, 'T1')).toEqual({ ...atTier('T1'), filters: hosting });
    expect(select(filtered, places, 'tool:a')).toEqual({ ...withTool('T1', '1A', 'tool:a'), filters: hosting });
    expect(stepOut(focusTier(filtered, places, 'T1'))).toEqual({ ...AT_STACK, filters: hosting });
    expect(stepBack(select(filtered, places, 'tool:a'))).toEqual({ ...atCluster('T1', '1A'), filters: hosting });
  });
});

describe('the URL fragment', () => {
  it.each([
    ['the stack', AT_STACK, ''],
    ['a tier', atTier('T1'), 'tier=T1'],
    ['a cluster', atCluster('T1', '1B'), 'cluster=1B'],
    ['a selected tool', withTool('T1', '1A', 'tool:a'), 'cluster=1A&select=tool:a'],
    ['a selected need', { ...atTier('T0'), selection: { type: 'need', id: 'N1' } } as MapState, 'tier=T0&select=N1'],
  ])('writes %s', (_name, state, fragment) => {
    expect(toFragment(state)).toBe(fragment);
  });

  it.each<MapState>([
    AT_STACK,
    atTier('T0'),
    atCluster('T1', '1B'),
    withTool('T0', '0A', 'tool:b'),
    { ...atCluster('T1', '1B'), selection: { type: 'cluster', id: '1B' } },
    { ...AT_STACK, selection: { type: 'need', id: 'N1' } },
    { ...atCluster('T1', '1A'), selection: { type: 'need', id: 'N1' } },
  ])('reads back what it wrote: %o', (state) => {
    expect(fromFragment(toFragment(state), places)).toEqual(state);
  });

  it('reads a fragment with or without its leading "#"', () => {
    expect(fromFragment('#tier=T1', places)).toEqual(atTier('T1'));
  });

  it('falls back to the stack for an id the graph does not have, or a fragment it cannot read', () => {
    expect(fromFragment('tier=T9', places)).toEqual(AT_STACK);
    expect(fromFragment('cluster=9Z', places)).toEqual(AT_STACK);
    expect(fromFragment('something else', places)).toEqual(AT_STACK);
  });

  it('falls back to the stack when the selection it names is not in the graph', () => {
    expect(fromFragment('cluster=1A&select=tool:zz', places)).toEqual(AT_STACK);
    expect(fromFragment('select=T1', places)).toEqual(AT_STACK);
  });

  it("goes to a selected tool's cluster, whatever place the fragment names beside it", () => {
    expect(fromFragment('select=tool:a', places)).toEqual(withTool('T1', '1A', 'tool:a'));
    expect(fromFragment('tier=T0&select=tool:a', places)).toEqual(withTool('T1', '1A', 'tool:a'));
  });

  it('keeps the parts of the current fragment that it does not own', () => {
    expect(toFragment(atTier('T0'), '#lens=role&cluster=0A')).toBe('lens=role&tier=T0');
    expect(toFragment(AT_STACK, 'lens=role&tier=T0')).toBe('lens=role');
    expect(toFragment(AT_STACK, '#tier=T9')).toBe('');
    expect(toFragment(atTier('T0'), 'lens=role&cluster=1A&select=tool:a')).toBe('lens=role&tier=T0');
    expect(toFragment(withTool('T1', '1A', 'tool:a'), 'filter=a%3Ab')).toBe('filter=a%3Ab&cluster=1A&select=tool:a');
  });

  it('writes each chosen value of a filter under the name of the filter', () => {
    expect(toFragment(choose(['decision', 'Core v1'], ['decision', 'Build'], ['used', 'D']))).toBe(
      'decision=Core+v1&decision=Build&used=D',
    );
    expect(toFragment(select(choose(['hosting', 'Hub']), places, 'tool:a'))).toBe(
      'cluster=1A&select=tool:a&hosting=Hub',
    );
  });

  it.each<[string, MapState]>([
    ['one value', choose(['hosting', 'Cloud'])],
    ['two values of one filter', choose(['kind', 'Model'], ['kind', 'Plug-in, subagent or hook'])],
    ['a value with a slash in it', choose(['decision', 'Optional / benchmark'])],
    ['every filter at once', FILTER_NAMES.reduce((state, name) => toggleFilter(state, places, name, filterValues[name][1]!), AT_STACK)],
    ['filters beside a selected tool', select(choose(['stream', 'Build'], ['gate', 'Guarded']), places, 'tool:b')],
    ['filters at a tier', focusTier(choose(['operated', 'M']), places, 'T0')],
  ])('reads back the filters it wrote: %s', (_name, state) => {
    expect(isFiltered(state.filters)).toBe(true);
    expect(fromFragment(toFragment(state), places)).toEqual(state);
  });

  it('leaves out a filter value the filter does not list, and keeps the rest', () => {
    expect(fromFragment('hosting=Moon&hosting=Hub&tier=T1', places)).toEqual({
      ...atTier('T1'),
      filters: { ...NO_FILTERS, hosting: ['Hub'] },
    });
  });

  it('keeps the filters when the place or the selection it names is not in the graph', () => {
    expect(fromFragment('tier=T9&used=A', places)).toEqual({ ...AT_STACK, filters: { ...NO_FILTERS, used: ['A'] } });
  });

  it('drops a cleared filter from the fragment', () => {
    expect(toFragment(clearFilters(choose(['used', 'A'])), 'used=A&tier=T1')).toBe('');
  });

  it('reads its own part of a fragment that holds other parts too', () => {
    expect(fromFragment('lens=role&cluster=0A', places)).toEqual(atCluster('T0', '0A'));
  });
});

describe('the store', () => {
  it('holds the state and tells its subscribers when it changes', () => {
    const store = createStore(places);
    const seen: MapState[] = [];
    store.subscribe((state) => seen.push(state));

    store.focusTier('T1');
    store.focusCluster('1A');
    store.stepOut();
    store.focusStack();

    expect(seen).toEqual([atTier('T1'), atCluster('T1', '1A'), atTier('T1'), AT_STACK]);
    expect(store.get()).toEqual(AT_STACK);
  });

  it('selects, closes the detail card and steps back, and hands each subscriber the state before', () => {
    const store = createStore(places);
    const seen: [MapState, MapState][] = [];
    store.subscribe((state, before) => seen.push([state, before]));

    store.select('tool:a');
    store.select('tool:a');
    store.clearSelection();
    store.select('N1');
    store.stepBack();
    store.stepBack();

    const need: MapState = { ...atCluster('T1', '1A'), selection: { type: 'need', id: 'N1' } };
    expect(seen).toEqual([
      [withTool('T1', '1A', 'tool:a'), AT_STACK],
      [atCluster('T1', '1A'), withTool('T1', '1A', 'tool:a')],
      [need, atCluster('T1', '1A')],
      [atCluster('T1', '1A'), need],
      [atTier('T1'), atCluster('T1', '1A')],
    ]);
  });

  it('filters, and keeps the filters when the partner goes back to the stack', () => {
    const store = createStore(places);
    const seen: MapState[] = [];
    store.subscribe((state) => seen.push(state));

    store.toggleFilter('used', 'D');
    store.focusTier('T1');
    store.focusStack();
    store.setFilter('decision', ['Core v1', 'Build']);
    store.clearFilters();
    store.clearFilters();

    const used = { ...NO_FILTERS, used: ['D'] };
    expect(seen).toEqual([
      { ...AT_STACK, filters: used },
      { ...atTier('T1'), filters: used },
      { ...AT_STACK, filters: used },
      { ...AT_STACK, filters: { ...used, decision: ['Core v1', 'Build'] } },
      AT_STACK,
    ]);
  });

  it('says nothing when a change leaves the state as it was', () => {
    const store = createStore(places, atTier('T1'));
    let calls = 0;
    store.subscribe(() => (calls += 1));

    store.focusTier('T1');
    store.focusTier('T9');
    store.set(atTier('T1'));
    store.toggleFilter('hosting', 'Moon');
    store.setFilter('kind', []);

    expect(calls).toBe(0);
  });

  it('stops telling a subscriber that has unsubscribed', () => {
    const store = createStore(places);
    let calls = 0;
    const unsubscribe = store.subscribe(() => (calls += 1));
    store.focusTier('T1');
    unsubscribe();
    store.focusTier('T0');
    expect(calls).toBe(1);
  });
});
