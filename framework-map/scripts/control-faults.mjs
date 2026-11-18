/**
 * The check the screenshot script makes on a state's controls where a touch
 * screen is emulated: every control a finger can press is at least 44 pixels
 * each way. The script reads one rectangle for each control on the page, in
 * pixels of the window, with a name that says what kind of control it is.
 *
 * It measures a control's own box. It does not see a control that lies under
 * another, and the marks on the canvas are not controls: the outline reaches
 * every tool with rows of the full size.
 *
 * @typedef {{ name: string, left: number, top: number, right: number, bottom: number }} ControlRect
 */

/** A control may be short of the size by this much: a browser lays text out on parts of a pixel. */
const ROUNDING_PX = 0.5;

/**
 * What is wrong with a state's controls: one that is smaller than a finger
 * needs. Controls of one name are reported once, with how many more there are.
 *
 * @param {readonly ControlRect[] | null} controls What the page reported, or null if it reported nothing.
 * @param {number} leastPx The least width and height of a control.
 * @returns {string[]}
 */
export function controlFaults(controls, leastPx) {
  if (!controls) return ['the page did not report its controls'];
  /** @type {Map<string, { width: number, height: number, more: number }>} */
  const small = new Map();
  for (const rect of controls) {
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    if (width >= leastPx - ROUNDING_PX && height >= leastPx - ROUNDING_PX) continue;
    const seen = small.get(rect.name);
    if (seen) seen.more += 1;
    else small.set(rect.name, { width, height, more: 0 });
  }
  return [...small].map(
    ([name, { width, height, more }]) =>
      `a control is smaller than ${leastPx} by ${leastPx} pixels: "${name}", ${Math.round(width)} by ${Math.round(height)}` +
      (more > 0 ? ` (and ${more} more like it)` : ''),
  );
}
