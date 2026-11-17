import { describe, expect, it } from 'vitest';
import {
  AT_STACK,
  FILTER_NAMES,
  NO_FILTERS,
  bestFit,
  clearFilters,
  clearLens,
  createStore,
  emphasised,
  focusCluster,
  focusTier,
  fromFragment,
  inReach,
  isFiltered,
  narrows,
  passes,
  select,
  setFilter,
  showNeedTrace,
  showPhaseScrub,
  showRoleLens,
  stepBack,
  stepOut,
  toFragment,
  toggleFilter,
  traced,
  traces,
} from './state';
import type { FilterName, Filters, MapState, Places, Traits } from './state';

/** Two tiers; T1 holds the clusters 1A and 1B, T0 holds 0A. */
const clusters: Record<string, { id: string; tier: string }> = {
  '1A': { id: '1A', tier: 'T1' },
  '1B': { id: '1B', tier: 'T1' },
  '0A': { id: '0A', tier: 'T0' },
};
/**
 * The tool "tool:a" lies in 1A and "tool:b" in 0A; the graph has two needs, N1 and N2. Only "tool:a" serves a need: N1.
 * N1 is scheduled in the range "P1-P3" and N2 in the two separate phases "P0, P4".
 */
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
  need: (id) => (['N1', 'N2'].includes(id) ? { id } : undefined),
  serves: (tool, need) => tool === 'tool:a' && need === 'N1',
  phases: ['P0', 'P1', 'P2', 'P3', 'P4'],
  scheduled: (tool, phase) => tool === 'tool:a' && ['P1', 'P2', 'P3'].includes(phase),
};

