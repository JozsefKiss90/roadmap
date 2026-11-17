import { describe, expect, it } from 'vitest';
import { durationsOf, fadeMsBetween } from './motion';
import type { Lens } from './state';

const settled = { flightMs: 700, fadeMs: 250, panelMs: 200, phaseStepMs: 300 };
const scrub = (phase: string): Lens => ({ type: 'phase', phase });
const role: Lens = { type: 'role', role: 'D' };

describe('the durations', () => {
  it('are the settled ones while reduced motion is off', () => {
    expect(durationsOf(settled, false)).toEqual(settled);
  });

  it('are all zero while reduced motion is on', () => {
    expect(durationsOf(settled, true)).toEqual({ flightMs: 0, fadeMs: 0, panelMs: 0, phaseStepMs: 0 });
  });
});

describe('the fade between two lenses', () => {
  it('takes the phase-step duration from one phase to another', () => {
    expect(fadeMsBetween(scrub('P1'), scrub('P2'), settled)).toBe(300);
  });

  it('takes the fade duration when the phase scrub comes on or goes', () => {
    expect(fadeMsBetween(null, scrub('P0'), settled)).toBe(250);
    expect(fadeMsBetween(scrub('P0'), null, settled)).toBe(250);
    expect(fadeMsBetween(role, scrub('P0'), settled)).toBe(250);
  });

  it('takes the fade duration for any other change, such as a filter under one phase', () => {
    expect(fadeMsBetween(scrub('P2'), scrub('P2'), settled)).toBe(250);
    expect(fadeMsBetween(null, role, settled)).toBe(250);
    expect(fadeMsBetween(null, null, settled)).toBe(250);
  });

  it('is zero while reduced motion is on', () => {
    expect(fadeMsBetween(scrub('P1'), scrub('P2'), durationsOf(settled, true))).toBe(0);
  });
});
