import { describe, expect, it } from 'vitest';
import type { StackLayout } from './layout';
import { pickOnStack } from './pick';
import type { Ray } from './pick';

/** Two plates, the upper one shorter. The lower plate holds two cells with a gap between them. */
const layout: StackLayout = {
  plates: [
    { tier: 'T1', x: -5, y: 5, z: 0, width: 10, depth: 6 },
    { tier: 'T0', x: 0, y: 0, z: 0, width: 20, depth: 6 },
  ],
  cells: [
    { cluster: '1A', tier: 'T1', x: -5, y: 5, z: 0, width: 8, depth: 4, slots: 32 },
    { cluster: '0A', tier: 'T0', x: -5, y: 0, z: 0, width: 8, depth: 4, slots: 32 },
    { cluster: '0B', tier: 'T0', x: 5, y: 0, z: 0, width: 8, depth: 4, slots: 32 },
  ],
  marks: [
    { tool: 'tool:a', cluster: '0B', tier: 'T0', x: 2, y: 0, z: -1, size: 0.72 },
    { tool: 'tool:b', cluster: '0B', tier: 'T0', x: 3, y: 0, z: -1, size: 0.72 },
  ],
  bounds: { min: { x: -10, y: 0, z: -3 }, max: { x: 10, y: 5, z: 3 } },
};

/** A ray straight down onto the point (x, z). */
const down = (x: number, z: number): Ray => ({ origin: { x, y: 100, z }, direction: { x: 0, y: -1, z: 0 } });

describe('pickOnStack', () => {
  it('finds the cell under the ray, with its tier', () => {
    expect(pickOnStack(down(5, 1), layout)).toEqual({ tier: 'T0', cluster: '0B', tool: null });
  });

  it('finds the mark under the ray, with its cell', () => {
    expect(pickOnStack(down(3.3, -1.3), layout)).toEqual({ tier: 'T0', cluster: '0B', tool: 'tool:b' });
  });

  it('finds the cell alone where the ray lands between two marks', () => {
    expect(pickOnStack(down(2.5, -1), layout)).toEqual({ tier: 'T0', cluster: '0B', tool: null });
  });

  it('finds the plate alone where the ray lands between cells', () => {
    expect(pickOnStack(down(0.5, 0), layout)).toEqual({ tier: 'T0', cluster: null, tool: null });
    expect(pickOnStack(down(5, 2.6), layout)).toEqual({ tier: 'T0', cluster: null, tool: null });
  });

  it('finds the upper plate where two plates lie under the ray', () => {
    expect(pickOnStack(down(-5, 0), layout)).toEqual({ tier: 'T1', cluster: '1A', tool: null });
  });

  it('passes over a plate it is told to see through', () => {
    expect(pickOnStack(down(-5, 0), layout, (tier) => tier === 'T1')).toEqual({ tier: 'T0', cluster: '0A', tool: null });
  });

  it('finds nothing beside the stack', () => {
    expect(pickOnStack(down(30, 0), layout)).toBeNull();
    expect(pickOnStack(down(0, 9), layout)).toBeNull();
  });

  it('follows a slanted ray to where it lands, not to where it starts', () => {
    // Starts between the plates, above the cell 0A, and lands on the cell 0B.
    const ray: Ray = { origin: { x: -4, y: 4, z: 0 }, direction: { x: 2, y: -1, z: 0 } };
    expect(pickOnStack(ray, layout)).toEqual({ tier: 'T0', cluster: '0B', tool: null });
  });

  it('finds nothing for a ray that points away from the plates, or runs level', () => {
    expect(pickOnStack({ origin: { x: 0, y: 100, z: 0 }, direction: { x: 0, y: 1, z: 0 } }, layout)).toBeNull();
    expect(pickOnStack({ origin: { x: -50, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, layout)).toBeNull();
  });
});
