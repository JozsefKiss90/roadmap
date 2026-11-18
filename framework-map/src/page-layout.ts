/**
 * page-layout: which layout a window gets, by its width.
 *
 * The map is designed for 1366×768 to 1920×1080, and 1280×720 is the smallest
 * supported size. So there are three layouts:
 *
 * - **full**, from 1366 pixels: the rail stands open down the left.
 * - **compact**, from 1024 pixels: the rail is a column of icons, and opens
 *   over the canvas when a partner asks for it. The canvas gets the room.
 * - **narrow**, below 1024 pixels: a short message stands in place of the map.
 *
 * The arithmetic here is pure. `followWindow` is the one part that touches
 * the page: it names the layout on the `<html>` element as `data-layout`, for
 * src/styles.css, and sets the room the rail takes as `--rail-width`. The
 * scene and the labels ask `railPxAt` with the same width, so the picture and
 * the panels cannot disagree.
 */
import type { Constants } from './constants';

/** One of the three page layouts. */
export type PageLayout = 'narrow' | 'compact' | 'full';

type LayoutWidths = Pick<Constants, 'narrowBelowPx' | 'compactBelowPx'>;
type RailWidths = LayoutWidths & Pick<Constants, 'railPx' | 'railIconsPx'>;

/** The layout of a window `widthPx` wide. */
export function pageLayoutAt(widthPx: number, constants: LayoutWidths): PageLayout {
  if (widthPx < constants.narrowBelowPx) return 'narrow';
  return widthPx < constants.compactBelowPx ? 'compact' : 'full';
}

/** The room the rail takes from the canvas: the whole rail in the full layout, and otherwise its column of icons. */
export function railPxAt(widthPx: number, constants: RailWidths): number {
  return pageLayoutAt(widthPx, constants) === 'full' ? constants.railPx : constants.railIconsPx;
}

/** The stack's left inset at rest. It holds the rail, so it gives the stack whatever room the rail gives up. */
export function insetLeftPxAt(widthPx: number, constants: RailWidths & Pick<Constants, 'insetLeftPx'>): number {
  return constants.insetLeftPx - (constants.railPx - railPxAt(widthPx, constants));
}

/**
 * Names the window's layout on the `<html>` element, now and whenever the window changes size.
 * @param onChange Called with the layout once at the start, and then each time it changes.
 */
export function followWindow(constants: Constants, onChange: (layout: PageLayout) => void): void {
  const root = document.documentElement;
  let shown: PageLayout | null = null;
  const apply = (): void => {
    const width = root.clientWidth;
    const layout = pageLayoutAt(width, constants);
    // The room the rail takes from the canvas. The open rail's own width is `--rail-open-width`.
    root.style.setProperty('--rail-width', `${railPxAt(width, constants)}px`);
    if (layout === shown) return;
    shown = layout;
    root.dataset.layout = layout;
    onChange(layout);
  };
  apply();
  window.addEventListener('resize', apply);
}

/** The layout the page is in now. */
export const pageLayoutNow = (): PageLayout => (document.documentElement.dataset.layout as PageLayout | undefined) ?? 'full';
