/**
 * page-layout: which page layout a window gets, and the room it leaves the picture.
 *
 * The map is designed for 1366×768 to 1920×1080, and is drawn from 360 pixels
 * wide upward. There are four page layouts:
 *
 * - **full**, from 1366 pixels: the rail stands open down the left.
 * - **compact**, from 1024 pixels: the rail is a column of icons, and opens
 *   over the canvas when a partner asks for it. The canvas gets the room.
 * - **narrow**, below 1024 pixels in a window wider than it is tall: the rail
 *   is a bar across the top, in one row with the breadcrumb. A part of the
 *   rail opens over the canvas on its own. The detail card stands at the right.
 * - **upright**, below 1024 pixels in a window at least as tall as it is wide,
 *   and in any window below 480 pixels: the bar has the breadcrumb in a row
 *   of its own, and the detail card opens from the bottom.
 *
 * The arithmetic here is pure. Three things at the foot touch the page.
 * `windowNow` measures the window, and `pageIsZoomed` asks the browser whether
 * the partner has zoomed the page. `followWindow` names the layout on the
 * `<html>` element as `data-layout`, for src/styles.css, and sets the room the
 * rail, the bar and the detail card take as custom properties. The scene, the
 * labels and the panels ask the functions here with the same window, so the
 * picture and the panels cannot disagree.
 */
import { FLAT_CORNERS, radians, spanFromAfar } from './camera';
import type { Region } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import type { PlateLayout } from './layout';
import type { ListShape } from './label-layout';
import { listShape, staircaseHeight } from './label-layout';
import { scrubbedPhaseOf } from './state';
import type { MapState } from './state';

/** One of the four page layouts. */
export type PageLayout = 'upright' | 'narrow' | 'compact' | 'full';

/** A window, in pixels. */
export interface WindowSize {
  width: number;
  height: number;
}

/** Which of the panels that come and go are on the page. */
export interface OpenPanels {
  /** The detail card. */
  card: boolean;
  /** The phase strip. */
  strip: boolean;
}

/** Which of the panels that take room from the picture a state has on the page. */
export const openPanelsOf = (state: Pick<MapState, 'selection' | 'lens'>): OpenPanels => ({
  card: state.selection !== null,
  strip: scrubbedPhaseOf(state.lens) !== null,
});

type LayoutWidths = Pick<Constants, 'uprightBelowPx' | 'narrowBelowPx' | 'compactBelowPx'>;

/** The page layout of a window. */
export function pageLayoutAt({ width, height }: WindowSize, constants: LayoutWidths): PageLayout {
  if (width >= constants.compactBelowPx) return 'full';
  if (width >= constants.narrowBelowPx) return 'compact';
  // A detail card at the side takes half of a small window, and under 240 pixels it is too narrow to read.
  return width >= constants.uprightBelowPx && width > height ? 'narrow' : 'upright';
}

/** Whether the rail stands as the bar across the top in a page layout: in the narrow and the upright one. */
export const hasBar = (layout: PageLayout): boolean => layout === 'narrow' || layout === 'upright';

/**
 * Whether a window gets the wrapped layout of the stack, in which a long tier stands its cells in
 * rows (see src/layout.ts): a phone held upright. The page makes its scene from one layout, so
 * src/main.ts loads the page again when a window comes to the other answer.
 */
export const stackWrapsAt = (size: WindowSize, constants: LayoutWidths): boolean => size.width < constants.uprightBelowPx;

/** Whether a window's page layout has the bar. */
export const underBarAt = (size: WindowSize, constants: LayoutWidths): boolean => hasBar(pageLayoutAt(size, constants));

/** The room the rail takes at the left of the canvas: the whole rail in the full layout, its column of icons in the compact one, and none under the bar. */
export function railPxAt(size: WindowSize, constants: Constants): number {
  const layout = pageLayoutAt(size, constants);
  if (layout === 'full') return constants.railPx;
  return layout === 'compact' ? constants.railIconsPx : 0;
}

/** The room the bar takes at the top of the canvas: its row of icons, and in the upright layout the breadcrumb's row under it. */
export function barPxAt(size: WindowSize, constants: Constants): number {
  const layout = pageLayoutAt(size, constants);
  if (!hasBar(layout)) return 0;
  return layout === 'upright' ? constants.barRowPx + constants.crumbRowPx : constants.barRowPx;
}

/**
 * The room an open detail card takes: at the right, or at the bottom in the
 * upright layout. In the narrow layout it never takes more than half the window.
 */
