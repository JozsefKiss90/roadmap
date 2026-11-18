/**
 * The checks the screenshot script makes on a state's labels. The page reports
 * one rectangle for each label on screen, in pixels of the window, and the
 * label's four corners. A tier's label stands in the scene at an angle, so it
 * covers less than the rectangle around it: two such labels overlap only where
 * the shapes inside their corners do.
 *
 * @typedef {{ x: number, y: number }} Corner
 * @typedef {{ left: number, top: number, right: number, bottom: number, corners?: Corner[] }} LabelRect
 */

/** Two labels may touch or share an edge by this much before they count as overlapping. */
const TOUCH_PX = 1;

/**
 * A label's corners, in order round it: the ones the page reported, or those of its rectangle.
 * @param {LabelRect} rect
 * @returns {Corner[]}
 */
const cornersOf = (rect) =>
  rect.corners ?? [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];

/**
 * Whether two shapes with no dent stand apart, give or take what they may share. They do where
 * some edge of either has all of one shape on one side of it and all of the other on the other.
 * @param {Corner[]} one
 * @param {Corner[]} other
 */
function standApart(one, other) {
  for (const shape of [one, other]) {
    for (let at = 0; at < shape.length; at += 1) {
      const from = /** @type {Corner} */ (shape[at]);
      const to = /** @type {Corner} */ (shape[(at + 1) % shape.length]);
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      // An edge with no length, as of a label seen edge on, has no side to stand on.
      if (length === 0) continue;
      // How far a corner stands from the edge's line, to one side of it.
      const off = (/** @type {Corner} */ corner) => ((corner.x - from.x) * (to.y - from.y) - (corner.y - from.y) * (to.x - from.x)) / length;
      const ofOne = one.map(off);
      const ofOther = other.map(off);
      if (Math.max(...ofOne) - TOUCH_PX <= Math.min(...ofOther) || Math.max(...ofOther) - TOUCH_PX <= Math.min(...ofOne)) return true;
    }
  }
  return false;
}

/**
 * What is wrong with a state's labels: too many, one outside the clear part of
 * the window, or two that overlap. Returns one message for each fault, and
 * none when all is well.
 *
 * @param {readonly LabelRect[] | null} labels What the page reported, or null if it reported nothing.
 * @param {{ width: number, height: number, left?: number, top?: number }} viewport The part of the window no panel covers: it runs from `left`, or from 0, to `width`, and from `top`, or from 0, to `height`.
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
    if (
      rect.left < (viewport.left ?? 0) ||
      rect.top < (viewport.top ?? 0) ||
      rect.right > viewport.width ||
      rect.bottom > viewport.height
    ) {
      faults.push(`a label runs out of the window: ${show(rect)}`);
    }
    for (const other of labels.slice(i + 1)) {
      if (!standApart(cornersOf(rect), cornersOf(other))) faults.push(`two labels overlap: ${show(rect)} and ${show(other)}`);
    }
  });
  return faults;
}