const atTier = (tier: string): MapState => ({ distance: 'tier', tier, cluster: null, selection: null, filters: NO_FILTERS, lens: null });
const atCluster = (tier: string, cluster: string): MapState => ({
  distance: 'cluster',
  tier,
  cluster,
  selection: null,
  filters: NO_FILTERS,
  lens: null,
});
const withTool = (tier: string, cluster: string, id: string): MapState => ({
  ...atCluster(tier, cluster),
  selection: { type: 'tool', id },
});
/** The need trace for one need, as choosing the need leaves it: at the stack, with the need's detail card open. */
const traceOf = (need: string): MapState => ({
  ...AT_STACK,
  selection: { type: 'need', id: need },
  lens: { type: 'need', need },
});
/** The need trace with no need chosen yet. */
const TRACE_UNCHOSEN: MapState = { ...AT_STACK, lens: { type: 'need', need: null } };

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

  it('selects a need by starting its trace, at the stack', () => {
    expect(select(atTier('T1'), places, 'N1')).toEqual(traceOf('N1'));
    expect(select(withTool('T1', '1A', 'tool:a'), places, 'N1')).toEqual(traceOf('N1'));
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

/** A skill on the Hub that the Architect and the Designer use; the Architect operates it. It is a best fit for the need N1. */
const skill: Traits = {
  decision: ['Core v1'],
  kind: ['Skill or command'],
  used: ['A', 'D'],
  operated: ['A'],
  hosting: ['Hub'],
  stream: ['OS'],
  gate: ['None'],
  needs: ['N1'],
  bestFitFor: ['N1'],
  phases: ['P1', 'P2', 'P3'],
};
/** An optional model in the cloud that only the Analyst uses. It serves the need N1, and it alone serves N2. */
const model: Traits = {
  decision: ['Optional / benchmark'],
  kind: ['Model'],
  used: ['M'],
  operated: ['A'],
  hosting: ['Cloud'],
  stream: ['Build'],
  gate: ['Guarded'],
  needs: ['N1', 'N2'],
  bestFitFor: ['N2'],
  phases: ['P0', 'P1', 'P2', 'P3', 'P4'],
};
/** A ruleset on the Hub that only the Designer uses; the Architect operates it. It serves no need. */
const ruleset: Traits = { ...skill, used: ['D'], needs: [], bestFitFor: [], phases: [] };
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

/** The role lens for one role, at the stack. */
const lensOf = (role: string): MapState => ({ ...AT_STACK, lens: { type: 'role', role } });

describe('the role lens', () => {
  it('shows no lens until one is switched on, and every tool is at full strength', () => {
    expect(AT_STACK.lens).toBeNull();
    expect(emphasised(AT_STACK, skill)).toBe(true);
    expect(emphasised(AT_STACK, model)).toBe(true);
  });

  it.each([
    ['A', { skill: true, ruleset: false, model: false }],
    ['D', { skill: true, ruleset: true, model: false }],
    ['M', { skill: false, ruleset: false, model: true }],
  ])('brings forward the tools that role %s uses, and fades the rest', (role, inReach) => {
    const state = showRoleLens(AT_STACK, places, role);
    expect(state).toEqual(lensOf(role));
    expect({
      skill: emphasised(state, skill),
      ruleset: emphasised(state, ruleset),
      model: emphasised(state, model),
    }).toEqual(inReach);
  });

  it('means "used by" only: a tool the role operates but does not use is faded', () => {
    expect(model.operated).toEqual(['A']);
    expect(emphasised(lensOf('A'), model)).toBe(false);
  });

  it('starts with the first role when none is named', () => {
    expect(showRoleLens(AT_STACK, places)).toEqual(lensOf('A'));
  });

  it('shows one role at a time: another role takes the place of the first', () => {
    const state = showRoleLens(lensOf('D'), places, 'M');
    expect(state).toEqual(lensOf('M'));
    expect(emphasised(state, skill)).toBe(false);
  });

  it('keeps the lens it has for a role the graph does not have', () => {
    expect(showRoleLens(AT_STACK, places, 'Z')).toEqual(AT_STACK);
    expect(showRoleLens(lensOf('D'), places, 'Z')).toEqual(lensOf('D'));
  });

  it('brings every tool back when the lens is switched off', () => {
    const state = clearLens(lensOf('M'));
    expect(state).toEqual(AT_STACK);
    expect(emphasised(state, skill)).toBe(true);
  });

  it('applies the filters on top of the lens: a tool is at full strength only in reach and passing', () => {
    const cloud = toggleFilter(lensOf('M'), places, 'hosting', 'Cloud');
    expect(emphasised(cloud, model)).toBe(true);
    const hub = toggleFilter(lensOf('M'), places, 'hosting', 'Hub');
    expect(emphasised(hub, model)).toBe(false);
    expect(emphasised(hub, skill)).toBe(false);
    expect(emphasised(clearLens(hub), skill)).toBe(true);
  });

  it('keeps the lens wherever the map goes, and when the filters are cleared', () => {
    const lens = { type: 'role', role: 'D' };
    expect(focusTier(lensOf('D'), places, 'T1')).toEqual({ ...atTier('T1'), lens });
    expect(select(lensOf('D'), places, 'tool:a')).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens });
    expect(stepOut(focusTier(lensOf('D'), places, 'T1'))).toEqual(lensOf('D'));
    expect(stepBack(select(lensOf('D'), places, 'tool:a'))).toEqual({ ...atCluster('T1', '1A'), lens });
    expect(clearFilters(toggleFilter(lensOf('D'), places, 'hosting', 'Hub'))).toEqual(lensOf('D'));
  });

  it('keeps the place, the selection and the filters when the lens changes', () => {
    const selected = select(choose(['hosting', 'Hub']), places, 'tool:a');
    const withLens = showRoleLens(selected, places, 'D');
    expect(withLens).toEqual({ ...selected, lens: { type: 'role', role: 'D' } });
    expect(clearLens(withLens)).toEqual(selected);
  });
});

