import { describe, expect, it } from 'vitest';
import { createSingleKeys, isSingleKey } from './single-keys';

/** A browser's storage, as far as the switch uses it. */
function storage(): { getItem(key: string): string | null; setItem(key: string, value: string): void } {
  const kept = new Map<string, string>();
  return { getItem: (key) => kept.get(key) ?? null, setItem: (key, value) => void kept.set(key, value) };
}

describe('the switch for the single keys', () => {
  it('is on until the partner switches it off', () => {
    expect(createSingleKeys(storage()).isOn()).toBe(true);
  });

  it('stays off when the file is opened again', () => {
    const kept = storage();
    createSingleKeys(kept).set(false);
    expect(createSingleKeys(kept).isOn()).toBe(false);
  });

  it('comes back on, and stays on when the file is opened again', () => {
    const kept = storage();
    createSingleKeys(kept).set(false);
    createSingleKeys(kept).set(true);
    expect(createSingleKeys(kept).isOn()).toBe(true);
  });

  it('tells whoever follows it each time it is switched', () => {
    const keys = createSingleKeys(storage());
    const heard: boolean[] = [];
    keys.subscribe((on) => heard.push(on));
    keys.set(false);
    keys.set(true);
    expect(heard).toEqual([false, true]);
  });

  it('still switches where the browser keeps nothing, or refuses to', () => {
    const refusing = {
      getItem: (): string | null => {
        throw new Error('storage is blocked');
      },
      setItem: (): void => {
        throw new Error('storage is blocked');
      },
    };
    for (const kept of [null, refusing]) {
      const keys = createSingleKeys(kept);
      expect(keys.isOn()).toBe(true);
      keys.set(false);
      expect(keys.isOn()).toBe(false);
    }
  });
});

describe('a single key', () => {
  it('is one of the keys that act anywhere on the page with no other key held', () => {
    for (const key of ['/', '?', '1', '2', '3', '4']) expect(isSingleKey(key)).toBe(true);
  });

  it('is not Escape, Tab, Enter or an arrow key, which the switch leaves alone', () => {
    for (const key of ['Escape', 'Tab', 'Enter', 'ArrowLeft', ' ', '5', 'a']) expect(isSingleKey(key)).toBe(false);
  });
});
