/**
 * The screenshot script: the repeatable gate for every ticket that changes the
 * map. It opens the built framework-map.html from file:// in each named state
 * and at each viewport, with the system's reduced-motion setting off and then
 * on. It waits for the "ready" signal, and for every flight, fade and panel
 * to end, and saves a screenshot to screenshots/ at the repository root. A
 * screenshot taken with reduced motion on has "-reduced-motion" in its name.
 *
 * It fails if a state logs a console error, throws, never signals "ready", or
 * requests anything other than the file itself. It fails if a state is still
 * moving after its time is up, or if anything moves at all with reduced motion on. It also fails if a state
 * shows too many labels, two labels that overlap, or a label that runs out of
 * the window, under the rail or under the detail card. It does not compare pixels, because headless 3D rendering varies
 * between runs.
 *
 * Usage: node scripts/screenshots.mjs [path to the built file]
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { MOST_LABELS, states, viewports } from './screenshot-states.mjs';
import { labelFaults } from './label-faults.mjs';

const READY_SELECTOR = 'html[data-ready="true"]';
const READY_TIMEOUT_MS = 15_000;
/** The longest a state may take to come to rest: several times the longest duration in the "Map motion" table. */
const REST_TIMEOUT_MS = 5_000;
/**
 * The system's reduced-motion setting, as Playwright names it, and what it adds to a screenshot's name.
 * @type {readonly { reducedMotion: 'no-preference' | 'reduce', suffix: string }[]}
 */
const MOTION_SETTINGS = [
  { reducedMotion: 'no-preference', suffix: '' },
  { reducedMotion: 'reduce', suffix: '-reduced-motion' },
];

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
      failures.push(`${channel ?? 'bundled chromium'}: ${firstLine(error)}`);
    }
  }
  throw new Error(`No browser could be started.\n${failures.join('\n')}`);
}

const builtFileUrl = pathToFileURL(builtFile).href;

/** A request stays inside the file when it is the file itself or inline data. */
const staysInsideFile = (/** @type {string} */ url) =>
  url.split('#')[0] === builtFileUrl || /^(data|blob|about):/.test(url);

const firstLine = (/** @type {unknown} */ error) =>
  error instanceof Error ? error.message.split(/\r?\n/)[0] : String(error);

// Start from an empty folder, so a state that fails leaves no old screenshot behind.
mkdirSync(outputDir, { recursive: true });
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png')) rmSync(path.join(outputDir, file));
}
const browser = await launchBrowser();
console.log(`browser: ${browser.browserType().name()} ${browser.version()}`);
/** @type {string[]} */
const failures = [];

try {
  for (const state of states) {
    for (const viewport of viewports) {
      for (const { reducedMotion, suffix } of MOTION_SETTINGS) {
        const label = `${state.name}-${viewport.width}x${viewport.height}${suffix}`;
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion });
        const page = await context.newPage();

        page.on('console', (message) => {
          if (message.type() === 'error') failures.push(`${label}: console error: ${message.text()}`);
        });
        page.on('pageerror', (error) => failures.push(`${label}: uncaught error: ${error.message}`));
        page.on('request', (request) => {
          if (!staysInsideFile(request.url())) failures.push(`${label}: network request: ${request.url()}`);
        });

        const url = new URL(builtFileUrl);
        url.hash = state.fragment;
        try {
          await page.goto(url.href);
          await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: READY_TIMEOUT_MS });
          // A state may need the keyboard to reach it: a key to press, or text to type.
          for (const [action, value] of state.keys ?? []) {
            if (action === 'press') await page.keyboard.press(value);
            else await page.keyboard.type(value);
            // With reduced motion on, every change is made at once: nothing is ever under way.
            if (reducedMotion === 'reduce' && (await page.evaluate(() => window.frameworkMap?.isMoving()))) {
              failures.push(`${label}: something moved after "${value}" with reduced motion on`);
            }
          }
          // A key may start a flight, a fade or a panel. The screenshot is of the state at rest.
          await page.waitForFunction(() => window.frameworkMap?.isMoving() === false, null, { timeout: REST_TIMEOUT_MS });
          const labels = await page.evaluate(() => window.frameworkMap?.labels() ?? null);
          // The rail covers the left of the window and an open detail card the right, so the labels stand between them.
          const [railRight, cardLeft] = await page.evaluate(() => [
            document.querySelector('.rail')?.getBoundingClientRect().right ?? null,
            document.querySelector('.detail-card:not([hidden])')?.getBoundingClientRect().left ?? null,
          ]);
          const clear = { left: railRight ?? 0, width: cardLeft ?? viewport.width, height: viewport.height };
          for (const fault of labelFaults(labels, clear, MOST_LABELS)) failures.push(`${label}: ${fault}`);
          const screenshotPath = path.join(outputDir, `${label}.png`);
          await page.screenshot({ path: screenshotPath });
          console.log(`saved ${path.relative(repositoryRoot, screenshotPath)}`);
        } catch (error) {
          failures.push(`${label}: ${firstLine(error)}`);
        }
        await context.close();
      }
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
console.log(
  `\n${states.length} state(s) at ${viewports.length} viewport(s), with reduced motion off and on: no console errors, no network requests, no label faults, all at rest.`,
);
