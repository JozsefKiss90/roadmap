/**
 * rail-collapse: the rail as icons, in every page layout but the full one.
 *
 * In the compact layout the canvas needs the rail's room. So the rail stands
 * as a column of icons, one for each of its parts, and the picture is fitted
 * to the room beside that column. An icon opens the rail over the canvas and
 * goes to its part.
 *
 * In the narrow and the upright layout there is no room for a column either.
 * The icons stand in a bar across the top, and an icon opens its own part of
 * the rail over the canvas, alone: a small window has no room for the parts
 * to share. The lens switch and the need list open together, because a need
 * is chosen there. Choosing something that the map goes to closes the open
 * part, so that the map is in sight again.
 *
 * The open rail closes with its own button, with a press on the page outside
 * it, or when the keyboard focus leaves it.
 *
 * In the full layout the rail is always open and the icons are not on the
 * page. src/styles.css does the showing and hiding, from `data-collapsed` on
 * the rail, `data-part` on a rail with one part open, `data-aside` on a part
 * that is not the open one, and `data-layout` on the `<html>` element.
 *
 * What comes onto the page fades in over the panel duration, and what leaves
 * goes at once, as the parts of the rail do: the one takes the room of the other.
 */
import { PanelLeftClose, PanelLeftOpen } from 'lucide';
import type { IconNode } from 'lucide';
import { iconButton } from './dom';
import { fadeIn } from './motion';
import { hasBar } from './page-layout';
import type { PageLayout } from './page-layout';
import type { MapState, Store } from './state';

/** A part of the rail that has an icon. */
export interface RailPart {
  id: string;
  icon: IconNode;
  /** What the icon does, as its name and the text shown on hover: "Search (key /)". */
  label: string;
  /** The part's own element in the rail. */
  element: HTMLElement;
  /** Goes to the part. The rail is open when this is called. */
  focus(): void;
  /** The part it opens with under the bar, where it is not on its own: the need list opens with the lens switch. */
  opensWith?: string;
  /** Whether the part is on the page in a state. A part without it always is. */
  when?: (state: MapState) => boolean;
  /** Whether the part is at work in a state, as the filters are once one is chosen. Its icon then shows it, and says it. */
  on?: (state: MapState) => boolean;
}

export interface RailCollapse {
  /** Opens the rail if it stands as icons, and goes to a part of it. For a partner who asked for the part. */
  open(id: string): void;
  /**
   * Hands the keyboard focus to a part of the rail, for when what held it has left the page. While the rail
   * stands as icons the part's icon takes it, so the rail does not open unasked.
   */
  handFocus(id: string): void;
  /** Follows the window's page layout: the rail stands open in the full one, and as icons in every other. */
  setLayout(layout: PageLayout): void;
}

/**
 * @param rail The rail. The icons become its first child, and the button that closes it its second.
 * @param parts The parts with an icon, from the first icon on.
 * @param tail What stands after the icons of the parts: icons that need no open rail, such as the one for the
 *   list of keys, and the build stamp in its compact form.
 */
