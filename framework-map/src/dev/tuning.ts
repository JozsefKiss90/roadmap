/**
 * The tuning panel. Loaded only by the dev server (see main.ts); the built
 * file must not contain it, and scripts/publish.mjs checks that.
 */
import { Pane } from 'tweakpane';
import type { Constants } from '../constants';

export function mountTuning(constants: Constants, onChange: () => void): void {
  const pane = new Pane({ title: 'Tuning', expanded: false });
  pane.addBinding(constants, 'titleSizePx', { label: 'title size', min: 16, max: 64, step: 1 });
  pane.on('change', onChange);
}
