/**
 * The checks the screenshot script makes on a state's panels: the rail, the
 * breadcrumb, the legend, the phase strip, the detail card and whatever else
 * stands around the canvas. The script reads one rectangle for each panel on
 * the page, in pixels of the window.
 *
 * It finds a panel that lies over another or runs out of the window. It does
 * not see inside a panel: text cut short within one is for the critique.
 *
 * @typedef {{ name: string, left: number, top: number, right: number, bottom: number }} PanelRect
 */

/** Two panels may touch or share an edge by this much before they count as overlapping. */
const TOUCH_PX = 1;

/**
 * What is wrong with a state's panels: one outside the window, or two that
 * overlap. Returns one message for each fault, and none when all is well.
 *
 * @param {readonly PanelRect[] | null} panels What the page reported, or null if it reported nothing.
 * @param {{ width: number, height: number }} viewport
 * @returns {string[]}
 */
export function panelFaults(panels, viewport) {
  if (!panels) return ['the page did not report its panels'];
  /** @type {string[]} */
  const faults = [];
  const show = (/** @type {PanelRect} */ rect) =>
    `the ${rect.name}, (${Math.round(rect.left)}, ${Math.round(rect.top)}) to (${Math.round(rect.right)}, ${Math.round(rect.bottom)})`;

  panels.forEach((rect, i) => {
    if (
      rect.left < -TOUCH_PX ||
      rect.top < -TOUCH_PX ||
      rect.right > viewport.width + TOUCH_PX ||
      rect.bottom > viewport.height + TOUCH_PX
    ) {
      faults.push(`a panel runs out of the window: ${show(rect)}`);
    }
    for (const other of panels.slice(i + 1)) {
      const apart =
        rect.right - TOUCH_PX <= other.left ||
        other.right - TOUCH_PX <= rect.left ||
        rect.bottom - TOUCH_PX <= other.top ||
        other.bottom - TOUCH_PX <= rect.top;
      if (!apart) faults.push(`two panels overlap: ${show(rect)} and ${show(other)}`);
    }
  });
  return faults;
}
