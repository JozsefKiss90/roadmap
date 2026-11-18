/**
 * What the scripts that open the built file in a browser share: where the
 * built file is, the wait for the map to come to rest, the stand-in for a
 * browser with no WebGL, and the way a check is said and counted.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * The URL of the built file: the one named on the command line, or framework-map.html at the repository root.
 * @param {string | undefined} named The script's first argument.
 */
export const builtFileUrlFrom = (named) => pathToFileURL(path.resolve(named ?? path.join(repositoryRoot, 'framework-map.html'))).href;

/** Waits until no flight, fade or panel is under way. */
export const atRest = (/** @type {import('playwright').Page} */ page) =>
  page.waitForFunction(() => window.frameworkMap?.isMoving() === false);

/** Run in the page before its own code: the browser then gives no WebGL context, as one with WebGL switched off. */
export function withoutWebGL() {
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error The stand-in takes any context name, as the page may ask for any.
  HTMLCanvasElement.prototype.getContext = function (name, ...rest) {
    return /webgl/i.test(String(name)) ? null : Reflect.apply(getContext, this, [name, ...rest]);
  };
}

/** The checks of one run: `check` says a finding and counts it if it failed, and `failed` gives the count. */
export function createChecks() {
  let failed = 0;
  return {
    /**
     * @param {string} name What was checked, as a sentence that holds when the check passes.
     * @param {boolean} ok
     * @param {unknown} [detail] What was found, said after the name.
     */
    check(name, ok, detail = '') {
      if (!ok) failed += 1;
      console.log(`${ok ? '  ok    ' : '  FAILED'}  ${name}${detail === '' ? '' : `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})`}`);
    },
    failed: () => failed,
  };
}