export function cardRoomAt(size: WindowSize, constants: Constants): { right: number; bottom: number } {
  const layout = pageLayoutAt(size, constants);
  if (layout === 'upright') return { right: 0, bottom: Math.round(size.height * constants.cardHeightShare) };
  const width = layout === 'narrow' ? Math.min(constants.detailCardPx, Math.floor(size.width / 2)) : constants.detailCardPx;
  return { right: width, bottom: 0 };
}

/**
 * Whether the two counts of a step of the phase strip stand one over the other, because the strip
 * has no room for five steps with their counts side by side: on a phone, and beside an open
 * detail card in a window too narrow for both.
 * @param card Whether the detail card is open.
 */
export function phaseStripStackedAt(size: WindowSize, constants: Constants, card: boolean): boolean {
  const beside = card ? cardRoomAt(size, constants).right : 0;
  const room = size.width - railPxAt(size, constants) - beside - 2 * constants.phaseStripSidePx;
  return room < constants.phaseStripSideBySidePx;
}

/** The room the phase strip takes at the bottom, with the second row the legend may take under it beside a detail card. */
function stripRoomAt(size: WindowSize, constants: Constants, card: boolean): number {
  const stacked = phaseStripStackedAt(size, constants, card);
  if (underBarAt(size, constants)) return constants.phaseStripUnderBarPx - (stacked ? 0 : constants.phaseStripStackedPx);
  return constants.phaseStripPx + (card ? constants.legendSecondRowPx : 0) + (stacked ? constants.phaseStripStackedPx : 0);
}

/**
 * The room the panels leave the picture, as a rectangle of the window: right
 * of the rail, under the bar, and clear of the detail card and the phase
 * strip while they are on the page.
 */
export function pictureRoomAt(size: WindowSize, constants: Constants, open: OpenPanels): Region {
  const card = open.card ? cardRoomAt(size, constants) : { right: 0, bottom: 0 };
  return {
    left: railPxAt(size, constants),
    top: barPxAt(size, constants),
    right: size.width - card.right,
    bottom: size.height - card.bottom - (open.strip ? stripRoomAt(size, constants, open.card) : 0),
  };
}

/**
 * The margins the stack keeps at rest, from the edges of the window. The left
 * one holds the rail and, beside it, the tier labels; the bottom one holds the
 * legend. Under the bar no label stands beside the stack and the legend opens
 * on request, so the margins are small, and the top one holds the bar.
 */
export function restInsetsAt(
  size: WindowSize,
  constants: Constants,
): { top: number; right: number; bottom: number; left: number } {
  if (underBarAt(size, constants)) {
    const edge = constants.underBarEdgePx;
    return { top: barPxAt(size, constants) + constants.underBarTopPx, right: edge, bottom: edge, left: edge };
  }
  return {
    top: constants.insetTopPx,
    right: constants.insetRightPx,
    bottom: constants.insetBottomPx,
    // It holds the rail, so it gives the stack whatever room the rail gives up.
    left: constants.insetLeftPx - (constants.railPx - railPxAt(size, constants)),
  };
}

/**
 * The camera's angle at rest under the bar: the one that draws the stack largest in the window.
 *
 * The plates are long and the stack is low, so in an upright window a stack turned a little is
 * as wide as the window and leaves most of its height empty. Turned further, each plate runs
 * back and is shorter across the picture, the stack is taller, and the camera comes nearer.
 * In a window wider than it is tall the stack is already as tall as its room, and the angle
 * stays the first one: `underBarRestTiltDegrees` and `restTurnDegrees`.
 *
 * Turned further, a plate also takes more of the height between it and the next, and the tag
 * on its far edge needs `underBarTagRoomPx` there. A more level camera opens that room again,
 * and draws each mark flatter. So of the angles that leave the tag its room, up to
 * `underBarMostTiltDegrees` and `underBarMostTurnDegrees`, the one is taken that draws a mark
 * over the most pixels. It is in whole degrees, and depends on the window alone: an open panel
 * moves the stack, and does not turn it.
 */
