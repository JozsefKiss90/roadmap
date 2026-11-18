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
 * the window, under the rail or under the detail card; and if two panels overlap or a panel runs out of the
 * window. It does not compare pixels, because headless 3D rendering varies
 * between runs.
 *
 * It fails as well if the page is wider than the window, so that it could scroll sideways; if a panel
 * lies over the selected mark or cell; and, where the viewport has a touch screen, if a control is
 * smaller than 44 by 44 pixels.
 *
 * A viewport may be a phone's or a tablet's: it then has a touch screen for its main pointer. A state
 * may name its own viewports, and may ask for a browser with no WebGL.
 *
 * Usage: node scripts/screenshots.mjs [path to the built file]
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MOST_LABELS, states, viewports } from './screenshot-states.mjs';
import { controlFaults } from './control-faults.mjs';
import { labelFaults } from './label-faults.mjs';
import { launchBrowser } from './launch-browser.mjs';
import { panelFaults } from './panel-faults.mjs';

const READY_SELECTOR = 'html[data-ready="true"]';
const READY_TIMEOUT_MS = 15_000;
/** The longest a state may take to come to rest: several times the longest duration in the "Map motion" table. */
const REST_TIMEOUT_MS = 5_000;
/** The least width and height of a control on a touch screen. */
const LEAST_CONTROL_PX = 44;
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
/** Notes a failure, and says it at once: the whole run takes a while. */
const fail = (/** @type {string} */ message) => {
  failures.push(message);
  console.error(`  ! ${message}`);
};
let taken = 0;

/** Run in the page before its own code: the browser then gives no WebGL context, as one with WebGL switched off. */
function withoutWebGL() {
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error The stand-in takes any context name, as the page may ask for any.
  HTMLCanvasElement.prototype.getContext = function (name, ...rest) {
    return /webgl/i.test(String(name)) ? null : Reflect.apply(getContext, this, [name, ...rest]);
  };
}

/**
 * Run in the page: the panels that are on it, as rectangles, and the part of the window they leave clear.
 * The rail is reported where the canvas keeps clear of it: its whole width in the full layout, its column
 * of icons in the compact one, and its icons in the bar. A rail, or a part of it, opened over the canvas
 * is no fault, and the search results open over the canvas too: neither is reported.
 */
function readPanels() {
  const root = document.documentElement;
  const px = (/** @type {string} */ name) => Number.parseFloat(getComputedStyle(root).getPropertyValue(name)) || 0;
  /** @type {import('./panel-faults.mjs').PanelRect[]} */
  const panels = [];
  const railWidth = px('--rail-width');
  const barHeight = px('--bar-height');
  const rail = document.querySelector('.rail');
  if (rail?.getClientRects().length && root.hasAttribute('data-bar')) {
    // The bar is as wide as the window, and the breadcrumb may stand in its row: its icons are the panel.
    const icons = [...rail.querySelectorAll('.rail-icons > .rail-icon')]
      .map((icon) => icon.getBoundingClientRect())
      .filter((rect) => rect.width > 0);
    if (rail.hasAttribute('data-collapsed') && icons.length > 0) {
      panels.push({
        name: 'bar',
        left: Math.min(...icons.map((rect) => rect.left)),
        top: Math.min(...icons.map((rect) => rect.top)),
        right: Math.max(...icons.map((rect) => rect.right)),
        bottom: Math.max(...icons.map((rect) => rect.bottom)),
      });
    }
  } else if (rail?.getClientRects().length) {
    panels.push({ name: 'rail', left: 0, top: 0, right: railWidth, bottom: root.clientHeight });
  }
  for (const [name, selector] of [
    ['breadcrumb', '.breadcrumb ol'],
    ['legend', '.legend'],
    ['phase strip', '.phase-steps'],
    ['detail card', '.detail-card'],
    ['fallback page', '.fallback'],
  ]) {
    const rect = document.querySelector(/** @type {string} */ (selector))?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) continue;
    // The fallback page is a page to read, and scrolls down in a window too short for it: its width is what is checked.
    const bottom = name === 'fallback page' ? Math.min(rect.bottom, root.clientHeight) : rect.bottom;
    panels.push({ name: /** @type {string} */ (name), left: rect.left, top: rect.top, right: rect.right, bottom });
  }
  // The detail card stands at the right, or at the bottom in the upright layout: the picture ends where it
  // begins. The phase strip stands at the foot of what is left, and the picture ends over it.
  const card = panels.find((panel) => panel.name === 'detail card');
  const strip = panels.find((panel) => panel.name === 'phase strip');
  const atBottom = card !== undefined && card.left <= 0;
  const clear = {
    left: railWidth,
    top: barHeight,
    width: card && !atBottom ? card.left : root.clientWidth,
    height: strip?.top ?? (card && atBottom ? card.top : root.clientHeight),
  };
  return { panels, clear, pageWidth: Math.max(root.scrollWidth, document.body.scrollWidth), fallback: root.hasAttribute('data-fallback') };
}

