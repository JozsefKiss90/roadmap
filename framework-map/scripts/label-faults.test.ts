import { describe, expect, it } from 'vitest';
import { labelFaults } from './label-faults.mjs';

const viewport = { width: 1366, height: 768 };
const rect = (left: number, top: number, width = 100, height = 16) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('labelFaults', () => {
  it('finds nothing wrong with labels that stand apart inside the window', () => {
    expect(labelFaults([rect(10, 10), rect(10, 30), rect(120, 10)], viewport, 60)).toEqual([]);
  });

  it('lets two labels share an edge', () => {
    expect(labelFaults([rect(10, 10), rect(110, 10), rect(10, 26)], viewport, 60)).toEqual([]);
  });

  it('reports two labels that overlap', () => {
    const faults = labelFaults([rect(10, 10), rect(60, 18)], viewport, 60);
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/overlap/);
  });

  it('reports a label that runs out of the window', () => {
    expect(labelFaults([rect(1300, 10)], viewport, 60)[0]).toMatch(/out of the window/);
    expect(labelFaults([rect(10, 760)], viewport, 60)[0]).toMatch(/out of the window/);
    expect(labelFaults([rect(-4, 10)], viewport, 60)[0]).toMatch(/out of the window/);
  });

  it('reports a label that runs under the rail, left of the clear part of the window', () => {
    const clear = { ...viewport, left: 240 };
    expect(labelFaults([rect(236, 10)], clear, 60)[0]).toMatch(/out of the window/);
    expect(labelFaults([rect(240, 10)], clear, 60)).toEqual([]);
  });

  it('reports a label that runs under the bar, above the clear part of the window', () => {
    const clear = { ...viewport, top: 96 };
    expect(labelFaults([rect(10, 90)], clear, 60)[0]).toMatch(/out of the window/);
    expect(labelFaults([rect(10, 96)], clear, 60)).toEqual([]);
  });

  it('reports more labels than a state may show', () => {
    const many = Array.from({ length: 61 }, (_, i) => rect(10, 10 + i * 10, 100, 8));
    expect(labelFaults(many, viewport, 60)).toEqual(['61 labels on screen, more than 60']);
  });

  it('reports a page that did not say what its labels are', () => {
    expect(labelFaults(null, viewport, 60)).toEqual(['the page did not report its labels']);
  });
});
