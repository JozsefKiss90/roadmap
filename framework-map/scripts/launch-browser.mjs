/**
 * Starts the browser the scripts open the built file in: the installed Chrome or Edge, or
 * Playwright's own Chromium where neither is there.
 */
import { chromium } from 'playwright';

const firstLine = (/** @type {unknown} */ error) =>
  error instanceof Error ? error.message.split(/\r?\n/)[0] : String(error);

/** @returns {Promise<import('playwright').Browser>} */
export async function launchBrowser() {
  const failures = [];
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (error) {
      failures.push(`${channel ?? 'bundled chromium'}: ${firstLine(error)}`);
    }
  }
  throw new Error(`No browser could be started.\n${failures.join('\n')}`);
}
