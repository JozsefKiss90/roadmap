/**
 * search-box: the search field at the top of the left rail, and the list of
 * what it finds, grouped as tools, clusters and needs. Choosing a result
 * selects it, which flies to it and opens its detail card.
 *
 * It is one of the panels: it reads the search index and writes to the state
 * store, and knows nothing of the scene. To assistive technology it is a
 * combobox with a list of options.
 */
import { Search as SearchIcon, createElement } from 'lucide';
import type { GraphIndex } from './data';
import { element, swatch } from './dom';
import type { Search, SearchResults } from './search';
import type { Store } from './state';

type Group = keyof SearchResults;

/** The most results a group lists; the list scrolls. Its heading gives the number found. */
const MOST_IN_GROUP: Readonly<Record<Group, number>> = { tools: 20, clusters: 8, needs: 8 };

/** Each group's heading, and its name for one result and for several. */
const GROUPS: readonly (readonly [Group, string, string, string])[] = [
  ['tools', 'Tools', 'tool', 'tools'],
  ['clusters', 'Clusters', 'cluster', 'clusters'],
  ['needs', 'Needs', 'need', 'needs'],
];

export interface SearchBox {
  /** The part's own element in the rail, for the icon that opens it. */
  readonly element: HTMLElement;
  focus(): void;
}

/**
 * @param before The part of the rail the search box stands above.
 * @param onChosen Called after a result is chosen and selected, so the focus can go to its detail card.
 */
export function mountSearchBox(
  parent: HTMLElement,
  before: Node,
  index: GraphIndex,
  search: Search,
  store: Store,
  onChosen: () => void,
): SearchBox {
  const input = element('input', 'search-input');
  input.type = 'search';
  input.placeholder = 'Search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-label', 'Search tools, clusters and needs');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'search-results');

  const icon = createElement(SearchIcon);
  icon.setAttribute('aria-hidden', 'true');
  icon.classList.add('search-icon');
  const hint = element('kbd', 'search-key', '/');
  hint.setAttribute('aria-hidden', 'true');

  const list = element('div', 'search-list');
  list.id = 'search-results';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Search results');
  const none = element('p', 'search-none');
  const results = element('div', 'search-results', list, none);
  results.hidden = true;
  // Says how many results there are, for a partner who cannot see the list.
  const status = element('div', 'visually-hidden');
  status.setAttribute('role', 'status');

  const box = element('div', 'search', element('div', 'search-field', icon, input, hint), results, status);
  box.setAttribute('role', 'search');
  parent.insertBefore(box, before);

  let options: HTMLElement[] = [];
  let active = -1;

  function setActive(next: number): void {
    options[active]?.setAttribute('aria-selected', 'false');
    active = next;
    const option = options[active];
    if (!option) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    option.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  function close(): void {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }

  /** One result: its name, with a tag for its place, over a line that says what it is. */
  function optionFor(group: Group, id: string): HTMLElement | null {
    let lead: Node;
    let name: string;
    let place: string | null = null;
    let line: string;
    if (group === 'tools') {
      const tool = index.tool(id);
      if (!tool) return null;
      lead = swatch(tool.decision_class);
      name = tool.label;
      place = tool.cluster;
      line = tool.capability;
    } else if (group === 'clusters') {
      const cluster = index.cluster(id);
      if (!cluster) return null;
      lead = element('span', 'search-tag', cluster.id);
      name = cluster.label;
      line = index.tier(cluster.tier)?.label ?? cluster.tier;
    } else {
      const need = index.need(id);
      if (!need) return null;
      lead = element('span', 'search-tag', need.id);
      name = need.label;
      line = [need.domain, need.phase].filter(Boolean).join(' · ');
    }
    const option = element(
      'div',
      'search-option',
      element(
        'span',
        'search-option-head',
        lead,
        element('span', 'search-name', name),
        place && element('span', 'search-tag search-place', place),
      ),
      line && element('span', 'search-line', line),
    );
    option.id = `search-option-${options.length}`;
    option.dataset.id = id;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    options.push(option);
    return option;
  }

  /** Lists what the field's words find. An empty field closes the list. */
  function render(): void {
    const query = input.value.trim();
    options = [];
    active = -1;
    if (query === '') {
      list.replaceChildren();
      status.textContent = '';
      close();
      return;
    }
    const found = search(query);
    const groups: HTMLElement[] = [];
    const counts: string[] = [];
    for (const [group, heading, one, many] of GROUPS) {
      const ids = found[group];
      if (ids.length === 0) continue;
      const listed = ids.slice(0, MOST_IN_GROUP[group]);
      counts.push(`${ids.length} ${ids.length === 1 ? one : many}`);
      const title = element(
        'div',
        'rail-heading search-heading',
        heading,
        element('span', 'search-count', listed.length < ids.length ? `${listed.length} of ${ids.length}` : String(ids.length)),
      );
      title.id = `search-group-${group}`;
      const made = element('div', 'search-group', title, ...listed.map((id) => optionFor(group, id)));
      made.setAttribute('role', 'group');
      made.setAttribute('aria-labelledby', title.id);
      groups.push(made);
    }
    list.replaceChildren(...groups);
    list.hidden = groups.length === 0;
    none.hidden = groups.length > 0;
    none.textContent = `Nothing matches “${query}”. Try a word from a name, or from what a tool does.`;
    status.textContent = groups.length > 0 ? `Found ${counts.join(', ')}.` : `Nothing matches ${query}.`;
    results.hidden = false;
    // With nothing found there is no list to be open; the status says so.
    input.setAttribute('aria-expanded', String(groups.length > 0));
    list.scrollTop = 0;
    // The best match is ready for Enter.
    setActive(options.length > 0 ? 0 : -1);
  }

  function choose(option: HTMLElement | undefined): void {
    const id = option?.dataset.id;
    if (id === undefined) return;
    input.value = '';
    render();
    store.select(id);
    onChosen();
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', () => {
    if (input.value.trim() !== '' && results.hidden) render();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (options.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      // An Enter that ends the composing of a letter is not a choice.
      if (active < 0 || event.isComposing) return;
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === 'Escape' && input.value !== '') {
      // Escape clears the search first. The page's own Escape waits for the next press.
      event.preventDefault();
      input.value = '';
      render();
    }
  });
  // The list closes when the focus leaves the search, and keeps what was typed.
  box.addEventListener('focusout', (event) => {
    if (!box.contains(event.relatedTarget as Node | null)) close();
  });
  // A press on a result must not take the focus from the field before the click lands.
  results.addEventListener('mousedown', (event) => event.preventDefault());
  results.addEventListener('click', (event) => {
    choose((event.target as HTMLElement).closest<HTMLElement>('[role="option"]') ?? undefined);
  });

  return { element: box, focus: () => input.focus() };
}
