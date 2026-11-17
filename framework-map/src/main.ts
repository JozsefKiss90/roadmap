import './styles.css';
import layout from 'virtual:stack-layout';
import { constants } from './constants';
import { GraphRejected } from './data';
import { loadGraph } from './inlined-graph';
import { TAG_FONT, addLabels } from './labels';
import type { LabelRect } from './labels';
import { mountPanels } from './panels';
import { loadFonts, signalReady } from './ready';
import { createStage } from './scene';
import { createStore, syncWithFragment } from './state';

declare global {
  interface Window {
    /** What the screenshot script reads from the page, beside the "ready" signal. */
    frameworkMap?: { labels(): LabelRect[] };
  }
}

const root = document.documentElement;

function applyPageConstants(): void {
  root.style.setProperty('--title-size', `${constants.titleSizePx}px`);
}

async function start(): Promise<void> {
  applyPageConstants();
  const app = document.getElementById('app');
  const container = document.getElementById('stage');
  if (!app || !container) throw new Error('The page has no #app or no #stage element.');

  // The counts and badges are drawn on a canvas, which needs its typeface loaded first.
  await loadFonts(['400 1em "Instrument Serif"', TAG_FONT]);

  const index = loadGraph();
  // The store starts from the URL fragment, so the page opens at the distance a link names.
  const store = createStore(index);
  syncWithFragment(store, index);

  const stage = createStage(container, index, layout, constants, store);
  const labels = addLabels(stage, index, layout, constants, store);
  mountPanels(app, index, store);
  window.frameworkMap = { labels: () => labels.rects() };
  await labels.settled();

  if (import.meta.env.DEV) {
    const { mountTuning } = await import('./dev/tuning');
    mountTuning(constants, () => {
      applyPageConstants();
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
    message.textContent =
      error instanceof GraphRejected
        ? 'This file holds framework data that failed its checks, so the map cannot be drawn. Ask the Architect for a new build.'
        : 'The map could not be drawn. Ask the Architect for a new build.';
    document.getElementById('app')?.append(message);
  })
  .finally(() => void signalReady());
