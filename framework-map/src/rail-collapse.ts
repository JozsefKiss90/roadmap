/**
 * rail-collapse: the rail as a column of icons, in the compact layout.
 *
 * At 1280 pixels the canvas needs the rail's room. So the rail stands as a
 * column of icons, one for each of its parts, and the picture is fitted to
 * the room beside that column. An icon opens the rail over the canvas and goes
 * to its part. The open rail closes with its own button, with a press on the
 * page outside it, or when the keyboard focus leaves it.
 *
 * In the full layout the rail is always open and the icons are not on the
 * page. src/styles.css does the showing and hiding, from `data-collapsed` on
 * the rail and `data-layout` on the `<html>` element.
 *
 * What comes onto the page fades in over the panel duration, and what leaves
 * goes at once, as the parts of the rail do: the one takes the room of the other.
 */
import { PanelLeftClose, PanelLeftOpen, createElement } from 'lucide';
import type { IconNode } from 'lucide';
import { element } from './dom';
import { fadeIn } from './motion';
import type { PageLayout } from './page-layout';
import type { MapState, Store } from './state';

/** A part of the rail that has an icon in the column. */
export interface RailPart {
  id: string;
  icon: IconNode;
  /** What the icon does, as its name and the text shown on hover: "Search (key /)". */
  label: string;
  /** Goes to the part. The rail is open when this is called. */
  focus(): void;
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
  /** Follows the window's layout: the rail stands as icons in the compact layout, and open in the full one. */
  setLayout(layout: PageLayout): void;
}

function iconButton(className: string, icon: IconNode, label: string): HTMLButtonElement {
  const drawn = createElement(icon);
  drawn.setAttribute('aria-hidden', 'true');
  const button = element('button', className, drawn);
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  return button;
}

/**
 * @param rail The rail. The column of icons becomes its first child, and the button that closes it its second.
 * @param parts The parts with an icon, from the top of the column down.
 * @param foot What stands at the foot of the column: an icon that needs no open rail, such as the one for the list of keys.
 * @param stamp The build stamp in its compact form, which stands above the foot. The open rail has its own.
 */
export function mountRailCollapse(
  rail: HTMLElement,
  parts: readonly RailPart[],
  foot: { icon: IconNode; label: string; act(): void },
  stamp: HTMLElement,
  store: Store,
): RailCollapse {
  let layout: PageLayout = 'full';
  /** Whether the rail stands as icons while the layout is compact. */
  let collapsed = true;

  const opener = iconButton('rail-icon', PanelLeftOpen, 'Open the rail');
  const closer = iconButton('rail-close', PanelLeftClose, 'Close the rail');
  const buttons = new Map<string, HTMLButtonElement>();
  for (const part of parts) {
    const button = iconButton('rail-icon', part.icon, part.label);
    button.addEventListener('click', () => open(part.focus));
    buttons.set(part.id, button);
  }
  const footButton = iconButton('rail-icon rail-icon-foot', foot.icon, foot.label);
  footButton.addEventListener('click', () => foot.act());
  const icons = element('nav', 'rail-icons', opener, ...buttons.values(), stamp, footButton);
  icons.setAttribute('aria-label', 'Parts of the rail');
  rail.prepend(icons, closer);

  const isIcons = (): boolean => layout === 'compact' && collapsed;
  const isOver = (): boolean => layout === 'compact' && !collapsed;
  /** Everything in the rail but the column of icons. */
  const opened = (): HTMLElement[] =>
    [...rail.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child !== icons);

  /** @param atOnce Shows the rail as it now stands with no fade, as when the page opens or the window changes size. */
  function apply(atOnce = false): void {
    const were = rail.hasAttribute('data-collapsed');
    // Focus inside a rail that turns to icons would be lost with what held it.
    const heldFocus = rail.contains(document.activeElement) && !icons.contains(document.activeElement);
    rail.toggleAttribute('data-collapsed', isIcons());
    opener.setAttribute('aria-expanded', String(!isIcons()));
    if (were === isIcons()) return;
    if (isIcons() && heldFocus) opener.focus();
    if (!atOnce) fadeIn(isIcons() ? [icons] : opened());
  }

  function open(focus: () => void): void {
    collapsed = false;
    apply();
    focus();
  }

  function close(): void {
    if (!isOver()) return;
    collapsed = true;
    apply();
  }

  opener.addEventListener('click', () => open(() => closer.focus()));
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
  };
  showParts(store.get());
  store.subscribe(showParts);
  apply(true);

  const focusOf = (id: string): (() => void) => parts.find((part) => part.id === id)?.focus ?? (() => {});
  return {
    open: (id) => open(focusOf(id)),
    handFocus(id) {
      if (!isIcons()) {
        focusOf(id)();
        return;
      }
      const button = buttons.get(id);
      (button && !button.hidden ? button : opener).focus();
    },
    setLayout(next) {
      layout = next;
      // The rail that stood open in the full layout stands as icons once the window is compact.
      collapsed = true;
      apply(true);
    },
  };
}
