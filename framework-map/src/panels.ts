/**
 * panels: the DOM interface around the canvas.
 *
 * So far: the left rail with the title, the search box, the lens switch, the
 * need list, the filters, the outline and the build stamp, and the icons it
 * stands as in every page layout but the full one; the breadcrumb; the detail
 * card; the legend; the phase strip; the line that says what to choose; the
 * list of keys; and the keys that work anywhere. All read the state store and
 * write to it; none knows the scene. Where each stands in a page layout is
 * for src/styles.css, from what src/page-layout.ts names on the page.
 */
import { ChevronRight, Eye, Keyboard, ListFilter, ListTree, Search, Target, createElement } from 'lucide';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { mountAnnouncer } from './announcer';
import { buildStamp } from './build-stamp';
import { mountDetailCard } from './detail-card';
import { element, iconButton } from './dom';
import { mountFilterPanel } from './filter-panel';
import { mountKeyList } from './key-list';
import { mountLegend } from './legend';
import { mountLensPanel } from './lens-panel';
import { mountNeedList } from './need-list';
import { mountOutline } from './outline';
import { followWindow, namesFitFor, underBarAt, windowNow } from './page-layout';
import { mountPhaseStrip } from './phase-strip';
import { mountRailCollapse } from './rail-collapse';
import { createSearch } from './search';
import { mountSearchBox } from './search-box';
import { isFiltered, listsNeeds, tracedNeedOf } from './state';
import type { MapState, Store } from './state';

interface Crumb {
  label: string;
  go: () => void;
}

/** The parts of the breadcrumb for a state: the stack, then the focused tier, then the focused cluster. */
function crumbsOf(state: MapState, index: GraphIndex, store: Store): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Stack', go: () => store.focusStack() }];
  const tier = state.tier ? index.tier(state.tier) : undefined;
  if (tier) crumbs.push({ label: tier.label, go: () => store.focusTier(tier.id) });
  const cluster = state.cluster ? index.cluster(state.cluster) : undefined;
  if (cluster) crumbs.push({ label: cluster.label, go: () => store.focusCluster(cluster.id) });
  return crumbs;
}