describe('the need trace', () => {
  /** What the skill, the ruleset and the model are under a state, in that order. */
  const sets = (state: MapState) => ({
    traced: [skill, ruleset, model].map((tool) => traced(state.lens, tool)),
    bestFit: [skill, ruleset, model].map((tool) => bestFit(state.lens, tool)),
    emphasised: [skill, ruleset, model].map((tool) => emphasised(state, tool)),
  });

  it('is on with no need chosen until the partner picks one, and leaves every tool as it was', () => {
    const state = showNeedTrace(atTier('T1'), places);
    expect(state).toEqual({ ...atTier('T1'), lens: { type: 'need', need: null } });
    expect(narrows(state.lens)).toBe(false);
    expect(sets(state)).toEqual({
      traced: [false, false, false],
      bestFit: [false, false, false],
      emphasised: [true, true, true],
    });
  });

  it('traces the tools that serve the chosen need, marks its best fits, and fades the rest', () => {
    const state = select(TRACE_UNCHOSEN, places, 'N1');
    expect(state).toEqual(traceOf('N1'));
    expect(narrows(state.lens)).toBe(true);
    expect(sets(state)).toEqual({
      traced: [true, false, true],
      bestFit: [true, false, false],
      emphasised: [true, false, true],
    });
  });

  it('traces a need that a single tool serves', () => {
    expect(sets(traceOf('N2'))).toEqual({
      traced: [false, false, true],
      bestFit: [false, false, true],
      emphasised: [false, false, true],
    });
  });

  it('shows one need at a time: another need takes the place of the first, with its detail card', () => {
    const state = select(traceOf('N1'), places, 'N2');
    expect(state).toEqual(traceOf('N2'));
    expect(traced(state.lens, skill)).toBe(false);
  });

  it('goes to the stack when a need is chosen, so that the whole trace can be seen', () => {
    expect(select(withTool('T1', '1A', 'tool:a'), places, 'N1')).toEqual(traceOf('N1'));
  });

  it('switches on for a need without choosing it: the place and a selected tool stay, as under the other lenses', () => {
    const lens = { type: 'need', need: 'N1' };
    expect(showNeedTrace(withTool('T1', '1A', 'tool:a'), places, 'N1')).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens });
    expect(showNeedTrace(focusTier(lensOf('D'), places, 'T1'), places, 'N1')).toEqual({ ...atTier('T1'), lens });
  });

  it('keeps what it shows for a need the graph does not have', () => {
    expect(showNeedTrace(atTier('T1'), places, 'N9')).toEqual(atTier('T1'));
    expect(showNeedTrace(traceOf('N1'), places, 'N9')).toEqual(traceOf('N1'));
  });

  it('keeps the need it shows, and its detail card, when it is switched on again', () => {
    expect(showNeedTrace(traceOf('N1'), places)).toEqual(traceOf('N1'));
    expect(showNeedTrace(traceOf('N1'), places, 'N1')).toEqual(traceOf('N1'));
    const tool = select(traceOf('N1'), places, 'tool:a');
    expect(showNeedTrace(tool, places)).toBe(tool);
  });

  it('closes the detail card of a need when the trace is switched to another need without choosing it', () => {
    expect(showNeedTrace(traceOf('N1'), places, 'N2')).toEqual({ ...AT_STACK, lens: { type: 'need', need: 'N2' } });
  });

  it('keeps the same lens when the need it traces is chosen again, so that nothing is drawn anew', () => {
    const closed = stepBack(traceOf('N1'));
    expect(select(closed, places, 'N1').lens).toBe(closed.lens);
  });

  it('takes the place of the role lens, and the role lens takes its place', () => {
    expect(select(lensOf('D'), places, 'N1')).toEqual(traceOf('N1'));
    expect(showRoleLens(traceOf('N1'), places, 'D')).toEqual(lensOf('D'));
  });

  it('keeps the trace, and the stack, when a traced tool is selected there: the whole trace stays in the picture', () => {
    const lens = { type: 'need', need: 'N1' };
    const tool = select(traceOf('N1'), places, 'tool:a');
    expect(tool).toEqual({ ...AT_STACK, lens, selection: { type: 'tool', id: 'tool:a' } });
    expect(stepBack(tool)).toEqual({ ...AT_STACK, lens });
    expect(stepBack(traceOf('N1'))).toEqual({ ...AT_STACK, lens });
  });

  it('goes to the cluster of a traced tool that is selected from closer in', () => {
    const lens = { type: 'need', need: 'N1' };
    const closeIn = focusTier(traceOf('N1'), places, 'T0');
    expect(select(closeIn, places, 'tool:a')).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens });
  });

  it('goes to the cluster of a selected tool that the traced need does not pull in', () => {
    const lens = { type: 'need', need: 'N1' };
    expect(select(traceOf('N1'), places, 'tool:b')).toEqual({ ...withTool('T0', '0A', 'tool:b'), lens });
    expect(select(TRACE_UNCHOSEN, places, 'tool:a')).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens: TRACE_UNCHOSEN.lens });
  });

  it('is one step away from a traced tool: selecting the need comes back to its trace', () => {
    expect(select(select(traceOf('N1'), places, 'tool:a'), places, 'N1')).toEqual(traceOf('N1'));
  });

  it('closes the detail card of the need when the lens is switched off, and keeps the card of a tool in its cluster', () => {
    expect(clearLens(traceOf('N1'))).toEqual(AT_STACK);
    const closeIn = select(focusTier(traceOf('N1'), places, 'T0'), places, 'tool:a');
    expect(clearLens(closeIn)).toEqual(withTool('T1', '1A', 'tool:a'));
  });

  it('closes the card of a traced tool selected at the stack when its trace goes: no tool is selected there without one', () => {
    const atStack = select(traceOf('N1'), places, 'tool:a');
    expect(clearLens(atStack)).toEqual(AT_STACK);
    expect(showRoleLens(atStack, places, 'D')).toEqual(lensOf('D'));
    expect(showNeedTrace(atStack, places, 'N2')).toEqual({ ...AT_STACK, lens: { type: 'need', need: 'N2' } });
    expect(showNeedTrace(atStack, places, 'N1')).toBe(atStack);
  });

  it('applies the filters on top of the trace: a traced tool the filters leave out is faded', () => {
    const hub = toggleFilter(traceOf('N1'), places, 'hosting', 'Hub');
    expect(traced(hub.lens, model)).toBe(true);
    expect(emphasised(hub, model)).toBe(false);
    expect(emphasised(hub, skill)).toBe(true);
  });

  it('traces nothing under the role lens or with no lens', () => {
    expect(traced(lensOf('D').lens, skill)).toBe(false);
    expect(bestFit(null, skill)).toBe(false);
    expect(inReach(lensOf('D').lens, skill)).toBe(true);
    expect(narrows(lensOf('D').lens)).toBe(true);
    expect(narrows(null)).toBe(false);
  });
});

