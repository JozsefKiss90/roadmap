/**
 * motion: how long each change on the map takes, and the one way a fade runs.
 *
 * The durations are the style guide's "Map motion" table, settled in
 * src/constants.ts. With the system's reduced-motion setting on, every one of
 * them is zero, and a change of zero length is made at once, before `run`
 * returns.
 *
 * anime.js runs the fades, the panels and the phase steps. It changes opacity
 * and the mix between two forms of a mark; it never moves the camera, a plate,
 * a cell or a mark. The renderer's own camera transition runs the flights.
 *
 * The scene and the panels both use this module. Neither knows the other.
 */
import { animate } from 'animejs';
import { constants } from './constants';
import { scrubbedPhaseOf } from './state';
import type { Lens } from './state';

/** How long each kind of change on the map takes, in milliseconds. */
export interface Durations {
  /** A camera flight: between distances, to a selection, or to frame a need trace. */
  flightMs: number;
  /** A change of lens or filters, and the fading of a plate. */
  fadeMs: number;
  /** The detail card, the phase strip, or a part of the left rail opening or closing. */
  panelMs: number;
  /** A step from one phase to another on the phase strip. */
  phaseStepMs: number;
}

/** The renderer's camera transition eases out the same way, so a fade and a flight settle alike. */
const EASE = 'outQuad';

/** The durations for a partner: the settled ones, or all zero for a partner with reduced motion switched on. */
export function durationsOf(settled: Durations, reducedMotion: boolean): Durations {
  if (reducedMotion) return { flightMs: 0, fadeMs: 0, panelMs: 0, phaseStepMs: 0 };
  return {
    flightMs: settled.flightMs,
    fadeMs: settled.fadeMs,
    panelMs: settled.panelMs,
    phaseStepMs: settled.phaseStepMs,
  };
}

/** How long the marks take to change from one lens to another: a step of the phase strip has its own duration. */
export function fadeMsBetween(before: Lens | null, after: Lens | null, durations: Durations): number {
  const [from, to] = [scrubbedPhaseOf(before), scrubbedPhaseOf(after)];
  return from !== null && to !== null && from !== to ? durations.phaseStepMs : durations.fadeMs;
}

/**
 * The durations as they are now. The constants and the reduced-motion setting
 * are read each time, so a change of either holds at once.
 */
export const durationsNow = (): Durations =>
  durationsOf(constants, window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** The durations of a change that is made at once, such as the first picture or a window that changes size. */
export const AT_ONCE: Durations = durationsOf(constants, true);

let moving = 0;

/** Whether anything on the map is still changing. The screenshot script waits until nothing is. */
export const isMoving = (): boolean => moving > 0;

/** Marks the map as changing until the function it returns is called. The scene holds it for a camera flight. */
export function hold(): () => void {
  moving += 1;
  let held = true;
  return () => {
    if (held) moving -= 1;
    held = false;
  };
}

/**
 * Runs one change from 0 to 1 over `ms`. `onProgress` is called with 0 at
 * once, and with 1 at the end, before `onDone`. A change of zero length is
 * made at once.
 * @returns A function that stops the change where it is. `onDone` is then not called.
 */
export function run(ms: number, onProgress: (progress: number) => void, onDone?: () => void): () => void {
  if (ms <= 0) {
    onProgress(1);
    onDone?.();
    return () => {};
  }
  const release = hold();
  const change = { progress: 0 };
  onProgress(0);
  const animation = animate(change, {
    progress: 1,
    duration: ms,
    ease: EASE,
    onUpdate: () => onProgress(change.progress),
    onComplete: () => {
      release();
      onProgress(1);
      onDone?.();
    },
  });
  return () => {
    animation.cancel();
    release();
  };
}

/** The fade under way on each element, so that the next one starts where this one stopped. */
const stopOf = new WeakMap<HTMLElement, () => void>();
/** The panels that are fading out. One of them is still on the page, and is on its way off it. */
const closing = new WeakSet<HTMLElement>();
/** The parts of the rail that have been shown or hidden once. */
const placed = new WeakSet<HTMLElement>();

/** Takes an element's opacity from one value to another over `ms`, and then gives it back to the stylesheet. */
function fade(part: HTMLElement, from: number, to: number, ms: number, onDone?: () => void): void {
  stopOf.get(part)?.();
  let done = false;
  const stop = run(
    ms,
    (progress) => {
      part.style.opacity = String(from + (to - from) * progress);
    },
    () => {
      done = true;
      part.style.opacity = '';
      stopOf.delete(part);
      onDone?.();
    },
  );
  if (!done) stopOf.set(part, stop);
}

/**
 * Opens or closes a panel over the panel duration, by its opacity alone. A
 * closing panel takes no click and no focus, and leaves the page once it has
 * faded. A panel opened while it closes turns round where it is.
 * @param atOnce Opens or closes the panel with no fade, as when the page opens with it.
 * @param onClosed Called once the panel has left the page.
 */
export function showPanel(
  panel: HTMLElement,
  open: boolean,
  { atOnce = false, onClosed }: { atOnce?: boolean; onClosed?: () => void } = {},
): void {
  if (open === (!panel.hidden && !closing.has(panel))) return;
  const from = panel.hidden ? 0 : Number(panel.style.opacity || 1);
  panel.hidden = false;
  panel.inert = !open;
  if (open) closing.delete(panel);
  else closing.add(panel);
  fade(panel, from, open ? 1 : 0, atOnce ? 0 : durationsNow().panelMs, () => {
    if (open) return;
    closing.delete(panel);
    panel.hidden = true;
    panel.inert = false;
    onClosed?.();
  });
}

/** Fades in, over the panel duration, something that has just come onto the page. */
export function fadeIn(parts: readonly HTMLElement[]): void {
  for (const part of parts) fade(part, 0, 1, durationsNow().panelMs);
}

/**
 * Shows or hides a part of the rail. It fades in as a panel does, and leaves
 * at once: the part that opens takes the room of the part that closes, so the
 * two cannot be on the page together. The first time, it is there or not at
 * once, because the page may open with it.
 */
export function showRailPart(part: HTMLElement, shown: boolean): void {
  if (shown && part.hidden && placed.has(part)) fadeIn([part]);
  part.hidden = !shown;
  placed.add(part);
}