/** Adds the breadcrumb to the page and keeps it in step with the store. */
function mountBreadcrumb(app: HTMLElement, index: GraphIndex, store: Store): void {
  const nav = document.createElement('nav');
  nav.className = 'breadcrumb';
  nav.setAttribute('aria-label', 'Where you are in the stack');
  const list = document.createElement('ol');
  nav.append(list);
  app.append(nav);

  function render(state: MapState): void {
    // A crumb that had the keyboard focus keeps it, if its place is still there.
    const focused = [...list.querySelectorAll('button')].indexOf(document.activeElement as HTMLButtonElement);
    const crumbs = crumbsOf(state, index, store);
    const items = crumbs.map((crumb, i) => {
      const item = document.createElement('li');
      if (i > 0) {
        const separator = createElement(ChevronRight);
        separator.setAttribute('aria-hidden', 'true');
        separator.classList.add('breadcrumb-separator');
        item.append(separator);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = crumb.label;
      button.title = crumb.label;
      if (i === crumbs.length - 1) button.setAttribute('aria-current', 'location');
      button.addEventListener('click', crumb.go);
      item.append(button);
      return item;
    });
    list.replaceChildren(...items);
    if (focused >= 0) list.querySelectorAll('button')[Math.min(focused, crumbs.length - 1)]?.focus();
  }

  render(store.get());
  store.subscribe(render);
}

/** A key press that belongs to a field the partner is typing in. A checkbox or a radio button takes no typing. */
const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  !(target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * What the line under the breadcrumb says for a state in a window, or null where it has nothing
 * to say. It is the one sign on the canvas of a need trace that waits for its need. Under the
 * bar it also says what to choose where the names of the clusters or of the tools have no room
 * on the canvas, and nothing is selected yet.
 */
function hintFor(state: MapState, index: GraphIndex, constants: Constants): string | null {
  if (state.lens?.type === 'need' && state.lens.need === null) return 'The need trace is on. Choose a need in the rail to trace it.';
  const size = windowNow();
  if (!underBarAt(size, constants) || state.selection !== null || namesFitFor(state, index, size, constants)) return null;
  return state.distance === 'tier' ? 'Choose a cell to read its cluster.' : 'Choose a mark to read its tool.';
}

/** What the page's start needs from the panels once they are mounted. */
export interface Panels {
  /** Measures the window again, for when a constant has changed. */
  applyConstants(): void;
}

/**
 * Adds the interface around the canvas, and the keys that work anywhere on the page.
 * @param buildId The build identifier, for the build stamp at the foot of the rail.
 */
export function mountPanels(
  app: HTMLElement,
  index: GraphIndex,
  store: Store,
  constants: Constants,
  buildId: string,
): Panels {
  // The rail is put in the page before the breadcrumb and the detail card, so Tab reaches
  // the search, the filters and the outline first.
  const rail = element('div', 'rail');
  const title = app.querySelector('.title');
  if (title) rail.append(title);
  app.append(rail);

  const keyList = mountKeyList(app);
  const keys = element('button', 'rail-keys', 'Keys', element('kbd', null, '?'));
  keys.type = 'button';
  keys.setAttribute('aria-label', 'Show the list of keys');
  keys.addEventListener('click', () => keyList.open());
  const foot = element('footer', 'rail-foot', keys, buildStamp(index.graph.meta.generated, buildId));
  rail.append(foot);
  const outline = mountOutline(rail, foot, index, store);

  mountBreadcrumb(app, index, store);
  // A card that closes under the partner's hands hands the focus to the outline, at the row for where the map is.
  // While the need list is on show the outline is folded, and the focus goes to the need list.
  // While the rail stands as icons, the icon of that part takes the focus.
  const card = mountDetailCard(app, index, store, constants, () =>
    railCollapse.handFocus(listsNeeds(store.get().lens) ? 'needs' : 'outline'),
  );

  const nodes = index.graph.nodes;
  const search = createSearch({
    tools: nodes.filter((node) => node.type === 'tool'),
    clusters: nodes.filter((node) => node.type === 'cluster'),
    needs: nodes.filter((node) => node.type === 'need'),
  });
  // A chosen result opens its detail card, and the focus goes there to read it.
  const searchBox = mountSearchBox(rail, outline.element, index, search, store, () => card.focus());
  // The lens switch, the need list and then the filters stand between the search box and the outline.
  const lensPanel = mountLensPanel(rail, outline.element, index, store);
  const focusLens = (): void => railCollapse.handFocus('lens');
  const needList = mountNeedList(rail, outline.element, index, store, focusLens);
  const filterPanel = mountFilterPanel(rail, outline.element, index, store);
  const legend = mountLegend(app, store);
  // In every page layout but the full one the rail stands as icons, one for each of these parts: a
  // column of them in the compact layout, and a bar across the top in the narrow and the upright one.
  const keysIcon = iconButton('rail-icon rail-icon-foot', Keyboard, 'Keys (key ?)');
  keysIcon.addEventListener('click', () => keyList.open());
  const railCollapse = mountRailCollapse(
    rail,
    [
      { id: 'search', icon: Search, label: 'Search (key /)', element: searchBox.element, focus: () => searchBox.focus() },
      {
        id: 'lens',
        icon: Eye,
        label: 'Lens',
        element: lensPanel.element,
        focus: () => lensPanel.focus(),
        on: (state) => state.lens !== null,
      },
      {
        id: 'needs',
        icon: Target,
        label: 'Needs',
        element: needList.element,
        focus: () => needList.focus(),
        // A need is chosen beside the lens switch that listed it.
        opensWith: 'lens',
        when: (state) => listsNeeds(state.lens),
      },
      {
        id: 'filters',
        icon: ListFilter,
        label: 'Filters',
        element: filterPanel.element,
        focus: () => filterPanel.focus(),
        on: (state) => isFiltered(state.filters),
      },
      { id: 'outline', icon: ListTree, label: 'Outline', element: outline.element, focus: () => outline.focus() },
    ],
    // The legend's icon is in the bar only, and the build stamp and the icon for the keys in the column only.
    [legend.toggle, buildStamp(index.graph.meta.generated, buildId, true), keysIcon],
    store,
  );
  const measureWindow = followWindow(constants, (layout) => railCollapse.setLayout(layout));

  const phaseStrip = mountPhaseStrip(app, index, store, constants, focusLens);
  // The line under the breadcrumb. It follows the window as well as the store: what has room in one window has none in another.
  const hint = element('p', 'canvas-hint');
  const showHint = (): void => {
    const text = hintFor(store.get(), index, constants);
    hint.hidden = text === null;
    if (text !== null) hint.textContent = text;
  };
  app.append(hint);
  showHint();
  store.subscribe(showHint);
  window.addEventListener('resize', showHint);
  mountAnnouncer(app, index, store);

  document.addEventListener('keydown', (event) => {
    // A held key acts once. The open list of keys takes its own Escape, and no other key.
    if (event.defaultPrevented || event.repeat || keyList.isOpen()) return;
    if (event.key === 'Escape') {
      // Closes the detail card if it is open, and otherwise steps out one distance.
      store.stepBack();
      return;
    }
    if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === '/') {
      event.preventDefault();
      railCollapse.open('search');
    } else if (event.key === '?') {
      event.preventDefault();
      keyList.open();
    } else if (event.key === '1') {
      store.clearLens();
    } else if (event.key === '2') {
      // The role lens comes back with the role it last showed.
      store.showRoleLens();
    } else if (event.key === '3') {
      // The need trace comes back with the need it last showed. With none yet, the need list takes the focus.
      store.showNeedTrace();
      if (tracedNeedOf(store.get().lens) === null) railCollapse.open('needs');
    } else if (event.key === '4') {
      // The phase scrub comes back at the phase it last showed. The strip takes the focus, so the arrow keys step it at once.
      store.showPhaseScrub();
      phaseStrip.focus();
    }
  });
  return { applyConstants: measureWindow };
}