/** The phase scrub for one phase, at the stack. */
const scrubOf = (phase: string): MapState => ({ ...AT_STACK, lens: { type: 'phase', phase } });

describe('the phase scrub', () => {
  /** A tool that serves the need N2 alone, which is scheduled in "P0, P4". */
  const probe: Traits = { ...model, needs: ['N2'], bestFitFor: [], phases: ['P0', 'P4'] };
  /** Whether the skill, the ruleset, the model and the probe are at full strength under a state, in that order. */
  const shown = (state: MapState): boolean[] => [skill, ruleset, model, probe].map((tool) => emphasised(state, tool));

  it('starts at the first phase, and keeps the place and a selected tool', () => {
    expect(showPhaseScrub(AT_STACK, places)).toEqual(scrubOf('P0'));
    const selected = withTool('T1', '1A', 'tool:a');
    expect(showPhaseScrub(selected, places, 'P2')).toEqual({ ...selected, lens: { type: 'phase', phase: 'P2' } });
  });

  it.each([
    ['P0', [false, false, true, true]],
    ['P1', [true, false, true, false]],
    ['P2', [true, false, true, false]],
    ['P3', [true, false, true, false]],
    ['P4', [false, false, true, true]],
  ])('shows for %s the tools that serve a need scheduled in it, and fades the rest', (phase, expected) => {
    const state = showPhaseScrub(AT_STACK, places, phase);
    expect(state).toEqual(scrubOf(phase));
    expect(narrows(state.lens)).toBe(true);
    expect(shown(state)).toEqual(expected);
  });

  it('includes a need in a range in each phase the range covers, and in no other', () => {
    const phasesWithTheSkill = places.phases.filter((phase) => inReach(scrubOf(phase).lens, skill));
    expect(phasesWithTheSkill).toEqual(['P1', 'P2', 'P3']);
  });

  it('includes a need in two separate phases in both, and in none between them', () => {
    const phasesWithTheProbe = places.phases.filter((phase) => inReach(scrubOf(phase).lens, probe));
    expect(phasesWithTheProbe).toEqual(['P0', 'P4']);
  });

  it('is not cumulative: a step shows its own phase only', () => {
    const state = showPhaseScrub(scrubOf('P0'), places, 'P1');
    expect(state).toEqual(scrubOf('P1'));
    expect(inReach(state.lens, probe)).toBe(false);
  });

  it('keeps a tool that serves no need faded throughout', () => {
    expect(places.phases.some((phase) => emphasised(scrubOf(phase), ruleset))).toBe(false);
  });

  it('gives its tools the traced fill, as the need trace does, without the best-fit rings', () => {
    expect(traces(scrubOf('P1').lens)).toBe(true);
    expect(traced(scrubOf('P1').lens, skill)).toBe(true);
    expect(traced(scrubOf('P0').lens, skill)).toBe(false);
    expect(bestFit(scrubOf('P1').lens, skill)).toBe(false);
    expect(traces(TRACE_UNCHOSEN.lens)).toBe(false);
    expect(traces(traceOf('N1').lens)).toBe(true);
    expect(traces(lensOf('D').lens)).toBe(false);
  });

  it('keeps the phase it shows when it is switched on again with no phase named', () => {
    expect(showPhaseScrub(scrubOf('P3'), places)).toEqual(scrubOf('P3'));
  });

  it('keeps what it shows for a phase the roadmap does not have', () => {
    expect(showPhaseScrub(scrubOf('P3'), places, 'P7')).toEqual(scrubOf('P3'));
    expect(showPhaseScrub(atTier('T1'), places, 'P7')).toEqual(atTier('T1'));
  });

  it('takes the place of another lens, and another lens takes its place', () => {
    expect(showPhaseScrub(lensOf('D'), places, 'P2')).toEqual(scrubOf('P2'));
    expect(showRoleLens(scrubOf('P2'), places, 'D')).toEqual(lensOf('D'));
    expect(clearLens(scrubOf('P2'))).toEqual(AT_STACK);
  });

  it('opens the need trace of a need chosen from the phase', () => {
    expect(select(scrubOf('P2'), places, 'N1')).toEqual(traceOf('N1'));
  });

  it('leaves the map at the stack when one of its tools is selected there, and goes to the cluster of any other tool', () => {
    const state = select(scrubOf('P2'), places, 'tool:a');
    expect(state).toEqual({ ...scrubOf('P2'), selection: { type: 'tool', id: 'tool:a' } });
    expect(select(scrubOf('P0'), places, 'tool:a')).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens: { type: 'phase', phase: 'P0' } });
    // A tool stays selected at the stack only while the phase it was selected under is shown.
    expect(showPhaseScrub(state, places, 'P3')).toEqual(scrubOf('P3'));
  });

  it('applies the filters on top: a tool of the phase that the filters leave out is faded', () => {
    const state = toggleFilter(scrubOf('P1'), places, 'hosting', 'Cloud');
    expect(shown(state)).toEqual([false, false, true, false]);
  });
});

