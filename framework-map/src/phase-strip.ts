/**
 * phase-strip: the five steps of the phase scrub, P0 to P4, at the bottom of
 * the map. It is on the page only while the phase scrub is on.
 *
 * Each step gives its phase and the number of needs scheduled in it and of
 * tools that serve them. The counts are of the whole phase, whatever the
 * filters. The steps are radio buttons, so the browser gives them the left
 * and right arrow keys while the strip has the focus. Nothing else steps the
 * phase: the strip has no timer and never advances on its own. It opens and
 * closes as a panel does, by its opacity.
 *
 * It is one of the panels: it reads the state store and writes to it, and
 * knows nothing of the scene.
 */
import type { GraphIndex } from './data';
import { element } from './dom';
import { showPanel } from './motion';
import { scrubbedPhaseOf } from './state';
import type { MapState, Store } from './state';

export interface PhaseStrip {
  /** Puts the keyboard focus on the step of the phase that is shown. */
  focus(): void;
}

const counted = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/**
 * @param onClosedWithFocus Called when the strip closes while it holds the keyboard focus, so the
 *   focus can go somewhere that is still on the page.
 */
export function mountPhaseStrip(app: HTMLElement, index: GraphIndex, store: Store, onClosedWithFocus: () => void): PhaseStrip {
  const inputs = new Map<string, HTMLInputElement>();
  const steps = index.phases.map((phase) => {
    const input = element('input', null);
    input.type = 'radio';
    input.name = 'phase';
    input.value = phase;
    input.addEventListener('change', () => {
      if (input.checked) store.showPhaseScrub(phase);
    });
    inputs.set(phase, input);
    return element(
      'label',
      'phase-step',
      input,
      element('span', 'phase-step-name', phase),
      element(
        'span',
        'phase-step-counts',
        `${counted(index.needsIn(phase).length, 'need', 'needs')} · ${counted(index.toolCountIn(phase), 'tool', 'tools')}`,
      ),
    );
  });
  const row = element('div', 'phase-steps', ...steps);
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-label', 'Roadmap phase');
  const strip = element('section', 'phase-strip', row);
  strip.setAttribute('aria-label', 'Phase scrub');
  app.append(strip);

  function render({ lens }: MapState, atOnce = false): void {
    const phase = scrubbedPhaseOf(lens);
    // A strip that closes under the partner's hands, as with the key `1`, hands the focus on.
    const heldFocus = strip.contains(document.activeElement);
    showPanel(strip, phase !== null, { atOnce });
    // A strip that is closing keeps its chosen step while it fades.
    if (phase !== null) for (const [step, input] of inputs) input.checked = step === phase;
    if (heldFocus && phase === null) onClosedWithFocus();
  }

  // The page may open with the strip, which is then there at once.
  strip.hidden = true;
  render(store.get(), true);
  store.subscribe((state, previous) => {
    if (state.lens !== previous.lens) render(state);
  });

  return { focus: () => row.querySelector<HTMLInputElement>('input:checked')?.focus() };
}
