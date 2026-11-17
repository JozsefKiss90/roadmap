/**
 * rail-fold: lets a part of the rail fold to its heading.
 *
 * The need list needs the rail's height. So while the need trace is on, the
 * filters and the outline fold to their headings, and they open again when
 * the trace is switched off. A heading is a button: a partner can open or
 * fold its part at any time, under any lens.
 *
 * A folded part keeps its heading and what stands beside it, such as the
 * count of the filters. src/styles.css takes the rest out of the page.
 */
import { ChevronRight, createElement } from 'lucide';
import { element } from './dom';
import type { Store } from './state';

export interface Fold {
  /** Opens the part, so that something in it can take the keyboard focus. */
  open(): void;
}

/**
 * @param part The part of the rail that folds. It carries `data-folded` while it is folded.
 * @param heading The part's heading. Its text becomes the button that folds and opens the part.
 */
export function mountFold(part: HTMLElement, heading: HTMLElement, store: Store): Fold {
  const chevron = createElement(ChevronRight);
  chevron.setAttribute('aria-hidden', 'true');
  chevron.classList.add('rail-fold-chevron');
  const toggle = element('button', 'rail-fold', heading.textContent, chevron);
  toggle.type = 'button';
  heading.replaceChildren(toggle);

  const setFolded = (folded: boolean): void => {
    part.toggleAttribute('data-folded', folded);
    toggle.setAttribute('aria-expanded', String(!folded));
  };
  const needsListed = (): boolean => store.get().lens?.type === 'need';
  setFolded(needsListed());
  toggle.addEventListener('click', () => setFolded(!part.hasAttribute('data-folded')));
  store.subscribe((state, previous) => {
    // The part follows the need list only when the list comes or goes, so a partner's own choice holds in between.
    if ((state.lens?.type === 'need') !== (previous.lens?.type === 'need')) setFolded(needsListed());
  });

  return { open: () => setFolded(false) };
}
