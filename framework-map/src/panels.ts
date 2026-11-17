/**
 * panels: the DOM interface around the canvas.
 *
 * So far: the left rail with the title, the search box, the lens switch, the
 * need list, the filters and the outline; the breadcrumb at the top centre; the detail card on the right;
 * the legend at the bottom left; the phase strip at the bottom; the list of keys; and the keys that work
 * anywhere. All read the state store and write
 * to it; none knows the scene.
 */
import { ChevronRight, createElement } from 'lucide';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { mountAnnouncer } from './announcer';
import { mountDetailCard } from './detail-card';
import { element } from './dom';
import { mountFilterPanel } from './filter-panel';
import { mountKeyList } from './key-list';
import { mountLegend } from './legend';
import { mountLensPanel } from './lens-panel';
import { mountNeedList } from './need-list';
import { mountOutline } from './outline';
import { mountPhaseStrip } from './phase-strip';
import { createSearch } from './search';
import { mountSearchBox } from './search-box';
import { listsNeeds, tracedNeedOf } from './state';
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

/** Adds the interface around the canvas, and the keys that work anywhere on the page. */
export function mountPanels(app: HTMLElement, index: GraphIndex, store: Store, constants: Constants): void {
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
  const foot = element('footer', 'rail-foot', keys);
  rail.append(foot);
  const outline = mountOutline(rail, foot, index, store);

  mountBreadcrumb(app, index, store);
  // A card that closes under the partner's hands hands the focus to the outline, at the row for where the map is.
  // While the need list is on show the outline is folded, and the focus goes to the need list.
  const card = mountDetailCard(app, index, store, constants, () =>
    listsNeeds(store.get().lens) ? needList.focus() : outline.focus(),
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
  const needList = mountNeedList(rail, outline.element, index, store, () => lensPanel.focus());
  mountFilterPanel(rail, outline.element, index, store);

  mountLegend(app, store);
  const phaseStrip = mountPhaseStrip(app, index, store, () => lensPanel.focus());
  // The trace with no need chosen changes nothing on the canvas, so the canvas says that it is on.
  const hint = element('p', 'canvas-hint', 'The need trace is on. Choose a need in the rail to trace it.');
  const showHint = (): void => {
    const { lens } = store.get();
    hint.hidden = !(lens?.type === 'need' && lens.need === null);
  };
  app.append(hint);
  showHint();
  store.subscribe(showHint);
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
      searchBox.focus();
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
      if (tracedNeedOf(store.get().lens) === null) needList.focus();
    } else if (event.key === '4') {
      // The phase scrub comes back at the phase it last showed. The strip takes the focus, so the arrow keys step it at once.
      store.showPhaseScrub();
      phaseStrip.focus();
    }
  });
}
