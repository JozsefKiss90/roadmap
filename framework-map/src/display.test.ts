import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMMITTED_ONLY, KIND_ICONS, decisionStep, gateBadge, kindIcon } from './display';
import type { Vocabulary } from './validate';

const vocabulary = JSON.parse(
  readFileSync(new URL('../../tool-discovery/vocabulary.json', import.meta.url), 'utf8'),
) as Vocabulary;

describe('decisionStep', () => {
  // The grouping as the spec lists it, under "Encodings".
  it.each([
    ['Core v1', 'committed'],
    ['Adapter', 'committed'],
    ['Skill / rule', 'committed'],
    ['Core later', 'planned'],
    ['Build', 'planned'],
    ['Optional / benchmark', 'optional'],
    ['Reference / concept', 'optional'],
    ['Out of scope', 'optional'],
    ['Unverified', 'optional'],
    ['Delay / guarded', 'guarded'],
  ])('puts %s in the %s step', (decisionClass, step) => {
    expect(decisionStep(decisionClass)).toBe(step);
  });

  it('has a step for every decision class in the vocabulary file', () => {
    expect(vocabulary.decision_class).toHaveLength(10);
    for (const decisionClass of vocabulary.decision_class) {
      expect(() => decisionStep(decisionClass)).not.toThrow();
    }
  });

  it('refuses a decision class it does not know', () => {
    expect(() => decisionStep('Maybe')).toThrow(/Maybe/);
  });
});

describe('"committed only"', () => {
  it('chooses decision classes the vocabulary file has', () => {
    expect(COMMITTED_ONLY).toEqual(['Core v1', 'Core later', 'Build']);
    for (const decisionClass of COMMITTED_ONLY) expect(vocabulary.decision_class).toContain(decisionClass);
  });

  // The ticket gives the number: 330 of the 773 tools (327 of 766 before the Obsidian tools).
  it('chooses 330 tools of the framework', () => {
    const graph = JSON.parse(
      readFileSync(new URL('../../tool-discovery/tool-framework.graph.json', import.meta.url), 'utf8'),
    ) as { nodes: { type: string; decision_class?: string }[] };
    const tools = graph.nodes.filter((node) => node.type === 'tool');
    expect(tools).toHaveLength(773);
    expect(tools.filter((tool) => COMMITTED_ONLY.includes(tool.decision_class ?? ''))).toHaveLength(330);
  });
});

describe('kindIcon', () => {
  it('has an icon for every kind family in the vocabulary file, and no two families share one', () => {
    const icons = Object.keys(vocabulary.kind).map((family) => kindIcon(family));
    expect(new Set(icons).size).toBe(icons.length);
    for (const icon of icons) expect(KIND_ICONS).toContain(icon);
  });

  it('refuses a kind family it does not know', () => {
    expect(() => kindIcon('Gadget')).toThrow(/Gadget/);
  });
});

describe('gateBadge', () => {
  it('gives every gate family but "None" a badge of its own', () => {
    const gated = Object.keys(vocabulary.gate).filter((family) => family !== 'None');
    const badges = gated.map((family) => gateBadge(family));
    expect(badges.every((badge) => typeof badge === 'string' && badge.length > 0)).toBe(true);
    expect(new Set(badges).size).toBe(gated.length);
  });

  it('gives a tool with no gate no badge', () => {
    expect(gateBadge('None')).toBeNull();
  });

  it('refuses a gate family it does not know', () => {
    expect(() => gateBadge('Curfew')).toThrow(/Curfew/);
  });
});