function underBarRestAngle(
  size: WindowSize,
  constants: Constants,
  plates: readonly PlateLayout[],
): { tiltDegrees: number; turnDegrees: number } {
  const inset = restInsetsAt(size, constants);
  const roomAcross = Math.max(1, size.width - inset.left - inset.right);
  const roomDown = Math.max(1, size.height - inset.top - inset.bottom);
  const corners = plates.flatMap((plate) =>
    FLAT_CORNERS.map(([alongX, alongZ]) => ({
      x: plate.x + (alongX * plate.width) / 2,
      y: plate.y,
      z: plate.z + (alongZ * plate.depth) / 2,
    })),
  );
  const upward = [...plates].sort((a, b) => a.y - b.y);

  const first = { tiltDegrees: constants.underBarRestTiltDegrees, turnDegrees: constants.restTurnDegrees };
  let best = first;
  let largest = 0;
  for (let tiltDegrees = first.tiltDegrees; tiltDegrees <= constants.underBarMostTiltDegrees; tiltDegrees += 1) {
    const tilt = radians(tiltDegrees);
    for (let turnDegrees = first.turnDegrees; turnDegrees <= constants.underBarMostTurnDegrees; turnDegrees += 1) {
      const span = spanFromAfar(corners, tiltDegrees, turnDegrees);
      if (span.across <= 0 || span.up <= 0) continue;
      const pixelsPerUnit = Math.min(roomAcross / span.across, roomDown / span.up);
      // From the far edge of one plate up to the near edge of the next, at one place across the picture.
      const comesForward = Math.cos(tilt) / Math.cos(radians(turnDegrees));
      const clearPx =
        pixelsPerUnit *
        Math.min(
          Infinity,
          ...upward.slice(1).map((plate, at) => {
            const under = upward[at]!;
            const forward = plate.z + plate.depth / 2 - (under.z - under.depth / 2);
            return (plate.y - under.y) * Math.sin(tilt) - forward * comesForward;
          }),
        );
      // The first angle is kept whatever room it leaves: the labels leave a tag out where it has none.
      const isFirst = tiltDegrees === first.tiltDegrees && turnDegrees === first.turnDegrees;
      if (!isFirst && clearPx < constants.underBarTagRoomPx) continue;
      // A mark's side is drawn `pixelsPerUnit` across, and as much from top to bottom as the tilt leaves of it.
      const markArea = pixelsPerUnit * pixelsPerUnit * Math.cos(tilt);
      if (markArea > largest) {
        largest = markArea;
        best = { tiltDegrees, turnDegrees };
      }
    }
  }
  return best;
}

/**
 * The camera's angle at rest: its tilt and its turn. Under the bar each tier's tag stands over
 * its plate, and a more level camera opens the room for it; there the angle is also fitted to
 * the window, so that the stack fills it (see `underBarRestAngle`).
 * @param plates The plates of the stack, which the angle under the bar is fitted to.
 */
export function restAngleAt(
  size: WindowSize,
  constants: Constants,
  plates: readonly PlateLayout[],
): { tiltDegrees: number; turnDegrees: number } {
  if (!underBarAt(size, constants)) return { tiltDegrees: constants.restTiltDegrees, turnDegrees: constants.restTurnDegrees };
  return underBarRestAngle(size, constants, plates);
}

/** The margins a focused plate or cell keeps inside the room the panels leave: above it, at its sides and under it. */
export function pictureMarginsAt(size: WindowSize, constants: Constants): { top: number; side: number; bottom: number } {
  if (underBarAt(size, constants)) {
    return { top: constants.underBarTopPx, side: constants.underBarEdgePx, bottom: constants.underBarEdgePx };
  }
  return { top: constants.annotationTopPx, side: constants.nearInsetSidePx, bottom: constants.insetBottomPx };
}

/**
 * Whether the names of a tier's clusters have room above its plate. In the
 * full and the compact layout they always stand there. Under the bar they are
 * left out where they would leave the plate too little room: across, beside
 * the room the last name runs into, or down, under the staircase of names.
 * @param names How many clusters the tier has.
 */
export function clusterNamesFitAt(size: WindowSize, constants: Constants, open: OpenPanels, names: number): boolean {
  if (!underBarAt(size, constants)) return true;
  const room = pictureRoomAt(size, constants, open);
  const margins = pictureMarginsAt(size, constants);
  const across = room.right - room.left - margins.side - constants.tierInsetRightPx;
  const top = room.top + margins.top + staircaseHeight(names, constants.clusterRowPx, constants.clusterNameGapPx);
  return across >= constants.leastPlateWidthPx && room.bottom - margins.bottom - top >= constants.leastPlateHeightPx;
}

/**
 * Whether the names of a cluster's tools have room above its cell. In the
 * full and the compact layout the list always stands there, with its longest
 * names cut short if it must. Under the bar it is left out where its columns
 * are wider than the room even with every name cut to its least, or where its
 * rows would leave the cell too little room under them.
 * @param shape The columns and rows of the list.
 */
