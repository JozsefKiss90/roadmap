import { describe, expect, it } from 'vitest';
import { announcementOf } from './announcer';
import { readGraph } from './data';
import { AT_STACK, NO_FILTERS } from './state';
import type { MapState } from './state';
import type { Vocabulary } from './validate';

const vocabulary: Vocabulary = {
  decision_class: ['Core v1'],
  hosting: ['Hub', 'Cloud'],
  stream: ['OS'],
  kind: { Skill: ['Skill'] },
  gate: { None: ['None'] },
};

const tool = (id: string, label: string, cluster: string, tier: string, usedBy: string[], hosting: string) => ({
  id,
  type: 'tool',
  label,
  tier,
  cluster,
  kind: 'Skill',
  decision_class: 'Core v1',
  used_by: usedBy,
  hosting,
  stream: 'OS',
  gate: 'None',
});

const cluster = (id: string, label: string, tier: string, sector: number, tools: number) => ({
  id,
  type: 'cluster',
  label,
  tier,
  hosting: 'Hub',
  stream: 'OS',
  gate: 'None',
  tools,
  layout: { z: 0, sector, sectors: 2 },
});

/**
 * Four tools on two tiers. The Designer uses Alpha and Beta, and the Architect uses Beta, Gamma and Delta.
 * Alpha and Beta are hosted on the hub. N01, in P1, is served by Alpha alone. N02, in P2, is served by
 * Alpha, Beta and Gamma, and Alpha and Gamma are its best fits.
 */
const index = readGraph(
  {
    meta: { counts: { tools: 4, clusters: 3, tiers: 2, needs: 2, edges: 4 } },
    nodes: [
      { id: 'T0', type: 'tier', label: 'Substrate', layout: { z: 0 } },
      { id: 'T1', type: 'tier', label: 'Extension primitives', layout: { z: 1 } },
      cluster('0A', 'Storage', 'T0', 0, 2),
      cluster('0B', 'Compute', 'T0', 1, 1),
      cluster('1A', 'Skills', 'T1', 0, 1),
      tool('tool:alpha', 'Alpha', '0A', 'T0', ['D'], 'Hub'),
      tool('tool:beta', 'Beta', '0B', 'T0', ['D', 'A'], 'Hub'),
      tool('tool:gamma', 'Gamma', '0A', 'T0', ['A'], 'Cloud'),
      tool('tool:delta', 'Delta', '1A', 'T1', ['A'], 'Cloud'),
      { id: 'N01', type: 'need', label: 'Keep the files', phase: 'P1' },
      { id: 'N02', type: 'need', label: 'Run the jobs', phase: 'P2' },
      { id: 'role:D', type: 'role', label: 'Designer' },
      { id: 'role:A', type: 'role', label: 'Architect' },
    ],
    edges: [
      { source: 'tool:alpha', target: 'N01', type: 'serves' },
      { source: 'tool:alpha', target: 'N02', type: 'serves', best_fit: true },
      { source: 'tool:beta', target: 'N02', type: 'serves', best_fit: false },
      { source: 'tool:gamma', target: 'N02', type: 'serves', best_fit: true },
    ],
  },
  vocabulary,
);

const state = (changes: Partial<MapState> = {}): MapState => ({ ...AT_STACK, ...changes });
const hub = { ...NO_FILTERS, hosting: ['Hub'] };
const say = (after: Partial<MapState>, before: Partial<MapState> = {}): string | null =>
  announcementOf(state(after), state(before), index);

const designer = { type: 'role', role: 'D' } as const;
const tracing = { type: 'need', need: 'N02' } as const;

