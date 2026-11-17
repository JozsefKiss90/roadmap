/**
 * The "ready" signal: `data-ready="true"` on the `<html>` element, set once the
 * page has finished its first render in its own typefaces. The screenshot
 * script waits for it.
 */
const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Loads the page's typefaces. A face that fails to load must not hold the page
 * back: the page goes on in a fallback face, and the console error makes the
 * screenshot script fail.
 */
export async function loadFonts(fonts: readonly string[]): Promise<void> {
  await Promise.allSettled(fonts.map((font) => document.fonts.load(font)));
  for (const font of fonts) {
    if (!document.fonts.check(font)) console.error(`A typeface could not be loaded: ${font}`);
  }
}

export async function signalReady(): Promise<void> {
  // Two frames: the first draws everything that is now in place, and by the
  // second that picture has been painted.
  await nextFrame();
  await nextFrame();
  document.documentElement.dataset.ready = 'true';
}
