/**
 * The "ready" signal: set once the page has finished its first render in its
 * own typefaces. The screenshot script waits for `html[data-ready="true"]`;
 * code in the page can listen for the `framework-map:ready` event instead.
 */
export const READY_EVENT = 'framework-map:ready';

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export async function signalReady(fontsToLoad: readonly string[]): Promise<void> {
  await Promise.all(fontsToLoad.map((font) => document.fonts.load(font)));
  // Two frames: the first lays out with the loaded faces, and by the second
  // that layout has been painted.
  await nextFrame();
  await nextFrame();
  document.documentElement.dataset.ready = 'true';
  window.dispatchEvent(new Event(READY_EVENT));
}
