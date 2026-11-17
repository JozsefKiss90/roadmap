import { describe, expect, it } from 'vitest';
import { listLayout, listShape, staircaseHeight, staircaseRise } from './label-layout';

describe('the staircase of cluster names', () => {
  it('stands the rightmost name nearest the plate and each name to its left one row higher', () => {
    const rises = [0, 1, 2, 3].map((position) => staircaseRise(position, 4, 18, 10));
    expect(rises).toEqual([64, 46, 28, 10]);
  });

  it('gives every name a row of its own', () => {
    const rises = Array.from({ length: 11 }, (_, position) => staircaseRise(position, 11, 18, 10));
    expect(new Set(rises).size).toBe(11);
  });

  it('is as tall as its rows and the gap under them', () => {
    expect(staircaseHeight(11, 18, 10)).toBe(208);
    // The top of the leftmost name is the top of the staircase.
    expect(staircaseRise(0, 11, 18, 10) + 18).toBe(208);
    expect(staircaseHeight(0, 18, 10)).toBe(0);
  });
});

describe('the list of tool names', () => {
  it('uses one column while the names fit in it', () => {
    expect(listShape(4, 20)).toEqual({ columns: 1, rows: 4 });
    expect(listShape(20, 20)).toEqual({ columns: 1, rows: 20 });
  });

  it('adds a column when there are too many rows, and evens the columns out', () => {
    expect(listShape(21, 20)).toEqual({ columns: 2, rows: 11 });
    expect(listShape(57, 20)).toEqual({ columns: 3, rows: 19 });
  });

  it('has no shape for no names', () => {
    expect(listShape(0, 20)).toEqual({ columns: 0, rows: 0 });
    expect(listLayout([], 20, 20, 28)).toEqual({ slots: [], columnWidths: [], width: 0, height: 0 });
  });

  it('fills a column from the top before it starts the next', () => {
    const { slots } = listLayout([50, 60, 70, 80, 90], 3, 20, 28);
    expect(slots).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: 40 },
      { x: 98, y: 0 },
      { x: 98, y: 20 },
    ]);
  });

  it('makes each column as wide as its widest name, and the list as wide as its columns and gaps', () => {
    const layout = listLayout([50, 120, 70, 80, 90, 30], 3, 20, 28);
    expect(layout.slots[3]?.x).toBe(120 + 28);
    expect(layout.columnWidths).toEqual([120, 120, 120, 90, 90, 90]);
    expect(layout.width).toBe(120 + 28 + 90);
    expect(layout.height).toBe(60);
  });

  it('keeps 57 names of mixed widths clear of each other', () => {
    const widths = Array.from({ length: 57 }, (_, i) => 60 + ((i * 37) % 200));
    const rowPx = 20;
    const { slots, width, height } = listLayout(widths, 20, rowPx, 28);
    expect(slots).toHaveLength(57);
    slots.forEach((a, i) => {
      expect(a.x + widths[i]!).toBeLessThanOrEqual(width);
      expect(a.y + rowPx).toBeLessThanOrEqual(height);
      slots.forEach((b, j) => {
        if (j <= i) return;
        const apartDown = Math.abs(a.y - b.y) >= rowPx;
        const apartAcross = a.x + widths[i]! <= b.x || b.x + widths[j]! <= a.x;
        expect(apartDown || apartAcross, `names ${i} and ${j}`).toBe(true);
      });
    });
  });
});
