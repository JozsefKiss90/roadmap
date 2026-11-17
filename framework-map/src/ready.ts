/**
 * The "ready" signal: `data-ready="true"` on the `<html>` element, set once the
 * page has finished its first render in its own typefaces. The screenshot
 * script waits for it.
 */
const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export async function signalReady(fontsToLoad: readonly string[]): Promise<void> {
  // A face that fails to load must not hold the page back: it becomes ready in
  // a fallback face, and the console error makes the screenshot script fail.
  await Promise.allSettled(fontsToLoad.map((font) => document.fonts.load(font)));
  for (const font of fontsToLoad) {
    if (!document.fonts.check(font)) console.error(`A typeface could not be loaded: ${font}`);
  }
  // Two frames: the first lays out with the loaded faces, and by the second
  // that layout has been painted.
  await nextFrame();
  await nextFrame();
  document.documentElement.dataset.ready = 'true';
}