export function mountRailCollapse(
  rail: HTMLElement,
  parts: readonly RailPart[],
  tail: readonly HTMLElement[],
  store: Store,
): RailCollapse {
  let layout: PageLayout = 'full';
  /** Whether the rail stands as icons while the layout is not the full one. */
  let collapsed = true;
  /** The part that is open on its own under the bar, by the id of the part it opens with. */
  let openPart: string | null = null;

  const opener = iconButton('rail-icon rail-opener', PanelLeftOpen, 'Open the rail');
  const closer = iconButton('rail-close', PanelLeftClose, 'Close the rail');
  const buttons = new Map<string, HTMLButtonElement>();
  for (const part of parts) {
    const button = iconButton('rail-icon', part.icon, part.label);
    button.addEventListener('click', () => open(part));
    buttons.set(part.id, button);
  }
  const icons = document.createElement('nav');
  icons.className = 'rail-icons';
  icons.append(opener, ...buttons.values(), ...tail);
  icons.setAttribute('aria-label', 'Parts of the rail');
  rail.prepend(icons, closer);

  const isIcons = (): boolean => layout !== 'full' && collapsed;
  const isOver = (): boolean => layout !== 'full' && !collapsed;
  const opensAs = (part: RailPart): string => part.opensWith ?? part.id;
  /** Everything in the rail that is on show while it is open: all of it but the icons, and under the bar the open part alone. */
  const opened = (): HTMLElement[] =>
    [...rail.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== icons && !child.hasAttribute('data-aside'),
    );
  /** The icon that takes the keyboard focus for a part: its own, or the first on show where it has none. */
  const iconOf = (id: string | undefined): HTMLButtonElement => {
    const own = id === undefined ? undefined : buttons.get(id);
    if (own && !own.hidden) return own;
    return hasBar(layout) ? ([...buttons.values()].find((button) => !button.hidden) ?? opener) : opener;
  };

  /** @param atOnce Shows the rail as it now stands with no fade, as when the page opens or the window changes size. */
  function apply(atOnce = false): void {
    const were = rail.hasAttribute('data-collapsed');
    const wasOpen = rail.dataset.part ?? null;
    // Focus inside a rail that turns to icons would be lost with what held it.
    const held = icons.contains(document.activeElement)
      ? undefined
      : parts.find((part) => part.element.contains(document.activeElement));
    const heldFocus = rail.contains(document.activeElement) && !icons.contains(document.activeElement);
    const alone = hasBar(layout) && !collapsed ? openPart : null;
    rail.toggleAttribute('data-collapsed', isIcons());
    if (alone === null) delete rail.dataset.part;
    else rail.dataset.part = alone;
    for (const part of parts) part.element.toggleAttribute('data-aside', alone !== null && opensAs(part) !== alone);
    opener.setAttribute('aria-expanded', String(!isIcons()));
    placeBreadcrumb();
    if (were === isIcons() && wasOpen === alone) return;
    if (isIcons() && heldFocus) (hasBar(layout) ? iconOf(held?.id ?? wasOpen ?? undefined) : opener).focus();
    if (!atOnce) fadeIn(isIcons() ? [icons] : opened());
  }

  /**
   * Tells the stylesheet where the bar's icons end, as `--bar-icons-end`: the breadcrumb of the narrow
   * layout begins there. The icons are counted on the page, so a part added to the rail moves it.
   */
  function placeBreadcrumb(): void {
    if (!hasBar(layout) || !isIcons()) return;
    const ends = [...icons.children].map((icon) => icon.getBoundingClientRect()).filter((rect) => rect.width > 0);
    if (ends.length === 0) return;
    document.documentElement.style.setProperty('--bar-icons-end', `${Math.max(...ends.map((rect) => rect.right))}px`);
  }

  function open(part: RailPart | undefined, focus: () => void = () => part?.focus()): void {
    collapsed = false;
    openPart = part ? opensAs(part) : null;
    apply();
    focus();
  }

  function close(): void {
    if (!isOver()) return;
    collapsed = true;
    apply();
  }

  opener.addEventListener('click', () => open(undefined, () => closer.focus()));
  closer.addEventListener('click', close);
  // A press on the page outside the open rail closes it, and so does the keyboard focus going
  // elsewhere. The list of keys is a dialog over the whole page, and gives the focus back.
  const leaves = (target: EventTarget | null): boolean =>
    isOver() && target instanceof Node && !rail.contains(target) && !(target instanceof Element && target.closest('dialog'));
  document.addEventListener('pointerdown', (event) => {
    // The dimmed canvas beside the open rail is drawn by the rail, so a press there has the rail as its target.
    const besideRail = isOver() && event.target === rail && event.clientX > rail.getBoundingClientRect().right;
    if (besideRail || leaves(event.target)) close();
  });
  document.addEventListener('focusin', (event) => {
    if (leaves(event.target)) close();
  });

  const showParts = (state: MapState): void => {
    for (const part of parts) {
      const button = buttons.get(part.id)!;
      button.hidden = part.when ? !part.when(state) : false;
      const on = part.on?.(state) ?? false;
      button.toggleAttribute('data-on', on);
      button.setAttribute('aria-label', on ? `${part.label}, on` : part.label);
    }
    placeBreadcrumb();
  };
  showParts(store.get());
  store.subscribe((state, before) => {
    showParts(state);
    // Under the bar the open part covers the map. Once something is selected in it, or the map goes
    // somewhere from it, the part closes, so that what was asked for is in sight.
    const selected = state.selection !== null && state.selection !== before.selection;
    const went = state.distance !== before.distance || state.tier !== before.tier || state.cluster !== before.cluster;
    if (hasBar(layout) && (selected || went)) close();
  });
  apply(true);

  const partOf = (id: string): RailPart | undefined => parts.find((part) => part.id === id);
  return {
    open: (id) => open(partOf(id)),
    handFocus(id) {
      if (isIcons()) iconOf(id).focus();
      // Under the bar another part may be the open one, and the part asked for takes its place.
      else if (hasBar(layout)) open(partOf(id));
      else partOf(id)?.focus();
    },
    setLayout(next) {
      // A part that is open under the bar stays open where the next layout has the bar too, as when a
      // phone is turned: the partner may be typing in it. Otherwise the rail that stood open stands as icons.
      const staysOpen = hasBar(layout) && hasBar(next);
      layout = next;
      if (!staysOpen) collapsed = true;
      apply(true);
      // An icon that held the focus may not be in the next layout: the legend's is in the bar alone, and the
      // one that opens the whole rail in the column alone. The focus goes to an icon that is there, or in the
      // full layout, which has no icons, to the part the icon stood for.
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !icons.contains(focused) || focused.getClientRects().length > 0) return;
      const part = parts.find((each) => buttons.get(each.id) === focused);
      if (isIcons()) iconOf(part?.id).focus();
      else (part ?? parts[0])?.focus();
    },
  };
}
