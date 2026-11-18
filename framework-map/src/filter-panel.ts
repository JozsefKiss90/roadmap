/**
 * filter-panel: the seven filters in the left rail, with the count of the
 * tools at full strength under them and the lens, the "committed only" control and the control that
 * clears them all.
 *
 * It is one of the panels: it reads the state store and writes to it, and
 * knows nothing of the scene. Each filter is a list of checkboxes that opens
 * under its name; a filter that has a value chosen starts open. The whole
 * panel folds to its heading and its count while the need list is on show.
 */
import { ChevronRight, createElement } from 'lucide';
import type { GraphIndex } from './data';
import { COMMITTED_ONLY } from './display';
import { element, swatch } from './dom';
import { mountFold } from './rail-fold';
import { FILTER_NAMES, isFiltered, scrubbedPhaseOf, tracedNeedOf } from './state';
import type { FilterName, Filters, Lens, MapState, Store } from './state';

/** The name the rail gives each filter. */
const FILTER_TITLES: Readonly<Record<FilterName, string>> = {
  decision: 'Decision class',
  kind: 'Kind',
  used: 'Used by',
  operated: 'Operated by',
  hosting: 'Hosting',
  stream: 'Value stream',
  gate: 'Gate',
};

/** The name of a filter's value, as a partner reads it: a role's or a value stream's name for its code. */
function valueName(index: GraphIndex, name: FilterName, value: string): string {
  if (name === 'used' || name === 'operated') return index.roleName(value);
  if (name === 'stream') return index.streamName(value);
  return value;
}

/** Why a lens leaves tools in reach, as assistive technology hears it after the count. Null for a lens that leaves none out. */
function reasonInReach(index: GraphIndex, lens: Lens | null): string | null {
  if (lens?.type === 'role') return `are in reach of the ${index.roleName(lens.role)}`;
  const phase = scrubbedPhaseOf(lens);
  if (phase !== null) return `serve a need scheduled in ${phase}`;
  const need = index.need(tracedNeedOf(lens) ?? '');
  return need ? `serve the need ${need.id}, ${need.label}` : null;
}

/** Whether the decision classes chosen are exactly those of "committed only". */
const isCommittedOnly = (filters: Filters): boolean =>
  filters.decision.length === COMMITTED_ONLY.length && COMMITTED_ONLY.every((each) => filters.decision.includes(each));

export interface FilterPanel {
  /** The part's own element in the rail, for the icon that opens it. */
  readonly element: HTMLElement;
  /** Opens the filters if they are folded, and puts the keyboard focus on "committed only", their first control. */
  focus(): void;
}

/** @param before The part of the rail the filters stand above. */
export function mountFilterPanel(parent: HTMLElement, before: Node, index: GraphIndex, store: Store): FilterPanel {
  const total = index.tools.length;

  // The count is a live region, so a change of filter or of lens is said as well as shown.
  const count = element('p', 'filters-count');
  count.setAttribute('role', 'status');

  const committed = element('input', null);
  committed.type = 'checkbox';
  committed.addEventListener('change', () => store.setFilter('decision', committed.checked ? COMMITTED_ONLY : []));
  const committedLabel = element('label', 'filters-committed', committed, 'Committed only');
  // Said to assistive technology as well as shown on hover: these are not the legend's "Committed" step.
  const chooses = `Chooses the decision classes ${COMMITTED_ONLY.join(', ')}`;
  committedLabel.title = chooses;
  committed.setAttribute('aria-description', chooses);

  // The control is there only while there is something to clear. Once it has cleared, the focus goes to its neighbour.
  const clear = element('button', 'filters-clear', 'Clear');
  clear.type = 'button';
  clear.setAttribute('aria-label', 'Clear all filters');
  clear.addEventListener('click', () => {
    store.clearFilters();
    committed.focus();
  });

  /** What a change of the filters brings up to date in each filter's own part of the panel. */
  const updates: ((filters: Filters) => void)[] = [];

  const sections = FILTER_NAMES.map((name) => {
    const chosen = element('span', 'filter-chosen');
    const chevron = createElement(ChevronRight);
    chevron.setAttribute('aria-hidden', 'true');
    chevron.classList.add('filter-chevron');
    const toggle = element('button', 'filter-toggle', chevron, element('span', 'filter-name', FILTER_TITLES[name]), chosen);
    toggle.type = 'button';

    const boxes = new Map<string, HTMLInputElement>();
    const values = element(
      'ul',
      'filter-values',
      ...index.filterValues(name).map((value) => {
        const box = element('input', null);
        box.type = 'checkbox';
        box.addEventListener('change', () => store.toggleFilter(name, value));
        boxes.set(value, box);
        return element(
          'li',
          null,
          element(
            'label',
            'filter-value',
            box,
            element('span', 'filter-value-name', valueName(index, name, value)),
            // A decision class shows the form of its step, away from the checkbox, which is a square too.
            name === 'decision' && swatch(value),
            element('span', 'filter-value-count', String(index.toolCountWith(name, value)), element('span', 'visually-hidden', ' tools')),
          ),
        );
      }),
    );
    values.id = `filter-${name}`;
    values.setAttribute('aria-label', FILTER_TITLES[name]);
    toggle.setAttribute('aria-controls', values.id);

    const setOpen = (open: boolean): void => {
      values.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    };
    setOpen(store.get().filters[name].length > 0);
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

    updates.push((filters) => {
      for (const [value, box] of boxes) box.checked = filters[name].includes(value);
      const number = filters[name].length;
      chosen.textContent = number > 0 ? String(number) : '';
      chosen.hidden = number === 0;
      toggle.setAttribute(
        'aria-label',
        number > 0 ? `${FILTER_TITLES[name]}, ${number} chosen` : FILTER_TITLES[name],
      );
    });
    return element('div', 'filter', toggle, values);
  });

  const heading = element('h2', 'rail-heading', 'Filters');
  heading.id = 'filters-heading';
  const panel = element(
    'section',
    'filters',
    element('div', 'filters-head', heading, count),
    element('div', 'filters-actions', committedLabel, clear),
    element('div', 'filters-list', ...sections),
  );
  panel.setAttribute('aria-labelledby', heading.id);
  parent.insertBefore(panel, before);
  // While the need list is on show the filters fold to their heading and their count.
  const fold = mountFold(panel, heading, store);

  function render({ lens, filters }: MapState): void {
    // The filters apply on top of the lens, so the count is of the tools at full strength under both.
    const atFullStrength = index.emphasised({ lens, filters }).size;
    // What assistive technology hears after the numbers: why these tools are the ones at full strength.
    const reasons = [reasonInReach(index, lens), isFiltered(filters) && 'pass the filters'].filter(Boolean);
    const explanation = `${reasons.length > 0 ? ` ${reasons.join(' and ')}` : ''}${isFiltered(filters) ? '' : ', no filter chosen'}`;
    count.replaceChildren(`${atFullStrength} of ${total} tools`, element('span', 'visually-hidden', explanation));
    committed.checked = isCommittedOnly(filters);
    clear.hidden = !isFiltered(filters);
    for (const update of updates) update(filters);
  }

  render(store.get());
  store.subscribe((state, previous) => {
    if (state.filters !== previous.filters || state.lens !== previous.lens) render(state);
  });
  return {
    element: panel,
    focus() {
      fold.open();
      committed.focus();
    },
  };
}
