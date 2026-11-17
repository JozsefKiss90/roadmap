/**
 * panels: the DOM interface around the canvas.
 *
 * So far: the breadcrumb at the top centre, the detail card on the right, and
 * the Escape key. All read the state store and write to it; none knows the
 * scene.
 */
import { ChevronRight, createElement } from 'lucide';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { mountDetailCard } from './detail-card';
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

/** Adds the interface around the canvas, and the keys that work anywhere on the page. */
export function mountPanels(app: HTMLElement, index: GraphIndex, store: Store, constants: Constants): void {
  mountBreadcrumb(app, index, store);
  mountDetailCard(app, index, store, constants);
  document.addEventListener('keydown', (event) => {
    // A held key steps back once, not all the way.
    if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
    // Closes the detail card if it is open, and otherwise steps out one distance.
    store.stepBack();
  });
}
