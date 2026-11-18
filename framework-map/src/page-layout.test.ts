import { describe, expect, it } from 'vitest';
import { insetLeftPxAt, pageLayoutAt, railPxAt } from './page-layout';

const settled = { narrowBelowPx: 1024, compactBelowPx: 1366, railPx: 240, railIconsPx: 56, insetLeftPx: 512 };

describe('the layout a window gets, by its width', () => {
  it('is the full layout at 1366 pixels and wider', () => {
    expect(pageLayoutAt(1366, settled)).toBe('full');
    expect(pageLayoutAt(1920, settled)).toBe('full');
  });

  it('is the compact layout at 1280 pixels, the smallest supported width', () => {
    expect(pageLayoutAt(1280, settled)).toBe('compact');
    expect(pageLayoutAt(1365, settled)).toBe('compact');
    expect(pageLayoutAt(1024, settled)).toBe('compact');
  });

  it('is the narrow message below 1024 pixels', () => {
    expect(pageLayoutAt(1023, settled)).toBe('narrow');
    expect(pageLayoutAt(0, settled)).toBe('narrow');
  });
});

describe('the room the rail takes from the canvas', () => {
  it('is the whole rail in the full layout', () => {
    expect(railPxAt(1366, settled)).toBe(240);
  });

  it('is the column of icons in the compact layout', () => {
    expect(railPxAt(1280, settled)).toBe(56);
  });

  it('gives the stack at rest the room the rail gave up', () => {
    expect(insetLeftPxAt(1366, settled)).toBe(512);
    expect(insetLeftPxAt(1280, settled)).toBe(328);
  });
});
