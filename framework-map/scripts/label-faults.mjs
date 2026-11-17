/**
 * The checks the screenshot script makes on a state's labels. The page reports
 * one rectangle for each label on screen, in pixels of the window.
 *
 * @typedef {{ left: number, top: number, right: number, bottom: number }} LabelRect
 */

/** Two labels may touch or share an edge by this much before they count as overlapping. */
const TOUCH_PX = 1;

/**
 * What is wrong with a state's labels: too many, one outside the clear part of
 * the window, or two that overlap. Returns one message for each fault, and
 * none when all is well.
 *
 * @param {readonly LabelRect[] | null} labels What the page reported, or null if it reported nothing.
 * @param {{ width: number, height: number, left?: number }} viewport The part of the window no panel covers: it runs from `left`, or from 0, to `width`.
 * @param {number} mostLabels
 * @returns {string[]}
 */
export function labelFaults(labels, viewport, mostLabels) {
  if (!labels) return ['the page did not report its labels'];
  /** @type {string[]} */
  const faults = [];
  const show = (/** @type {LabelRect} */ rect) =>
    `(${Math.round(rect.left)}, ${Math.round(rect.top)}) to (${Math.round(rect.right)}, ${Math.round(rect.bottom)})`;

  if (labels.length > mostLabels) faults.push(`${labels.length} labels on screen, more than ${mostLabels}`);
  labels.forEach((rect, i) => {
    if (rect.left < (viewport.left ?? 0) || rect.top < 0 || rect.right > viewport.width || rect.bottom > viewport.height) {
      faults.push(`a label runs out of the window: ${show(rect)}`);
    }
    for (const other of labels.slice(i + 1)) {
      const apart =
        rect.right - TOUCH_PX <= other.left ||
        other.right - TOUCH_PX <= rect.left ||
        rect.bottom - TOUCH_PX <= other.top ||
        other.bottom - TOUCH_PX <= rect.top;
      if (!apart) faults.push(`two labels overlap: ${show(rect)} and ${show(other)}`);
    }
  });
  return faults;
}
