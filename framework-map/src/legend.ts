/**
 * legend: the four decision-class steps with their names, at the bottom left
 * of the canvas. Each square is drawn from the same mark token as the marks.
 * While a lens or a filter is on, it also shows the faded state of a tool
 * left out, named for what leaves it out. While a need is traced, it shows
 * the traced mark and the best-fit ring too, and under the phase scrub the
 * traced mark. The last square is the mark under the pointer, which takes the
 * fill the selected mark has.
 *
 * Under the bar, in the narrow and the upright page layout, the window has no
 * room to keep the legend on show. It then opens on request, from an icon in
 * the bar, with one step to a row, and leaves at the next press outside it.
 * src/styles.css keeps it on show in the full and the compact layout,
 * whatever the icon last did.
 *
 * It is one of the panels: it reads the state store, and knows nothing of the scene.
 */
import { Shapes } from 'lucide';
import { DECISION_STEPS, STEP_NAMES, fadedName } from './display';
import { dressSwatch, element, iconButton, stepSwatch } from './dom';
import { fadeIn } from './motion';
import { isFiltered, narrows, scrubbedPhaseOf, traces } from './state';
import type { Store } from './state';

/** What the rail's icons need from the legend. */
export interface Legend {
  /** The icon that opens and closes the legend under the bar. It stands in the bar. */
  readonly toggle: HTMLButtonElement;
}

export function mountLegend(app: HTMLElement, store: Store): Legend {
  const heading = element('h2', 'rail-heading', 'Decision class');
  const steps = element(
    'ul',
    'legend-steps',
    ...DECISION_STEPS.map((step) => element('li', null, stepSwatch(step), STEP_NAMES[step])),
  );
  // The faded state, shown on the committed step, where it changes a mark the most.
  const fadedSquare = stepSwatch('committed');
  dressSwatch(fadedSquare, 'committed', true);
  const fadedLabel = element('span', null);
  const faded = element('li', 'legend-apart', fadedSquare, fadedLabel);
  // A traced mark and a best-fit one, drawn as the scene draws them.
  const tracedSquare = element('span', 'swatch swatch-traced');
  tracedSquare.setAttribute('aria-hidden', 'true');
  const traced = element('li', 'legend-apart', tracedSquare, 'Traced');
  const bestFitSquare = element('span', 'swatch swatch-traced swatch-best-fit');
  bestFitSquare.setAttribute('aria-hidden', 'true');
  const bestFit = element('li', null, bestFitSquare, 'Best fit');
  // The faded square stands before the two of the trace, so that those two go to a second row together.
  const selectedSquare = element('span', 'swatch swatch-traced swatch-trace-selected');
  selectedSquare.setAttribute('aria-hidden', 'true');
  const selected = element('li', null, selectedSquare, 'Selected');
  // The mark under the pointer and the selected mark take one fill. While tools are traced that fill
  // means "traced", and the selection has the square before this one.
  const hoverSquare = element('span', 'swatch swatch-traced');
  hoverSquare.setAttribute('aria-hidden', 'true');
  const hoverName = element('span', null);
  const hover = element('li', 'legend-apart', hoverSquare, hoverName);
  steps.append(faded, traced, bestFit, selected, hover);

  const legend = element('section', 'legend', heading, steps);
  // Named apart from the filter of the same heading.
  legend.setAttribute('aria-label', 'Legend: the decision-class steps');
  legend.id = 'legend';
  app.append(legend);
  // The phase strip stands over the legend, however many rows its steps and states take. src/styles.css reads the height.
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--legend-height', `${legend.offsetHeight}px`);
  }).observe(legend);

  const toggle = iconButton('rail-icon rail-icon-legend', Shapes, 'Legend');
  toggle.setAttribute('aria-controls', legend.id);
  const setOpen = (open: boolean): void => {
    if (open === legend.hasAttribute('data-open')) return;
    legend.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.toggleAttribute('data-on', open);
    // It fades in as a panel does, and leaves at once.
    if (open) fadeIn([legend]);
  };
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => setOpen(!legend.hasAttribute('data-open')));
  // It lies over the picture, so it leaves at the next press that is not on it or on its icon.
  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !legend.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });

  const show = (): void => {
    const { lens, filters, selection } = store.get();
    faded.hidden = !narrows(lens) && !isFiltered(filters);
    fadedLabel.textContent = fadedName(narrows(lens), isFiltered(filters));
    // The two of the trace are named as soon as the trace is on, before a need is chosen: they say what a need will mark.
    bestFit.hidden = lens?.type !== 'need';
    // The phase scrub gives its tools the traced mark, and no ring.
    traced.hidden = bestFit.hidden && scrubbedPhaseOf(lens) === null;
    // The selection's ring, while the selected fill means "traced".
    selected.hidden = !traces(lens) || selection?.type === 'need' || selection === null;
    hoverName.textContent = traces(lens) ? 'Hover' : 'Hover / selected';
  };
  show();
  store.subscribe(show);
  return { toggle };
}
