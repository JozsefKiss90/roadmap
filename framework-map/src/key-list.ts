/**
 * key-list: the list of keys, in a dialog that `?` opens. The browser's own
 * dialog keeps the focus inside it, closes on Escape and gives the focus back.
 */
import { X, createElement } from 'lucide';
import { element } from './dom';

/** The keys, by where they work. Each row is the keys and what they do. */
const KEYS: readonly (readonly [string, readonly (readonly [readonly string[], string])[]])[] = [
  [
    'Anywhere',
    [
      [['/'], 'Go to the search box'],
      [['?'], 'Show this list'],
      [['Esc'], 'Close the detail card, then step out one distance'],
      [['Tab'], 'Go to the next control'],
    ],
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

export function mountKeyList(app: HTMLElement): KeyList {
  const closeIcon = createElement(X);
  closeIcon.setAttribute('aria-hidden', 'true');
  const close = element('button', 'card-close', closeIcon);
  close.type = 'button';
  close.setAttribute('aria-label', 'Close the list of keys');
  close.title = 'Close (Escape)';

  const heading = element('h2', 'key-list-name', 'Keys');
  heading.id = 'key-list-name';
  const dialog = element(
    'dialog',
    'key-list',
    element('header', 'key-list-head', heading, close),
    ...KEYS.map(([where, rows]) =>
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
