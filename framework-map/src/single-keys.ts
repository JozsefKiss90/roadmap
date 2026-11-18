/**
 * single-keys: the switch for the keys that act anywhere on the page with no
 * other key held: `/`, `?` and `1` to `4`.
 *
 * A partner who speaks to the computer, or whose hand rests on the keyboard,
 * can set such a key off without meaning to. So the list of keys has a switch
 * for them (WCAG 2.1, 2.1.4). Escape, Tab and the arrow keys are not single
 * keys in this sense, and work whatever the switch says.
 *
 * The switch is a matter of the partner and not of the map, so it is no part
 * of the state or of a link. The browser keeps it, where it will.
 */

/** The keys that act anywhere on the page, each on its own. */
const SINGLE_KEYS: ReadonlySet<string> = new Set(['/', '?', '1', '2', '3', '4']);

/** Whether a key is one the switch turns off. */
export const isSingleKey = (key: string): boolean => SINGLE_KEYS.has(key);

/** Where the browser keeps the switch, and what it keeps for "off". "On" is kept as nothing more than not "off". */
const STORAGE_KEY = 'framework-map.single-keys';
const OFF = 'off';
const ON = 'on';

export interface SingleKeys {
  isOn(): boolean;
  set(on: boolean): void;
  /** Calls a listener each time the switch is set, with what it was set to. */
  subscribe(listener: (on: boolean) => void): void;
}

/**
 * @param storage The browser's storage, or null where it gives none. A storage that refuses is
 *   treated as one that keeps nothing: the switch then holds until the file is closed.
 */
export function createSingleKeys(storage: Pick<Storage, 'getItem' | 'setItem'> | null): SingleKeys {
  let on = true;
  try {
    on = storage?.getItem(STORAGE_KEY) !== OFF;
  } catch {
    // The keys stay on.
  }
  const listeners: ((on: boolean) => void)[] = [];
  return {
    isOn: () => on,
    set(next) {
      on = next;
      try {
        storage?.setItem(STORAGE_KEY, next ? ON : OFF);
      } catch {
        // The switch holds for as long as the file is open.
      }
      for (const listener of listeners) listener(next);
    },
    subscribe: (listener) => void listeners.push(listener),
  };
}

/** The browser's own storage, or null where asking for it is refused, as it may be for a file opened from disk. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
