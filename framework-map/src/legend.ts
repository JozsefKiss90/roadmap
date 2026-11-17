/**
 * legend: the four decision-class steps with their names, at the bottom left
 * of the canvas. Each square is drawn from the same mark token as the marks.
 * While a filter is on, it also shows the faded state of a tool left out.
 *
 * It is one of the panels: it reads the state store, and knows nothing of the scene.
 */
import { DECISION_STEPS, STEP_NAMES } from './display';
import { dressSwatch, element, stepSwatch } from './dom';
import { isFiltered } from './state';
import type { Store } from './state';

export function mountLegend(app: HTMLElement, store: Store): void {
  const heading = element('h2', 'rail-heading', 'Decision class');
  const steps = element(
    'ul',
    'legend-steps',
    ...DECISION_STEPS.map((step) => element('li', null, stepSwatch(step), STEP_NAMES[step])),
  );
  // The faded state, shown on the committed step, where it changes a mark the most.
  const fadedSquare = stepSwatch('committed');
  dressSwatch(fadedSquare, 'committed', true);
  const faded = element('li', 'legend-faded', fadedSquare, 'Filtered out');
  steps.append(faded);

  const legend = element('section', 'legend', heading, steps);
  // Named apart from the filter of the same heading.
  legend.setAttribute('aria-label', 'Legend: the decision-class steps');
  app.append(legend);

  const show = (): void => {
    faded.hidden = !isFiltered(store.get().filters);
  };
  show();
  store.subscribe(show);
}
