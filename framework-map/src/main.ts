import './styles.css';
import { constants } from './constants';
import { parseGraph } from './data';
import { signalReady } from './ready';

const root = document.documentElement;

function applyConstants(): void {
  root.style.setProperty('--title-size', `${constants.titleSizePx}px`);
}

applyConstants();

// Nothing draws the graph yet. Parsing it here keeps the data in the built
// file, so the inlining and the size budget are exercised from the start.
const graph = parseGraph() as { nodes: unknown[] };
root.dataset.graphNodes = String(graph.nodes.length);

if (import.meta.env.DEV) {
  void import('./dev/tuning').then(({ mountTuning }) => mountTuning(constants, applyConstants));
}

void signalReady(['400 1em "Instrument Serif"']);
