/**
 * The screenshot script: the repeatable gate for every ticket that changes the
 * map. It opens the built framework-map.html from file:// in each named state
 * and at each viewport, waits for the "ready" signal and saves a screenshot to
 * screenshots/ at the repository root.
 *
 * It fails if a state logs a console error, throws, never signals "ready", or
 * makes a request to anything other than the file itself. It does not compare
 * pixels, because headless 3D rendering varies between runs.
 *
 * Usage: node scripts/screenshots.mjs [path to the built file]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { states, viewports } from './screenshot-states.mjs';

const READY_SELECTOR = 'html[data-ready="true"]';
const READY_TIMEOUT_MS = 15_000;

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const builtFile = path.resolve(process.argv[2] ?? path.join(repositoryRoot, 'framework-map.html'));
const outputDir = path.join(repositoryRoot, 'screenshots');

/** Uses the installed Chrome or Edge, and falls back to Playwright's own Chromium. */
async function launchBrowser() {
  const failures = [];
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (error) {
      failures.push(`${channel ?? 'bundled chromium'}: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
    }
  }
  throw new Error(`No browser could be started.\n${failures.join('\n')}`);
}

/** A request stays inside the file when it is the file itself or inline data. */
const staysInsideFile = (/** @type {string} */ url) => /^(file|data|blob|about):/.test(url);

mkdirSync(outputDir, { recursive: true });
const browser = await launchBrowser();
/** @type {string[]} */
const failures = [];

try {
  for (const state of states) {
    for (const viewport of viewports) {
      const label = `${state.name}-${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();

      page.on('console', (message) => {
        if (message.type() === 'error') failures.push(`${label}: console error: ${message.text()}`);
      });
      page.on('pageerror', (error) => failures.push(`${label}: uncaught error: ${error.message}`));
      page.on('request', (request) => {
        if (!staysInsideFile(request.url())) failures.push(`${label}: network request: ${request.url()}`);
      });

      const url = pathToFileURL(builtFile);
      url.hash = state.fragment;
      try {
        await page.goto(url.href);
        await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: READY_TIMEOUT_MS });
        const screenshotPath = path.join(outputDir, `${label}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`saved ${path.relative(repositoryRoot, screenshotPath)}`);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`\n${states.length} state(s) at ${viewports.length} viewport(s), no console errors, no network requests.`);
