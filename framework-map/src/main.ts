import './styles.css';
import wholeLayout from 'virtual:stack-layout';
import wrappedLayout from 'virtual:stack-layout-wrapped';
import { stackWrapsAt, windowNow } from './page-layout';
import picture from 'virtual:stack-picture';
import { constants } from './constants';
import { GraphRejected } from './data';
import { hasWebGL, mountFallback } from './fallback';
import { loadGraph } from './inlined-graph';
import { TAG_FONT, addLabels } from './labels';
import type { LabelRect } from './labels';
import { isMoving } from './motion';
import { mountPanels } from './panels';
import { loadFonts, signalReady } from './ready';
import { createStage } from './scene';
import { createStore, syncWithFragment } from './state';

declare global {
  interface Window {
    /**
     * What the screenshot script reads from the page, beside the "ready" signal: where the labels
     * stand, where the selection is drawn, and whether a flight, a fade or a panel is still under way.
     */
    frameworkMap?: { labels(): LabelRect[]; selection(): LabelRect | null; isMoving(): boolean };
  }
}

const root = document.documentElement;

function applyPageConstants(): void {
  root.style.setProperty('--title-size', `${constants.titleSizePx}px`);
  root.style.setProperty('--rail-open-width', `${constants.railPx}px`);
  root.style.setProperty('--bar-row', `${constants.barRowPx}px`);
  root.style.setProperty('--crumb-row', `${constants.crumbRowPx}px`);
  root.style.setProperty('--bar-icon', `${constants.barIconPx}px`);
  root.style.setProperty('--bar-gap', `${constants.barGapPx}px`);
  root.style.setProperty('--bar-edge', `${constants.barEdgePx}px`);
  root.style.setProperty('--rail-part-width', `${constants.railPartPx}px`);
  root.style.setProperty('--phase-strip-side', `${constants.phaseStripSidePx}px`);
}

/** Where the page keeps the place of the keyboard focus while it loads again for the other layout of the stack. */
const FOCUS_KEY = 'framework-map:focus';

/**
 * Notes which element has the keyboard focus, as the way to it from the body: at each step, which
 * child. The page is built the same from the same fragment, so the way leads to the same element.
 * A browser that keeps no session storage loses the focus, and nothing else.
 */
function rememberFocus(): void {
  const way: number[] = [];
  for (let at = document.activeElement; at && at !== document.body; at = at.parentElement) {
    way.unshift(at.parentElement ? [...at.parentElement.children].indexOf(at) : -1);
  }
  try {
    if (way.length > 0 && !way.includes(-1)) sessionStorage.setItem(FOCUS_KEY, JSON.stringify(way));
  } catch {
    // The focus starts at the top of the page, as on any first visit.
  }
}

/** Gives the keyboard focus back to the element `rememberFocus` noted, if the page was loaded again for it. */
function restoreFocus(): void {
  try {
    const noted = sessionStorage.getItem(FOCUS_KEY);
    sessionStorage.removeItem(FOCUS_KEY);
    if (noted === null) return;
    let at: Element | undefined = document.body;
    for (const child of JSON.parse(noted) as number[]) at = at?.children[child];
    if (at instanceof HTMLElement) at.focus({ preventScroll: true });
  } catch {
    // As above.
  }
}

async function start(): Promise<void> {
  applyPageConstants();
  const app = document.getElementById('app');
  const container = document.getElementById('stage');
  if (!app || !container) throw new Error('The page has no #app or no #stage element.');

  // The counts and badges are drawn on a canvas, which needs its typeface loaded first. The
  // outline scrolls to the selected row, which needs its rows at their final height.
  await loadFonts(['400 1em "Instrument Serif"', TAG_FONT, '400 1em "Geist"']);

  const index = loadGraph();
  if (!hasWebGL()) {
    // No scene is made, so nothing moves and no label is drawn.
    mountFallback(app, index, constants, __BUILD_ID__, picture);
    window.frameworkMap = { labels: () => [], selection: () => null, isMoving: () => false };
    return;
  }
  // The store starts from the URL fragment, so the page opens at the distance a link names.
  const store = createStore(index);
  syncWithFragment(store, index);

  // A phone held upright gets the wrapped layout. The scene is made from one layout, so a window
  // that comes to need the other, as a phone turned on its side does, loads the page again. The
  // fragment holds the state, so the page opens where it was.
  const wraps = stackWrapsAt(windowNow(), constants);
  const layout = wraps ? wrappedLayout : wholeLayout;
  window.addEventListener('resize', () => {
    if (stackWrapsAt(windowNow(), constants) === wraps) return;
    rememberFocus();
    location.reload();
  });

  const stage = createStage(container, index, layout, constants, store);
  const labels = addLabels(stage, index, layout, constants, store);
  const panels = mountPanels(app, index, store, constants, __BUILD_ID__);
  restoreFocus();
  window.frameworkMap = { labels: () => labels.rects(), selection: () => stage.selectionRect(), isMoving };
  await labels.settled();

  if (import.meta.env.DEV) {
    const { mountTuning } = await import('./dev/tuning');
    mountTuning(constants, () => {
      applyPageConstants();
      panels.applyConstants();
      stage.applyConstants();
    });
  }
}

start()
  .catch((error: unknown) => {
    // The build validates the graph, so this is a fault in the file itself.
    console.error(error);
    const message = document.createElement('p');
    message.className = 'fault';
    message.setAttribute('role', 'alert');
    message.textContent =
      error instanceof GraphRejected
        ? 'This file holds framework data that failed its checks, so the map cannot be drawn. Ask the Architect for a new build.'
        : 'The map could not be drawn. Ask the Architect for a new build.';
    document.getElementById('app')?.append(message);
  })
  .finally(() => void signalReady());