/**
 * Run in the page: every control a finger can press that is on show, as a rectangle with a name for its kind.
 * A field or a checkbox is pressed by the label or the box around it, so that is what is measured.
 */
function readControls() {
  /** @type {import('./control-faults.mjs').ControlRect[]} */
  const controls = [];
  const seen = new Set();
  for (const found of document.querySelectorAll('button, a[href], input, [role="option"], .outline-row')) {
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

try {
  for (const state of states) {
    for (const viewport of state.at ?? viewports) {
      for (const { reducedMotion, suffix } of MOTION_SETTINGS) {
        const label = `${state.name}-${viewport.width}x${viewport.height}${suffix}`;
        const { width, height, touch = false } = viewport;
        const context = await browser.newContext({
          viewport: { width, height },
          // A phone or a tablet: its screen is its pointer, and it draws two device pixels to one.
          deviceScaleFactor: touch ? 2 : 1,
          hasTouch: touch,
          isMobile: touch,
          reducedMotion,
        });
        if (state.webgl === false) await context.addInitScript(withoutWebGL);
        const page = await context.newPage();

        page.on('console', (message) => {
          if (message.type() === 'error') fail(`${label}: console error: ${message.text()}`);
        });
        page.on('pageerror', (error) => fail(`${label}: uncaught error: ${error.message}`));
        page.on('request', (request) => {
          if (!staysInsideFile(request.url())) fail(`${label}: network request: ${request.url()}`);
        });

        const url = new URL(builtFileUrl);
        url.hash = state.fragment;
        try {
          await page.goto(url.href);
          await page.waitForSelector(READY_SELECTOR, { state: 'attached', timeout: READY_TIMEOUT_MS });
          // A state may need more than its fragment to reach it: a key to press, text to type, or something to tap.
          for (const [action, value] of state.steps ?? []) {
            if (action === 'press') await page.keyboard.press(value);
            else if (action === 'type') await page.keyboard.type(value);
            else if (touch) await page.tap(value);
            else await page.click(value);
            // With reduced motion on, every change is made at once: nothing is ever under way.
            if (reducedMotion === 'reduce' && (await page.evaluate(() => window.frameworkMap?.isMoving()))) {
              fail(`${label}: something moved after "${value}" with reduced motion on`);
            }
          }
          // A key may start a flight, a fade or a panel. The screenshot is of the state at rest.
          await page.waitForFunction(() => window.frameworkMap?.isMoving() === false, null, { timeout: REST_TIMEOUT_MS });
          const { panels, clear, pageWidth, fallback } = await page.evaluate(readPanels);
          for (const fault of panelFaults(panels, viewport)) fail(`${label}: ${fault}`);
          if (pageWidth > width) fail(`${label}: the page is ${pageWidth} pixels wide, wider than the window, and can scroll sideways`);
          // The fallback page is a page to read, and scrolls down. The map never scrolls.
          if (!fallback) {
            const labels = await page.evaluate(() => window.frameworkMap?.labels() ?? null);
            // The rail or the bar and an open detail card each cover a part of the window, and the labels stand in the rest.
            for (const fault of labelFaults(labels, clear, MOST_LABELS)) fail(`${label}: ${fault}`);
            // A panel never lies over what is selected: not the rail or the bar, not the detail card, not the phase strip.
            const selection = await page.evaluate(() => window.frameworkMap?.selection() ?? null);
            if (selection && (selection.right > clear.width || selection.bottom > clear.height || selection.left < clear.left || selection.top < clear.top)) {
              const show = (/** @type {number} */ value) => Math.round(value);
              fail(
                `${label}: the selection lies under a panel: (${show(selection.left)}, ${show(selection.top)}) to (${show(selection.right)}, ${show(selection.bottom)})`,
              );
            }
          }
          if (touch) {
            for (const fault of controlFaults(await page.evaluate(readControls), LEAST_CONTROL_PX)) fail(`${label}: ${fault}`);
          }
          const screenshotPath = path.join(outputDir, `${label}.png`);
          await page.screenshot({ path: screenshotPath });
          taken += 1;
          console.log(`saved ${path.relative(repositoryRoot, screenshotPath)}`);
        } catch (error) {
          fail(`${label}: ${firstLine(error)}`);
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
  `\n${states.length} state(s) and ${taken} screenshot(s), with reduced motion off and on: no console errors, no network requests, no label, panel, selection or control faults, no page wider than its window, all at rest.`,
);