describe('the URL fragment', () => {
  it.each([
    ['the stack', AT_STACK, ''],
    ['a tier', atTier('T1'), 'tier=T1'],
    ['a cluster', atCluster('T1', '1B'), 'cluster=1B'],
    ['a selected tool', withTool('T1', '1A', 'tool:a'), 'cluster=1A&select=tool:a'],
    ['a traced need', traceOf('N1'), 'select=N1&lens=need&need=N1'],
    ['the need trace with no need chosen', TRACE_UNCHOSEN, 'lens=need'],
    ['a trace with its detail card closed, at a tier', focusTier(traceOf('N2'), places, 'T0'), 'tier=T0&lens=need&need=N2'],
    ['a traced tool that is selected at the stack', select(traceOf('N1'), places, 'tool:a'), 'select=tool:a&lens=need&need=N1'],
    [
      'a traced tool that is selected close in',
      select(focusTier(traceOf('N1'), places, 'T0'), places, 'tool:a'),
      'cluster=1A&select=tool:a&lens=need&need=N1',
    ],
  ])('writes %s', (_name, state, fragment) => {
    expect(toFragment(state)).toBe(fragment);
  });

  it.each<MapState>([
    AT_STACK,
    atTier('T0'),
    atCluster('T1', '1B'),
    withTool('T0', '0A', 'tool:b'),
    { ...atCluster('T1', '1B'), selection: { type: 'cluster', id: '1B' } },
    traceOf('N1'),
    traceOf('N2'),
    TRACE_UNCHOSEN,
    stepBack(traceOf('N1')),
    focusTier(traceOf('N2'), places, 'T0'),
    select(traceOf('N1'), places, 'tool:a'),
    select(toggleFilter(traceOf('N1'), places, 'hosting', 'Hub'), places, '1B'),
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
    expect(toFragment(atTier('T0'), '#debug=1&cluster=0A')).toBe('debug=1&tier=T0');
    expect(toFragment(AT_STACK, 'debug=1&tier=T0')).toBe('debug=1');
    expect(toFragment(AT_STACK, '#tier=T9')).toBe('');
    expect(toFragment(atTier('T0'), 'debug=1&cluster=1A&select=tool:a')).toBe('debug=1&tier=T0');
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
    expect(fromFragment('debug=1&cluster=0A', places)).toEqual(atCluster('T0', '0A'));
  });

  it('writes the lens and its role, and nothing for no lens', () => {
    expect(toFragment(lensOf('D'))).toBe('lens=role&role=D');
    expect(toFragment(select(toggleFilter(lensOf('M'), places, 'hosting', 'Hub'), places, 'tool:a'))).toBe(
      'cluster=1A&select=tool:a&hosting=Hub&lens=role&role=M',
    );
    expect(toFragment(clearLens(lensOf('D')), 'lens=role&role=D&tier=T1')).toBe('');
  });

  it.each<[string, MapState]>([
    ['the Architect', lensOf('A')],
    ['the Designer', lensOf('D')],
    ['the Analyst', lensOf('M')],
    ['a lens at a tier', focusTier(lensOf('D'), places, 'T0')],
    ['a lens beside a selected tool and a filter', select(toggleFilter(lensOf('M'), places, 'used', 'A'), places, 'tool:b')],
  ])('reads back the lens it wrote: %s', (_name, state) => {
    expect(state.lens).not.toBeNull();
    expect(fromFragment(toFragment(state), places)).toEqual(state);
  });

  it('reads the role lens with no role as the lens for the first role', () => {
    expect(fromFragment('lens=role', places)).toEqual(lensOf('A'));
  });

  it('shows no lens for a lens or a role it does not know, and keeps the rest', () => {
    expect(fromFragment('lens=role&role=Z&tier=T1', places)).toEqual(atTier('T1'));
    expect(fromFragment('lens=moon&role=D&tier=T1', places)).toEqual(atTier('T1'));
    expect(fromFragment('role=D', places)).toEqual(AT_STACK);
  });

  it('starts the trace of a need that a link selects, whatever lens the link names', () => {
    expect(fromFragment('select=N1', places)).toEqual(traceOf('N1'));
    expect(fromFragment('cluster=1A&select=N2&lens=role&role=D', places)).toEqual(traceOf('N2'));
    expect(fromFragment('select=N2&lens=need&need=N1', places)).toEqual(traceOf('N2'));
  });

  it('shows no lens for a need it does not know, and keeps the rest', () => {
    expect(fromFragment('lens=need&need=N9&tier=T1', places)).toEqual(atTier('T1'));
    expect(fromFragment('need=N1', places)).toEqual(AT_STACK);
  });

  it('drops the need from the fragment when the lens is switched off or changed', () => {
    expect(toFragment(clearLens(traceOf('N1')), 'select=N1&lens=need&need=N1')).toBe('');
    expect(toFragment(lensOf('D'), 'lens=need&need=N1')).toBe('lens=role&role=D');
    expect(toFragment(stepBack(traceOf('N1')), 'lens=role&role=D')).toBe('lens=need&need=N1');
  });

  it('writes the phase scrub and its phase, and reads back what it wrote', () => {
    expect(toFragment(scrubOf('P2'))).toBe('lens=phase&phase=P2');
    for (const state of [
      scrubOf('P0'),
      scrubOf('P4'),
      focusTier(scrubOf('P2'), places, 'T0'),
      select(toggleFilter(scrubOf('P3'), places, 'used', 'A'), places, 'tool:b'),
      select(scrubOf('P2'), places, 'tool:a'),
    ]) {
      expect(fromFragment(toFragment(state), places)).toEqual(state);
    }
  });

  it('reads the phase scrub with no phase as the scrub at the first phase, and shows no lens for a phase it does not know', () => {
    expect(fromFragment('lens=phase', places)).toEqual(scrubOf('P0'));
    expect(fromFragment('lens=phase&phase=P7&tier=T1', places)).toEqual(atTier('T1'));
    expect(fromFragment('phase=P2', places)).toEqual(AT_STACK);
  });

  it('drops the phase from the fragment when the lens is switched off or changed', () => {
    expect(toFragment(clearLens(scrubOf('P2')), 'lens=phase&phase=P2')).toBe('');
    expect(toFragment(lensOf('D'), 'lens=phase&phase=P2')).toBe('lens=role&role=D');
    expect(toFragment(select(scrubOf('P2'), places, 'N1'), 'lens=phase&phase=P2')).toBe('select=N1&lens=need&need=N1');
  });

  it('keeps the lens when the place or the selection it names is not in the graph', () => {
    expect(fromFragment('tier=T9&lens=role&role=D', places)).toEqual(lensOf('D'));
    expect(fromFragment('cluster=1A&select=tool:zz&lens=role&role=D', places)).toEqual(lensOf('D'));
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

    const cardClosed: MapState = { ...AT_STACK, lens: { type: 'need', need: 'N1' } };
    expect(seen).toEqual([
      [withTool('T1', '1A', 'tool:a'), AT_STACK],
      [atCluster('T1', '1A'), withTool('T1', '1A', 'tool:a')],
      [traceOf('N1'), atCluster('T1', '1A')],
      [cardClosed, traceOf('N1')],
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

  it('switches the role lens on and off, and comes back to the role it last showed', () => {
    const store = createStore(places);
    const seen: MapState[] = [];
    store.subscribe((state) => seen.push(state));

    store.showRoleLens();
    store.showRoleLens('D');
    store.showRoleLens('D');
    store.focusTier('T1');
    store.clearLens();
    store.clearLens();
    store.showRoleLens();
    store.showRoleLens('Z');
    store.focusStack();

    const designer = { type: 'role', role: 'D' };
    expect(seen).toEqual([
      lensOf('A'),
      lensOf('D'),
      { ...atTier('T1'), lens: designer },
      atTier('T1'),
      { ...atTier('T1'), lens: designer },
      lensOf('D'),
    ]);
  });

  it('switches the need trace on with no need, and afterwards comes back to the need it last showed', () => {
    const store = createStore(places);
    store.showNeedTrace();
    expect(store.get()).toEqual(TRACE_UNCHOSEN);
    store.select('N2');
    expect(store.get()).toEqual(traceOf('N2'));
    store.showRoleLens('D');
    expect(store.get()).toEqual(lensOf('D'));
    store.select('tool:a');
    store.showNeedTrace();
    const back: MapState = { ...withTool('T1', '1A', 'tool:a'), lens: { type: 'need', need: 'N2' } };
    expect(store.get()).toEqual(back);
    store.showNeedTrace();
    expect(store.get()).toEqual(back);
    store.clearLens();
    store.showRoleLens();
    expect(store.get()).toEqual({ ...withTool('T1', '1A', 'tool:a'), lens: { type: 'role', role: 'D' } });
  });

  it('switches the phase scrub on at the first phase, and afterwards comes back to the phase it last showed', () => {
    const store = createStore(places);
    store.showPhaseScrub();
    expect(store.get()).toEqual(scrubOf('P0'));
    store.showPhaseScrub('P3');
    store.select('N1');
    expect(store.get()).toEqual(traceOf('N1'));
    store.showPhaseScrub();
    expect(store.get()).toEqual(scrubOf('P3'));
    store.showPhaseScrub();
    expect(store.get()).toEqual(scrubOf('P3'));
  });

  it('comes back to the phase of a scrub it was handed, as from a link', () => {
    const store = createStore(places, scrubOf('P2'));
    store.clearLens();
    store.showPhaseScrub();
    expect(store.get()).toEqual(scrubOf('P2'));
  });

  it('comes back to the need of a trace it was handed, as from a link', () => {
    const store = createStore(places, focusTier(traceOf('N1'), places, 'T1'));
    store.clearLens();
    store.showNeedTrace();
    expect(store.get()).toEqual({ ...atTier('T1'), lens: { type: 'need', need: 'N1' } });
  });

  it('comes back to the role of a lens it was handed, as from a link', () => {
    const store = createStore(places, lensOf('M'));
    store.clearLens();
    store.showRoleLens();
    expect(store.get()).toEqual(lensOf('M'));

    store.set(lensOf('D'));
    store.set(AT_STACK);
    store.showRoleLens();
    expect(store.get()).toEqual(lensOf('D'));
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
