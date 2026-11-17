import './styles.css';
import layout from 'virtual:stack-layout';
import { constants } from './constants';
import { GraphRejected } from './data';
import { loadGraph } from './inlined-graph';
import { COUNT_FONT, addTierLabels } from './labels';
import { loadFonts, signalReady } from './ready';
import { createStage } from './scene';

const root = document.documentElement;

function applyPageConstants(): void {
  root.style.setProperty('--title-size', `${constants.titleSizePx}px`);
}

async function start(): Promise<void> {
  applyPageConstants();
  const container = document.getElementById('stage');
  if (!container) throw new Error('The page has no #stage element.');

  // The counts are drawn on a canvas, which needs its typeface loaded first.
  await loadFonts(['400 1em "Instrument Serif"', COUNT_FONT]);

  const index = loadGraph();
  const stage = createStage(container, index, layout, constants);
  await addTierLabels(stage, index, layout, constants);

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
