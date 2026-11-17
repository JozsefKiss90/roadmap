/**
 * need-list: the needs in the left rail, grouped by phase, while the need
 * trace is on. Needs are not objects in space, so this list is where a
 * partner picks the need to trace.
 *
 * While the phase scrub is on, the list holds the needs of the phase it
 * shows, and no other. Choosing one of them opens its need trace.
 *
 * A need that spans several phases is listed under each of them, and each of
 * its rows ends with the phases it spans, so that a row met twice is read as
 * one need. The chosen need is marked in every place it stands.
 *
 * It is one of the panels: it reads the state store and writes to it, and
 * knows nothing of the scene.
 */
import type { GraphIndex } from './data';
import { element } from './dom';
import { showRailPart } from './motion';
import { listsNeeds, scrubbedPhaseOf, tracedNeedOf } from './state';
import type { MapState, Store } from './state';

export interface NeedList {
  /** Puts the keyboard focus on the chosen need, or on the first need listed when none is chosen. */
  focus(): void;
}

/**
 * @param before The part of the rail the list stands above.
 * @param onClosedWithFocus Called when the list closes while it holds the keyboard focus, so the
 *   focus can go somewhere that is still on the page.
 */
export function mountNeedList(
  parent: HTMLElement,
  before: Node,
  index: GraphIndex,
  store: Store,
  onClosedWithFocus: () => void,
): NeedList {
  const heading = element('h2', 'rail-heading', 'Needs');
  heading.id = 'needs-heading';
  const prompt = element('p', 'needs-prompt', 'Choose a need to trace');

  /** Every row of a need, by the need's id: one row for each phase the need is listed under. */
  const rowsOf = new Map<string, HTMLButtonElement[]>();

  /** The part of the list for each phase, by the phase's code. */
  const partOf = new Map<string, HTMLElement>();

  const phases = index.needsByPhase.map(({ phase, needs }) => {
    const name = element(
      'h3',
      'need-phase-name',
      element('span', null, phase),
      element(
        'span',
        'need-phase-count',
        String(needs.length),
        element('span', 'visually-hidden', needs.length === 1 ? ' need' : ' needs'),
      ),
    );
    name.id = `needs-${phase}`;
    const rows = needs.map((need) => {
      const row = element('button', 'need-row', element('span', 'outline-tag', need.id), element('span', 'need-name', need.label));
      row.type = 'button';
      // Choosing a need selects it: its trace starts and its detail card opens.
      row.addEventListener('click', () => store.select(need.id));
      rowsOf.set(need.id, [...(rowsOf.get(need.id) ?? []), row]);
      return element('li', null, row);
    });
    const list = element('ul', 'need-rows', ...rows);
    list.setAttribute('aria-labelledby', name.id);
    const part = element('section', 'need-phase', name, list);
    partOf.set(phase, part);
    return part;
  });

  for (const [id, rows] of rowsOf) {
    const spans = index.need(id)?.phase;
    if (rows.length < 2 || !spans) continue;
    for (const row of rows) {
      row.append(element('span', 'need-span', element('span', 'visually-hidden', ', spans '), spans));
    }
  }

  // A phase of the scrub with no need scheduled in it has no part, and says so.
  const noNeeds = element('p', 'needs-none', 'No need is scheduled in this phase.');
  noNeeds.hidden = true;
  const list = element('div', 'needs-list', ...phases, noNeeds);
  const panel = element('section', 'needs', element('div', 'needs-head', heading, prompt), list);
  panel.setAttribute('aria-labelledby', heading.id);
  parent.insertBefore(panel, before);

  let chosen: string | null = null;
  /** The phase the list is cut down to, under the phase scrub; null while it lists every phase. */
  let onlyPhase: string | null = null;
  const rowsOfNeed = (need: string | null): readonly HTMLButtonElement[] => (need === null ? [] : (rowsOf.get(need) ?? []));

  function render({ lens }: MapState): void {
    const on = listsNeeds(lens);
    // A list that closes under the partner's hands, as with the key `1`, hands the focus on.
    const heldFocus = panel.contains(document.activeElement);
    showRailPart(panel, on);
    if (heldFocus && !on) onClosedWithFocus();
    const need = tracedNeedOf(lens);
    prompt.hidden = need !== null;
    const phase = scrubbedPhaseOf(lens);
    // Under the phase scrub the line says whose needs these are, and what choosing one does.
    prompt.textContent = phase === null ? 'Choose a need to trace' : `Trace a need of ${phase}`;
    const recut = phase !== onlyPhase;
    const focused = list.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    if (recut) {
      for (const [partPhase, part] of partOf) part.hidden = phase !== null && partPhase !== phase;
      noNeeds.hidden = phase === null || partOf.has(phase);
      onlyPhase = phase;
      list.scrollTop = 0;
      // A row that goes out of the list under the partner's hands hands the focus to the first row that is left.
      if (on && focused?.closest('.need-phase[hidden]')) firstRow()?.focus();
    }
    if (need !== chosen) {
      for (const row of rowsOfNeed(chosen)) row.removeAttribute('aria-current');
      for (const row of rowsOfNeed(need)) row.setAttribute('aria-current', 'true');
      chosen = need;
      scrollToChosen();
    }
    // A need chosen from one phase stands among all the phases again, and the row the partner chose stays in view.
    if (recut && focused?.isConnected && !focused.closest('.need-phase[hidden]')) {
      focused.scrollIntoView({ block: 'nearest' });
    }
  }

  /** The first need the list shows. */
  const firstRow = (): HTMLButtonElement | null =>
    list.querySelector<HTMLButtonElement>('.need-phase:not([hidden]) .need-row');

  /** Brings the chosen need into view, unless the partner is moving through the list. */
  function scrollToChosen(): void {
    if (!list.contains(document.activeElement)) rowsOfNeed(chosen)[0]?.scrollIntoView({ block: 'nearest' });
  }
  // The list's height changes as the rail is put together and as the window changes, and the need stays in view.
  new ResizeObserver(scrollToChosen).observe(list);

  render(store.get());
  store.subscribe((state, previous) => {
    if (state.lens !== previous.lens) render(state);
  });

  return {
    focus() {
      (rowsOfNeed(chosen)[0] ?? firstRow())?.focus();
    },
  };
}
