/**
 * Read in the page by the screenshot script and the accessibility script: the
 * controls that are on show, for the check on their size (scripts/control-faults.mjs).
 * Playwright sends the function to the page as text, so it stands on its own
 * and uses nothing from this file.
 */

/**
 * Every control that is on show, as a rectangle with a name for its kind. A field or a checkbox is
 * pressed by the label or the box around it, so that is what is measured. The chevron of an outline
 * row is a control of its own: it opens and closes the row, apart from the rest of the row.
 */
export function readControls() {
  /** @type {import('./control-faults.mjs').ControlRect[]} */
  const controls = [];
  const seen = new Set();
  for (const found of document.querySelectorAll('button, a[href], input, [role="option"], .outline-row, .outline-chevron')) {
    const pressed = found.matches('input') ? (found.closest('label, .search-field') ?? found) : found;
    if (seen.has(pressed)) continue;
    seen.add(pressed);
    // What is not drawn, or takes no press, is no control: a part that is folded, a panel that is closing.
    if (!pressed.checkVisibility({ visibilityProperty: true }) || pressed.closest('[inert]')) continue;
    const rect = pressed.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const name = `${pressed.tagName.toLowerCase()}.${[...pressed.classList].join('.') || pressed.getAttribute('role') || '?'}`;
    controls.push({ name, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
  }
  return controls;
}
