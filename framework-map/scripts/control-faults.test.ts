import { describe, expect, it } from 'vitest';
import { controlFaults } from './control-faults.mjs';

const control = (name: string, width: number, height: number) => ({ name, left: 10, top: 20, right: 10 + width, bottom: 20 + height });

describe('controlFaults', () => {
  it('passes controls that are 44 pixels each way, or more', () => {
    expect(controlFaults([control('Search', 44, 44), control('a row of the outline', 288, 48)], 44)).toEqual([]);
  });

  it('reports a control that is too low, with its name and its size', () => {
    expect(controlFaults([control('Close', 44, 32)], 44)).toEqual(['a control is smaller than 44 by 44 pixels: "Close", 44 by 32']);
  });

  it('reports a control that is too narrow', () => {
    expect(controlFaults([control('Stack', 28, 44)], 44)).toEqual(['a control is smaller than 44 by 44 pixels: "Stack", 28 by 44']);
  });

  it('lets a control be short of the size by the part of a pixel a browser rounds away', () => {
    expect(controlFaults([control('Lens', 43.6, 43.99)], 44)).toEqual([]);
  });

  it('reports each kind of control once, however many of it are too small', () => {
    const faults = controlFaults([control('Tool row', 280, 28), control('Tool row', 280, 28), control('Close', 30, 30)], 44);
    expect(faults).toEqual([
      'a control is smaller than 44 by 44 pixels: "Tool row", 280 by 28 (and 1 more like it)',
      'a control is smaller than 44 by 44 pixels: "Close", 30 by 30',
    ]);
  });

  it('says so when the page reported no controls', () => {
    expect(controlFaults(null, 44)).toEqual(['the page did not report its controls']);
  });
});
