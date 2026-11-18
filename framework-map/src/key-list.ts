/**
 * key-list: the list of keys, in a dialog that `?` opens. The browser's own
 * dialog keeps the focus inside it, closes on Escape and gives the focus back.
 *
 * Under the keys that work anywhere stands the switch for the single keys
 * (src/single-keys.ts). The list shows the switch and sets it; src/panels.ts
 * follows it, and takes the hints for those keys off the page while it is off.
 */
import { X, createElement } from 'lucide';
import { element } from './dom';
import type { SingleKeys } from './single-keys';

/** The keys, by where they work. Each row is the keys and what they do. */
const KEYS: readonly (readonly [string, readonly (readonly [readonly string[], string])[]])[] = [
  [
    'Anywhere',
    [
      [['/'], 'Go to the search box'],
      [['?'], 'Show this list'],
      [['1'], 'Switch the lens off'],
      [['2'], 'Switch the role lens on'],
      [['3'], 'Switch the need trace on'],
      [['4'], 'Switch the phase scrub on, and go to the phase strip'],
      [['Esc'], 'Close the detail card, then step out one distance'],
      [['Tab'], 'Go to the next control'],
    ],
  ],
  [
    'On the phase strip',
    [[['←', '→'], 'Step to the phase before or after']],
  ],
  [
    'In the outline',
    [
      [['↑', '↓'], 'Go to the row above or below'],
      [['→'], 'Open a row, or go to its first row'],
      [['←'], 'Close a row, or go to the row it stands under'],
      [['Home', 'End'], 'Go to the first or the last row'],
      [['Enter', 'Space'], 'Select the row and fly to it'],
    ],
  ],
  [
    'In the search box',
    [
      [['↑', '↓'], 'Go through the results'],
      [['Enter'], 'Fly to the result and open its detail card'],
      [['Esc'], 'Clear the search'],
    ],
  ],
];

export interface KeyList {
  open(): void;
  isOpen(): boolean;
}

/** @param singleKeys The switch for the keys that act anywhere on their own. The list shows it and sets it. */
export function mountKeyList(app: HTMLElement, singleKeys: SingleKeys): KeyList {
  const closeIcon = createElement(X);
  closeIcon.setAttribute('aria-hidden', 'true');
  const close = element('button', 'card-close', closeIcon);
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the list of keys');
  close.title = 'Close (Escape)';

  const heading = element('h2', 'key-list-name', 'Keys');
  heading.id = 'key-list-name';

  const note = element(
    'p',
    'key-list-note',
    'Switch them off if speech input, or a hand at rest on the keyboard, sets them off. Escape, Tab and the arrow keys stay on.',
  );
  note.id = 'key-list-note';
  const single = element('input', null);
  single.type = 'checkbox';
  single.checked = singleKeys.isOn();
  single.setAttribute('aria-describedby', note.id);
  single.addEventListener('change', () => singleKeys.set(single.checked));
  const singleSwitch = element('label', 'key-list-switch', single, 'Use the single keys /, ? and 1 to 4');

  const dialog = element(
    'dialog',
    'key-list',
    element('header', 'key-list-head', heading, close),
    ...KEYS.map(([where, rows], at) =>
      element(
        'section',
        'key-list-section',
        element('h3', 'rail-heading', where),
        element(
          'dl',
          'key-list-rows',
          ...rows.map(([keys, does]) =>
            element('div', null, element('dt', null, ...keys.map((key) => element('kbd', null, key))), element('dd', null, does)),
          ),
        ),
        // The first section holds the keys that work anywhere, and the single keys are among them.
        at === 0 && singleSwitch,
        at === 0 && note,
      ),
    ),
  );
  dialog.setAttribute('aria-labelledby', heading.id);
  close.addEventListener('click', () => dialog.close());
  // A click on the backdrop, outside the dialog's box, closes it.
  dialog.addEventListener('click', (event) => {
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (event.target === dialog && !inside) dialog.close();
  });
  app.append(dialog);

  return {
    open: () => {
      if (!dialog.open) dialog.showModal();
    },
    isOpen: () => dialog.open,
  };
}