export function toolNamesFitAt(size: WindowSize, constants: Constants, open: OpenPanels, shape: ListShape): boolean {
  if (!underBarAt(size, constants)) return true;
  const room = pictureRoomAt(size, constants, open);
  const margins = pictureMarginsAt(size, constants);
  const leastRow =
    constants.toolIconPx + constants.toolPartGapPx + constants.toolNameLeastPx + constants.toolBadgeGapPx + constants.toolBadgeRoomPx;
  const across = shape.columns * leastRow + Math.max(0, shape.columns - 1) * constants.toolColumnGapPx;
  const top = room.top + margins.top + shape.rows * constants.toolRowPx + constants.toolListGapPx;
  return (
    across <= room.right - room.left - 2 * constants.listEdgePx &&
    room.bottom - margins.bottom - top >= constants.leastCellHeightPx
  );
}

/**
 * Whether the names a state's distance calls for have room on the canvas of a window: the names of
 * the focused tier's clusters, or of the focused cluster's tools. The scene leaves the room for
 * them, the labels draw them, and the line under the breadcrumb says what to choose without them:
 * all three ask here. At the stack distance there is nothing to ask, and the answer is yes.
 */
export function namesFitFor(
  state: Pick<MapState, 'distance' | 'tier' | 'cluster' | 'selection' | 'lens'>,
  index: Pick<GraphIndex, 'clustersOf' | 'toolsOf'>,
  size: WindowSize,
  constants: Constants,
): boolean {
  const open = openPanelsOf(state);
  if (state.distance === 'tier' && state.tier) {
    return clusterNamesFitAt(size, constants, open, index.clustersOf(state.tier).length);
  }
  if (state.distance === 'cluster' && state.cluster) {
    const shape = listShape(index.toolsOf(state.cluster).length, constants.toolListMostRows);
    return toolNamesFitAt(size, constants, open, shape);
  }
  return true;
}

/** The page counts as zoomed from this scale of the visual viewport. A browser reports a scale a hair off 1 at rest. */
const ZOOMED_FROM_SCALE = 1.01;

/** Whether the partner has zoomed the page itself, as with a pinch on a panel. */
export const pageIsZoomed = (): boolean => (window.visualViewport?.scale ?? 1) > ZOOMED_FROM_SCALE;

/** The window as the page measures it. */
export const windowNow = (): WindowSize => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

/**
 * Names the window's page layout on the `<html>` element, now and whenever the window changes size or is turned.
 * @param onChange Called with the layout once at the start, and then each time it changes.
 * @returns A function that measures the window again, for when a constant has changed.
 */
export function followWindow(constants: Constants, onChange: (layout: PageLayout) => void): () => void {
  const root = document.documentElement;
  let shown: PageLayout | null = null;
  const apply = (): void => {
    const size = windowNow();
    const layout = pageLayoutAt(size, constants);
    const card = cardRoomAt(size, constants);
    // The room the rail takes from the canvas. The open rail's own width is `--rail-open-width`.
    root.style.setProperty('--rail-width', `${railPxAt(size, constants)}px`);
    root.style.setProperty('--bar-height', `${barPxAt(size, constants)}px`);
    // The room an open detail card takes: one of the two is zero.
    root.style.setProperty('--detail-card-width', `${card.right}px`);
    root.style.setProperty('--detail-card-height', `${card.bottom}px`);
    if (layout === shown) return;
    shown = layout;
    root.dataset.layout = layout;
    // For the rules the two layouts with the bar share.
    root.toggleAttribute('data-bar', hasBar(layout));
    onChange(layout);
  };
  apply();
  window.addEventListener('resize', apply);

  // What is in sight of the window: less than the window while a phone's on-screen keyboard is
  // up. A part of the rail that is open under the bar keeps to it, so the search box and its
  // results stay in sight. A page the partner has zoomed is left alone.
  const viewport = window.visualViewport;
  const followSight = (): void => {
    const inSight = viewport && !pageIsZoomed();
    root.style.setProperty('--visible-top', inSight ? `${viewport.offsetTop}px` : '0px');
    root.style.setProperty('--visible-height', inSight ? `${viewport.height}px` : '100%');
  };
  viewport?.addEventListener('resize', followSight);
  viewport?.addEventListener('scroll', followSight);
  followSight();
  return apply;
}
