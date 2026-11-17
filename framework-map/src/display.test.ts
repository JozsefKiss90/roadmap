import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decisionStep } from './display';
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
