import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPress } from './press';
import type { PressPoint } from './press';

const settled = { slopPx: 5, touchSlopPx: 10, holdMs: 500 };

function pressing() {
  const taps: PressPoint[] = [];
  const holds: PressPoint[] = [];
  const press = createPress(settled, { tap: (at) => taps.push(at), hold: (at) => holds.push(at) });
  return { press, taps, holds };
}

const mouse = (x: number, y: number) => ({ id: 1, x, y, touch: false, primary: true });
const finger = (id: number, x: number, y: number) => ({ id, x, y, touch: true, primary: true });

describe('what a press on the canvas is', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is a tap where the pointer is let go where it was pressed', () => {
    const { press, taps } = pressing();
    press.down(mouse(100, 100));
    press.up(mouse(102, 101));
    expect(taps).toEqual([{ x: 102, y: 101 }]);
  });

  it('is a drag, and no tap, where the pointer has moved away', () => {
    const { press, taps } = pressing();
    press.down(mouse(100, 100));
    press.move(mouse(140, 100));
    press.up(mouse(140, 100));
    expect(taps).toEqual([]);
  });

  it('stays a drag where a finger comes back to where it was pressed', () => {
    const { press, taps } = pressing();
    press.down(finger(1, 100, 100));
    press.move(finger(1, 140, 100));
    press.up(finger(1, 100, 100));
    expect(taps).toEqual([]);
  });

  it('judges a mouse by where it is let go alone, as before the map knew fingers', () => {
    const { press, taps } = pressing();
    press.down(mouse(100, 100));
    press.move(mouse(140, 100));
    press.up(mouse(101, 100));
    expect(taps).toEqual([{ x: 101, y: 100 }]);
  });

  it('says whether a tap was a finger’s', () => {
    const byFinger: boolean[] = [];
    const press = createPress(settled, { tap: (_at, finger) => byFinger.push(finger), hold: () => {} });
    press.down(mouse(100, 100));
    press.up(mouse(100, 100));
    press.down(finger(1, 100, 100));
    press.up(finger(1, 100, 100));
    expect(byFinger).toEqual([false, true]);
  });

  it('gives a finger more room to wobble than a mouse', () => {
    const { press, taps } = pressing();
    press.down(mouse(100, 100));
    press.up(mouse(108, 100));
    expect(taps).toEqual([]);
    press.down(finger(1, 100, 100));
    press.up(finger(1, 108, 100));
    expect(taps).toEqual([{ x: 108, y: 100 }]);
  });

  it('is no tap with any button but the first', () => {
    const { press, taps } = pressing();
    press.down({ ...mouse(100, 100), primary: false });
    press.up(mouse(100, 100));
    expect(taps).toEqual([]);
  });

  it('is no tap for either finger of a pinch, even one that never moved', () => {
    const { press, taps } = pressing();
    press.down(finger(1, 100, 100));
    press.down(finger(2, 200, 100));
    press.move(finger(2, 240, 100));
    press.up(finger(2, 240, 100));
    press.up(finger(1, 100, 100));
    expect(taps).toEqual([]);
  });

  it('is a tap again once both fingers of a pinch are off', () => {
    const { press, taps } = pressing();
    press.down(finger(1, 100, 100));
    press.down(finger(2, 200, 100));
    press.up(finger(1, 100, 100));
    press.up(finger(2, 200, 100));
    press.down(finger(3, 50, 50));
    press.up(finger(3, 50, 50));
    expect(taps).toEqual([{ x: 50, y: 50 }]);
  });

  it('is a hold where a finger rests in place, and letting go is then no tap', () => {
    const { press, taps, holds } = pressing();
    press.down(finger(1, 100, 100));
    vi.advanceTimersByTime(499);
    expect(holds).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(holds).toEqual([{ x: 100, y: 100 }]);
    press.up(finger(1, 100, 100));
    expect(taps).toEqual([]);
  });

  it('is no hold once the finger has moved away, or come off, or been joined by another', () => {
    const { press, holds } = pressing();
    press.down(finger(1, 100, 100));
    press.move(finger(1, 130, 100));
    vi.advanceTimersByTime(600);
    press.up(finger(1, 130, 100));

    press.down(finger(2, 100, 100));
    press.up(finger(2, 100, 100));
    vi.advanceTimersByTime(600);

    press.down(finger(3, 100, 100));
    press.down(finger(4, 200, 100));
    vi.advanceTimersByTime(600);
    expect(holds).toEqual([]);
  });

  it('is no hold for a mouse, which has its hover: a slow click is still a tap', () => {
    const { press, taps, holds } = pressing();
    press.down(mouse(100, 100));
    vi.advanceTimersByTime(2000);
    press.up(mouse(100, 100));
    expect(holds).toEqual([]);
    expect(taps).toEqual([{ x: 100, y: 100 }]);
  });

  it('is nothing where the browser takes the press away', () => {
    const { press, taps, holds } = pressing();
    press.down(finger(1, 100, 100));
    press.cancel(1);
    vi.advanceTimersByTime(600);
    press.up(finger(1, 100, 100));
    expect(taps).toEqual([]);
    expect(holds).toEqual([]);
  });
});
