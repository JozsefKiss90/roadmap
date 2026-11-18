import { describe, expect, it } from 'vitest';
import { panelFaults } from './panel-faults.mjs';

const viewport = { width: 1280, height: 720 };
const panel = (name: string, left: number, top: number, width: number, height: number) => ({
  name,
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const rail = panel('rail', 0, 0, 56, 720);
const card = panel('detail card', 920, 0, 360, 720);

describe('panelFaults', () => {
  it('finds nothing wrong with panels that stand apart inside the window', () => {
    const legend = panel('legend', 72, 678, 480, 30);
    const breadcrumb = panel('breadcrumb', 400, 22, 300, 28);
    expect(panelFaults([rail, card, legend, breadcrumb], viewport)).toEqual([]);
  });

  it('lets two panels share an edge', () => {
    expect(panelFaults([rail, panel('legend', 56, 678, 480, 30)], viewport)).toEqual([]);
  });

  it('reports two panels that overlap, by name', () => {
    const faults = panelFaults([rail, card, panel('legend', 72, 678, 900, 30)], viewport);
    expect(faults).toEqual([expect.stringMatching(/detail card.*legend|legend.*detail card/)]);
  });

  it('reports a panel that runs out of the window', () => {
    const faults = panelFaults([panel('phase strip', 700, 600, 640, 60)], viewport);
    expect(faults).toEqual([expect.stringContaining('phase strip')]);
    expect(faults[0]).toMatch(/out of the window/);
  });

  it('reports a panel that runs off the bottom of the window', () => {
    expect(panelFaults([panel('legend', 72, 700, 300, 30)], viewport)).toHaveLength(1);
  });

  it('says so when the page reported no panels', () => {
    expect(panelFaults(null, viewport)).toEqual(['the page did not report its panels']);
  });
});
