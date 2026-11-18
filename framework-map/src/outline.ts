/**
 * outline: the tree of tiers, clusters and tools in the left rail. It is the
 * accessible equivalent of the canvas: every tool can be reached through it
 * with the keyboard alone, and it stays in step with the selection.
 *
 * It is one of the panels: it reads the state store and writes to it, and
 * knows nothing of the scene.
 *
 * A tool the lens or the filters leave out is dimmed, and so is a cluster or
 * a tier with no tool left in. A dimmed row can still be chosen. While a lens
 * is on, the count of a tier or a cluster is of its tools in reach.
 *
 * Tiers start open and clusters closed. A cluster's tool rows are made when it
 * is first opened, so the page opens with 63 rows and not 815.
 */
import { ChevronRight, createElement } from 'lucide';
import type { GraphIndex } from './data';
import { decisionStep, fadedName } from './display';
import { dressSwatch, element, swatch } from './dom';
import type { ClusterNode, TierNode, ToolNode } from './graph';
import { inGridOrder } from './layout';
import { mountFold } from './rail-fold';
import { narrows } from './state';
import type { MapState, Store } from './state';

const count = (tools: number): string => (tools === 1 ? '1 tool' : `${tools} tools`);

export interface Outline {
  /** The outline's own element, for a panel that stands above it in the rail. */
  readonly element: HTMLElement;
  /** Puts the keyboard focus on the row for where the map is. */
  focus(): void;
}

