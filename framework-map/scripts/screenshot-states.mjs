/**
 * The named states the screenshot script opens. Each is the built file plus a
 * URL fragment. A ticket that adds something visible adds its state here.
 *
 * @typedef {object} ScreenshotState
 * @property {string} name Used in the screenshot's file name.
 * @property {string} fragment The URL fragment, without the leading "#".
 */

/** @type {readonly ScreenshotState[]} */
export const states = [{ name: 'stack-at-rest', fragment: '' }];

/** @type {readonly { width: number, height: number }[]} */
export const viewports = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