describe('what the map says of a change of lens', () => {
  it('names the role lens as it comes on, with the number of tools in reach', () => {
    expect(say({ lens: designer })).toBe('Role lens on. 2 of 4 tools in reach of the Designer.');
  });

  it('says another role by its count alone: the control that was stepped has said its name', () => {
    expect(say({ lens: { type: 'role', role: 'A' } }, { lens: designer })).toBe('3 of 4 tools in reach of the Architect.');
  });

  it('names the phase scrub as it comes on, and says a step to another phase by its count alone', () => {
    const p1 = { type: 'phase', phase: 'P1' } as const;
    expect(say({ lens: p1 })).toBe('Phase scrub on. 1 of 4 tools serving a need scheduled in P1.');
    expect(say({ lens: { type: 'phase', phase: 'P2' } }, { lens: p1 })).toBe('3 of 4 tools serving a need scheduled in P2.');
  });

  it('asks for a need while the need trace waits for one', () => {
    expect(say({ lens: { type: 'need', need: null } })).toBe('Need trace on. Choose a need to trace.');
  });

  it('says what a trace found when a need is traced with nothing selected, as from a key or a link', () => {
    expect(say({ lens: tracing })).toBe('Tracing need N02, Run the jobs. 3 tools serve it, 2 as a best fit.');
  });

  it('adds what the filters leave of a trace', () => {
    expect(say({ lens: tracing, filters: hub }, { filters: hub })).toBe(
      'Tracing need N02, Run the jobs. 3 tools serve it, 2 as a best fit. 2 of 4 tools serving the need N02, Run the jobs and passing the filters.',
    );
  });

  it('says that the lens is off, and what is then in reach', () => {
    expect(say({}, { lens: designer })).toBe('Lens off. All 4 tools are in reach, with no filter chosen.');
    expect(say({ filters: hub }, { lens: designer, filters: hub })).toBe('Lens off. 2 of 4 tools passing the filters.');
  });

  it('says that the selection went with the lens that held it', () => {
    const selection = { type: 'need', id: 'N02' } as const;
    expect(say({}, { lens: tracing, selection })).toBe('Lens off. All 4 tools are in reach, with no filter chosen. Nothing selected.');
  });
});

describe('what the map says of a change of filters', () => {
  it('gives the number of tools that pass', () => {
    expect(say({ filters: hub })).toBe('2 of 4 tools passing the filters.');
  });

  it('counts under the lens and the filters together', () => {
    const architect = { type: 'role', role: 'A' } as const;
    expect(say({ lens: architect, filters: hub }, { lens: architect })).toBe(
      '1 of 4 tools in reach of the Architect and passing the filters.',
    );
  });

  it('says so when the last filter is cleared', () => {
    expect(say({}, { filters: hub })).toBe('All 4 tools are in reach, with no filter chosen.');
  });

  it('takes filters that hold the same values for the same filters, as when a link is read anew', () => {
    const sameAgain = { ...NO_FILTERS, hosting: ['Hub'] };
    expect(say({ distance: 'tier', tier: 'T0', filters: sameAgain }, { filters: hub })).toBe('Tier T0, Substrate.');
    expect(say({ filters: sameAgain }, { filters: hub })).toBeNull();
  });
});

describe('what the map says of a change of selection or of place', () => {
  it('names a selected tool with its cluster, and a selected cluster, and says that the detail card has opened', () => {
    expect(say({ selection: { type: 'tool', id: 'tool:alpha' } })).toBe(
      'Selected the tool Alpha, in cluster 0A, Storage. Its detail card is open.',
    );
    expect(say({ selection: { type: 'cluster', id: '0B' } })).toBe('Selected cluster 0B, Compute. Its detail card is open.');
  });

  it('does not say again that the card is open when the selection goes from one thing to another', () => {
    expect(say({ selection: { type: 'tool', id: 'tool:beta' } }, { selection: { type: 'tool', id: 'tool:alpha' } })).toBe(
      'Selected the tool Beta, in cluster 0B, Compute.',
    );
  });

  it('says what the trace of a chosen need found, once, though the lens changed with the selection', () => {
    expect(say({ lens: tracing, selection: { type: 'need', id: 'N02' } })).toBe(
      'Tracing need N02, Run the jobs. 3 tools serve it, 2 as a best fit. Its detail card is open.',
    );
  });

  it('adds what the filters leave of the trace of a chosen need', () => {
    expect(say({ lens: tracing, selection: { type: 'need', id: 'N02' }, filters: hub }, { filters: hub })).toBe(
      'Tracing need N02, Run the jobs. 3 tools serve it, 2 as a best fit. 2 of 4 tools serving the need N02, Run the jobs and passing the filters. Its detail card is open.',
    );
  });

  it('says that nothing is selected, and where the map went if it went', () => {
    const selection = { type: 'tool', id: 'tool:alpha' } as const;
    const inCluster = { distance: 'cluster', tier: 'T0', cluster: '0A' } as const;
    expect(say(inCluster, { ...inCluster, selection })).toBe('Nothing selected.');
    expect(say({}, { ...inCluster, selection })).toBe('Nothing selected. The whole stack.');
  });

  it('names the tier or the cluster the map goes to with nothing selected', () => {
    expect(say({ distance: 'tier', tier: 'T0' })).toBe('Tier T0, Substrate.');
    expect(say({ distance: 'cluster', tier: 'T0', cluster: '0A' }, { distance: 'tier', tier: 'T0' })).toBe('Cluster 0A, Storage.');
  });

  it('says nothing where nothing changed, or where the selection stayed', () => {
    const selection = { type: 'tool', id: 'tool:alpha' } as const;
    expect(say({}, {})).toBeNull();
    expect(say({ selection }, { selection })).toBeNull();
  });
});