/** @param before The part of the rail the outline stands above. */
export function mountOutline(parent: HTMLElement, before: Node, index: GraphIndex, store: Store): Outline {
  const tree = element('ul', 'outline-tree');
  tree.setAttribute('role', 'tree');
  tree.setAttribute('aria-label', 'Tiers, clusters and tools');

  /** Each tier, cluster and tool row, by its id. Tool rows join as their clusters open. */
  const itemOf = new Map<string, HTMLLIElement>();
  /** What a row does when it is chosen: go to the tier, or select the cluster or tool. */
  const chooseOf = new WeakMap<HTMLElement, () => void>();
  /** Makes a closed cluster's tool rows. */
  const fillOf = new WeakMap<HTMLElement, () => void>();

  /** The tools each row stands for: itself, or those of its cluster or tier. A row dims when the lens and the filters leave none in. */
  const toolsOf = new Map<string, readonly ToolNode[]>();
  /** Each row's name for assistive technology, before its count and its faded state are added to it. */
  const labelOf = new WeakMap<HTMLElement, string>();
  /** The count at the end of a tier's or a cluster's row. */
  const countOf = new WeakMap<HTMLElement, HTMLElement>();

  /**
   * Brings a row in step with the lens and the filters: dims it or brings it
   * back, and counts a tier's or a cluster's tools in reach while a lens is on.
   */
  function dress(row: HTMLLIElement, state: MapState): void {
    const tools = toolsOf.get(row.dataset.id ?? '') ?? [];
    const shown = index.emphasised(state);
    const out = !tools.some((tool) => shown.has(tool.id));
    const reach = index.inReach(state.lens);
    const inReach = tools.filter((tool) => reach.has(tool.id)).length;
    let label = labelOf.get(row) ?? '';
    const counter = countOf.get(row);
    if (counter) {
      counter.textContent = String(inReach);
      label += narrows(state.lens) ? `, ${inReach} of ${count(tools.length)} in reach` : `, ${count(tools.length)}`;
    }
    // The row is named for what leaves it out: the lens, where none of its tools is in reach, or else the filters.
    const outOfReach = narrows(state.lens) && inReach === 0;
    if (out) label += `, ${fadedName(outOfReach, !outOfReach).toLowerCase()}`;
    row.setAttribute('aria-label', label);
    if (out === (row.dataset.faded === 'true')) return;
    if (out) row.dataset.faded = 'true';
    else delete row.dataset.faded;
    // A tool's square fades as its mark does.
    const square = row.querySelector<HTMLElement>(':scope > .outline-row > .swatch');
    if (square && tools[0]) dressSwatch(square, decisionStep(tools[0].decision_class), out);
  }

  function item(
    id: string,
    level: number,
    position: number,
    setSize: number,
    label: string,
    tools: readonly ToolNode[],
    choose: () => void,
    counter: HTMLElement | null,
    ...row: (Node | string)[]
  ): HTMLLIElement {
    if (counter) row.push(counter);
    const made = element('li', 'outline-item', element('div', 'outline-row', ...row));
    made.setAttribute('role', 'treeitem');
    made.setAttribute('aria-level', String(level));
    made.setAttribute('aria-posinset', String(position + 1));
    made.setAttribute('aria-setsize', String(setSize));
    made.setAttribute('aria-selected', 'false');
    made.tabIndex = -1;
    made.dataset.id = id;
    itemOf.set(id, made);
    chooseOf.set(made, choose);
    toolsOf.set(id, tools);
    labelOf.set(made, label);
    if (counter) countOf.set(made, counter);
    // A row made while a lens or a filter is on starts in step with it.
    dress(made, store.get());
    return made;
  }

  function chevron(): SVGElement {
    const made = createElement(ChevronRight);
    made.setAttribute('aria-hidden', 'true');
    made.classList.add('outline-chevron');
    return made;
  }

  /** A row that opens: its children stand in a group under it. */
  function branch(made: HTMLLIElement, open: boolean, children: () => HTMLLIElement[]): HTMLLIElement {
    const group = element('ul', 'outline-group');
    group.setAttribute('role', 'group');
    group.hidden = !open;
    made.setAttribute('aria-expanded', String(open));
    made.append(group);
    const fill = (): void => {
      if (group.childElementCount === 0) group.append(...children());
    };
    if (open) fill();
    else fillOf.set(made, fill);
    return made;
  }

  const toolItem = (tool: ToolNode, position: number, setSize: number): HTMLLIElement =>
    item(
      tool.id,
      3,
      position,
      setSize,
      `${tool.label}, ${decisionStep(tool.decision_class)}`,
      [tool],
      () => store.select(tool.id),
      null,
      swatch(tool.decision_class),
      element('span', 'outline-name', tool.label),
    );

  function clusterItem(cluster: ClusterNode, position: number, setSize: number): HTMLLIElement {
    const tools = inGridOrder(index.toolsOf(cluster.id));
    return branch(
      item(
        cluster.id,
        2,
        position,
        setSize,
        `${cluster.id}, ${cluster.label}`,
        tools,
        () => store.select(cluster.id),
        element('span', 'outline-count'),
        chevron(),
        element('span', 'outline-tag', cluster.id),
        element('span', 'outline-name', cluster.label),
      ),
      false,
      () => tools.map((tool, at) => toolItem(tool, at, tools.length)),
    );
  }

  function tierItem(tier: TierNode, position: number): HTMLLIElement {
    const clusters = index.clustersOf(tier.id);
    return branch(
      item(
        tier.id,
        1,
        position,
        index.tiers.length,
        `${tier.id}, ${tier.label}`,
        clusters.flatMap((cluster) => index.toolsOf(cluster.id)),
        () => store.focusTier(tier.id),
        element('span', 'outline-count'),
        chevron(),
        element('span', 'outline-tag', tier.id),
        element('span', 'outline-name', tier.label),
      ),
      true,
      () => clusters.map((cluster, at) => clusterItem(cluster, at, clusters.length)),
    );
  }

  tree.append(...index.tiers.map(tierItem));

  const isOpen = (row: HTMLElement): boolean => row.getAttribute('aria-expanded') === 'true';
  const opens = (row: HTMLElement): boolean => row.hasAttribute('aria-expanded');
  const parentOf = (row: HTMLElement): HTMLLIElement | null =>
    row.parentElement?.closest<HTMLLIElement>('[role="treeitem"]') ?? null;
  const groupOf = (row: HTMLElement): HTMLElement | null => row.querySelector<HTMLElement>(':scope > [role="group"]');

  function setOpen(row: HTMLLIElement, open: boolean): void {
    if (!opens(row) || isOpen(row) === open) return;
    if (open) fillOf.get(row)?.();
    row.setAttribute('aria-expanded', String(open));
    const group = groupOf(row);
    if (group) group.hidden = !open;
    // A row that closes over the active row takes its place, so Tab still finds the tree.
    if (!open && active !== row && row.contains(active)) setActive(row, row.contains(document.activeElement));
  }

  /** The rows on show, from the top: those with no closed row above them. */
  const shown = (): HTMLLIElement[] =>
    [...tree.querySelectorAll<HTMLLIElement>('[role="treeitem"]')].filter((row) => !row.closest('[hidden]'));

  /** The one row Tab stops at. The arrow keys move it. */
  let active: HTMLLIElement = tree.querySelector<HTMLLIElement>('[role="treeitem"]')!;
  active.tabIndex = 0;
  function setActive(row: HTMLLIElement, focus: boolean): void {
    active.tabIndex = -1;
    active = row;
    active.tabIndex = 0;
    if (focus) active.focus();
  }

  tree.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const row = (event.target as HTMLElement).closest<HTMLLIElement>('[role="treeitem"]');
    if (!row) return;
    const rows = shown();
    const at = rows.indexOf(row);
    const moveTo = (next: HTMLLIElement | null | undefined): void => {
      if (next) setActive(next, true);
    };
    switch (event.key) {
      case 'ArrowDown':
        moveTo(rows[at + 1]);
        break;
      case 'ArrowUp':
        moveTo(rows[at - 1]);
        break;
      case 'Home':
        moveTo(rows[0]);
        break;
      case 'End':
        moveTo(rows[rows.length - 1]);
        break;
      case 'ArrowRight':
        // Opens a closed row; on an open one, goes to its first child.
        if (!opens(row)) break;
        if (isOpen(row)) moveTo(groupOf(row)?.querySelector<HTMLLIElement>('[role="treeitem"]'));
        else setOpen(row, true);
        break;
      case 'ArrowLeft':
        // Closes an open row; on a closed one or a tool, goes to its parent.
        if (opens(row) && isOpen(row)) setOpen(row, false);
        else moveTo(parentOf(row));
        break;
      case 'Enter':
      case ' ':
        chooseOf.get(row)?.();
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  tree.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    // A click in a group's own padding is on no row.
    if (!target.closest('.outline-row')) return;
    const row = target.closest<HTMLLIElement>('[role="treeitem"]');
    if (!row) return;
    setActive(row, true);
    // The chevron opens and closes its row. The rest of the row chooses it, and opens it.
    if (target.closest('.outline-chevron')) {
      setOpen(row, !isOpen(row));
      return;
    }
    setOpen(row, true);
    chooseOf.get(row)?.();
  });

  let selected: HTMLLIElement | null = null;

  /** Opens the rows above a row, so that it is on show. */
  function reveal(row: HTMLLIElement): void {
    for (let above = parentOf(row); above; above = parentOf(above)) setOpen(above, true);
  }

  /** Brings the tree in step with the map: opens and marks the selected row, and scrolls to it. */
  function follow(state: MapState): void {
    const selection = state.selection && state.selection.type !== 'need' ? state.selection : null;
    // The focused cluster is opened, as its tools are named on the canvas. A selected
    // tool's row is made only then.
    const cluster = itemOf.get(state.cluster ?? '');
    if (cluster) {
      reveal(cluster);
      setOpen(cluster, true);
    }
    const next = selection ? (itemOf.get(selection.id) ?? null) : null;
    if (selected !== next) {
      selected?.setAttribute('aria-selected', 'false');
      next?.setAttribute('aria-selected', 'true');
      selected = next;
    }
    // With nothing selected, the tree still follows the map to the focused tier or cluster.
    const here = next ?? cluster ?? itemOf.get(state.tier ?? '') ?? null;
    // The row for where the map is, when it is not the selected row, is marked as the place.
    const place = here !== next ? here : null;
    if (current !== place) {
      current?.removeAttribute('aria-current');
      place?.setAttribute('aria-current', 'location');
      current = place;
    }
    followed = here;
    if (!here) return;
    reveal(here);
    // The active row follows the map unless the partner is moving through the tree.
    if (!tree.contains(document.activeElement)) setActive(here, false);
    scrollToRow();
  }

  /** The row marked as where the map is, and the row the tree last followed the map to. */
  let current: HTMLLIElement | null = null;
  let followed: HTMLLIElement | null = null;

  /**
   * Scrolls to the followed row. A tier or cluster goes to the top, so that the rows under it
   * fill the tree; a tool out of view goes to the middle, among its cluster's other tools. While
   * the partner is moving through the tree, the row moves no further than into view.
   */
  function scrollToRow(): void {
    const row = followed?.querySelector(':scope > .outline-row');
    if (!followed || !row) return;
    if (tree.contains(document.activeElement)) {
      row.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (opens(followed)) {
      row.scrollIntoView({ block: 'start' });
      return;
    }
    const { top, bottom } = row.getBoundingClientRect();
    const view = tree.getBoundingClientRect();
    if (top < view.top || bottom > view.bottom) row.scrollIntoView({ block: 'center' });
  }
  // The tree's height changes as the rail is put together and as the window changes, and the row stays in view.
  new ResizeObserver(scrollToRow).observe(tree);

  const heading = element('h2', 'rail-heading', 'Outline');
  const nav = element('nav', 'outline', heading, tree);
  nav.setAttribute('aria-label', 'Outline');
  // The canvas names this element as its equivalent, with `aria-details` in framework-map.html.
  nav.id = 'outline';
  parent.insertBefore(nav, before);
  // While the need list is on show the outline folds to its heading, to give the list the rail's height.
  const fold = mountFold(nav, heading, store);

  follow(store.get());
  store.subscribe((state, previous) => {
    if (state.filters !== previous.filters || state.lens !== previous.lens) {
      for (const row of itemOf.values()) dress(row, state);
    }
    // A change of lens or filter alone leaves the tree where the partner has scrolled it.
    const stayed =
      state.distance === previous.distance &&
      state.tier === previous.tier &&
      state.cluster === previous.cluster &&
      state.selection === previous.selection;
    if (!stayed) follow(state);
  });
  return {
    element: nav,
    focus() {
      fold.open();
      active.focus();
    },
  };
}
