/**
 * The touch check: drives the built framework-map.html as a phone would, with
 * an emulated touch screen, and says what it found. The screenshot script
 * checks what each state looks like; this checks what a finger can do.
 *
 * It opens the built file from file:// in an emulated phone held upright, and
 * checks that a tap selects, a drag orbits, a pinch changes the distance and
 * stops at the camera's limit, a finger held in place shows a mark's name,
 * and no gesture scrolls or zooms the page. It then does every task by touch
 * alone, turns the phone on its side, opens one link at every size, and
 * checks reduced motion and a laptop with a touch screen.
 *
 * It is an emulation. A real phone's browser may still differ, in its
 * on-screen keyboard above all: the check on the search box tells the page
 * how much of the window is in sight, as a keyboard would.
 *
 * Usage: node scripts/touch-check.mjs [path to the built file]
 */
import { atRest, builtFileUrlFrom, createChecks } from './check-page.mjs';
import { launchBrowser } from './launch-browser.mjs';

const builtFileUrl = builtFileUrlFrom(process.argv[2]);

const PHONE = { width: 390, height: 844 };
const PHONE_ON_ITS_SIDE = { width: 844, height: 390 };
/** The sizes one link is opened at: a size for each page layout, and the sizes the ticket names. */
const LINK_SIZES = [
  { width: 360, height: 640, touch: true },
  PHONE_ON_ITS_SIDE,
  { width: 768, height: 1024, touch: true },
  { width: 1024, height: 768, touch: true },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];
/** A link that names a place, a selection, a filter, and a lens with its role, in the order the page writes them. */
const LINK = 'cluster=4A&select=tool:serena&hosting=Hub&lens=role&role=A';
/** Longer than the hold of src/press.ts. */
const HOLD_MS = 700;

const { check, failed } = createChecks();

const browser = await launchBrowser();
/** @type {string[]} */
const errors = [];

/**
 * Opens the built file in a window of its own.
 * @param {{ width: number, height: number, touch?: boolean }} size
 * @param {{ fragment?: string, reducedMotion?: 'reduce' | 'no-preference', mobile?: boolean }} [options]
 */
async function open(size, { fragment = '', reducedMotion = 'no-preference', mobile = true } = {}) {
  const touch = size.touch ?? true;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: touch && mobile ? 2 : 1,
    hasTouch: touch,
    isMobile: touch && mobile,
    reducedMotion,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const url = new URL(builtFileUrl);
  url.hash = fragment;
  await page.goto(url.href);
  await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
  await atRest(page);
  return { context, page, touches: await context.newCDPSession(page) };
}

/** Waits until the page has taken a page layout, as after the window is turned. */
const inLayout = (/** @type {import('playwright').Page} */ page, /** @type {string} */ layout) =>
  page.waitForFunction((name) => document.documentElement.dataset.layout === name, layout, { timeout: 5000 }).catch(() => {});

/** What the page says of itself. */
const read = (/** @type {import('playwright').Page} */ page) =>
  page.evaluate(() => {
    const text = (/** @type {string} */ selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
    const card = document.querySelector('.detail-card');
    const hover = document.querySelector('.hover-label');
    return {
      layout: document.documentElement.dataset.layout,
      fragment: decodeURIComponent(location.hash.slice(1)),
      card: card && !card.hasAttribute('hidden') ? text('.detail-card .card-name') : null,
      reach: text('.lens-count'),
      passing: document.querySelector('.filters-count')?.firstChild?.textContent ?? null,
      hover: hover && !hover.hasAttribute('hidden') ? text('.hover-label-name') : null,
      labels: window.frameworkMap?.labels() ?? [],
      selection: window.frameworkMap?.selection() ?? null,
      pageZoom: window.visualViewport?.scale ?? 1,
      scrolled: window.scrollX !== 0 || window.scrollY !== 0 || document.documentElement.scrollLeft !== 0,
      canvasTouchAction: document.querySelector('#stage canvas') instanceof HTMLElement ? getComputedStyle(/** @type {HTMLElement} */ (document.querySelector('#stage canvas'))).touchAction : null,
      openPart: document.querySelector('.rail')?.getAttribute('data-part') ?? null,
    };
  });

/** One finger or two, as the browser's own touch events. */
async function touch(/** @type {import('playwright').CDPSession} */ session, /** @type {'touchStart' | 'touchMove' | 'touchEnd'} */ type, /** @type {{ x: number, y: number }[]} */ points) {
  await session.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, id) => ({ x: point.x, y: point.y, id })),
  });
}

/** A finger dragged from one point to another, in steps. */
async function drag(/** @type {import('playwright').CDPSession} */ session, /** @type {{ x: number, y: number }} */ from, /** @type {{ x: number, y: number }} */ to) {
  await touch(session, 'touchStart', [from]);
  for (let step = 1; step <= 8; step += 1) {
    await touch(session, 'touchMove', [{ x: from.x + ((to.x - from.x) * step) / 8, y: from.y + ((to.y - from.y) * step) / 8 }]);
  }
  await touch(session, 'touchEnd', []);
}

/** Two fingers that start `fromApart` pixels apart around a point and end `toApart` apart. */
async function pinch(/** @type {import('playwright').CDPSession} */ session, /** @type {{ x: number, y: number }} */ around, /** @type {number} */ fromApart, /** @type {number} */ toApart) {
  const fingers = (/** @type {number} */ apart) => [
    { x: around.x - apart / 2, y: around.y },
    { x: around.x + apart / 2, y: around.y },
  ];
  await touch(session, 'touchStart', fingers(fromApart));
  for (let step = 1; step <= 8; step += 1) await touch(session, 'touchMove', fingers(fromApart + ((toApart - fromApart) * step) / 8));
  await touch(session, 'touchEnd', []);
}

/**
 * One of the labels the page reported. A page that reported fewer has failed its check already.
 * @param {import('./label-faults.mjs').LabelRect[]} labels
 */
function labelAt(labels, /** @type {number} */ at) {
  const label = labels.at(at);
  if (!label) throw new Error(`The page reported ${labels.length} labels, and label ${at} was asked for.`);
  return label;
}

/**
 * A point of the window measured from a label's bottom edge: `along` pixels from the edge's left end toward
 * its right, and `over` pixels above it. A tier's label stands in the scene at an angle, as its plate does,
 * so the plate is found along the label and not beside the rectangle around it.
 * @param {import('./label-faults.mjs').LabelRect} label
 */
function fromLabel(label, /** @type {number} */ along, /** @type {number} */ over) {
  const [from, to, top] = label.corners ?? [];
  if (!from || !to || !top) throw new Error('The page reported a label without its corners.');
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const height = Math.hypot(top.x - to.x, top.y - to.y);
  return {
    x: from.x + ((to.x - from.x) * along) / length + ((top.x - to.x) * over) / height,
    y: from.y + ((to.y - from.y) * along) / length + ((top.y - to.y) * over) / height,
  };
}

/** How long a label's bottom edge is, in pixels. */
function bottomEdgeOf(/** @type {import('./label-faults.mjs').LabelRect} */ label) {
  const [from, to] = label.corners ?? [];
  if (!from || !to) throw new Error('The page reported a label without its corners.');
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** A point on the top tier's plate under the bar, where the tier's tag stands on the plate's far edge, from its left end. */
const plateUnderCount = (/** @type {import('./label-faults.mjs').LabelRect} */ count) => fromLabel(count, 30, -7);

/**
 * How far the first label stands from the last, down the window: it grows as the camera comes closer.
 * @param {import('./label-faults.mjs').LabelRect[]} labels
 */
const spread = (labels) => (labels.length < 2 ? 0 : Math.abs(labelAt(labels, -1).top - labelAt(labels, 0).top));

try {
  // A phone held upright.
  console.log(`\nAn emulated phone held upright, ${PHONE.width} by ${PHONE.height}`);
  const { context, page, touches } = await open(PHONE);
  const start = await read(page);
  check('the map opens in the upright page layout', start.layout === 'upright', start.layout);
  check('the stack is drawn, with a count on each plate', start.labels.length === 8, `${start.labels.length} labels`);
  check('the canvas takes every gesture itself', start.canvasTouchAction === 'none', start.canvasTouchAction);

  // A drag orbits. The counts stand over their plates, so they move as the stack turns.
  const middle = { x: PHONE.width / 2, y: (labelAt(start.labels, 3).top + labelAt(start.labels, 4).top) / 2 + 20 };
  await drag(touches, middle, { x: middle.x + 120, y: middle.y });
  const turned = await read(page);
  check('a drag on the canvas orbits the stack', Math.abs(labelAt(turned.labels, 0).left - labelAt(start.labels, 0).left) > 4, {
    before: Math.round(labelAt(start.labels, 0).left),
    after: Math.round(labelAt(turned.labels, 0).left),
  });
  check('a drag is no tap: the map is where it was', turned.fragment === '', turned.fragment);

  // A pinch changes the distance, and stops at the camera's limit.
  await pinch(touches, middle, 80, 240);
  const closer = await read(page);
  check('a pinch brings the camera closer', spread(closer.labels) > spread(turned.labels) * 1.2, {
    before: Math.round(spread(turned.labels)),
    after: Math.round(spread(closer.labels)),
  });
  check('a pinch is no tap: the map is where it was', closer.fragment === '', closer.fragment);
  await pinch(touches, middle, 40, 340);
  await pinch(touches, middle, 40, 340);
  const nearest = await read(page);
  await pinch(touches, middle, 40, 340);
  const pastNearest = await read(page);
  check('the camera stops at its nearest', Math.abs(spread(pastNearest.labels) - spread(nearest.labels)) < 1, {
    then: Math.round(spread(nearest.labels)),
    after: Math.round(spread(pastNearest.labels)),
  });
  for (let times = 0; times < 4; times += 1) await pinch(touches, middle, 340, 40);
  const farthest = await read(page);
  await pinch(touches, middle, 340, 40);
  const pastFarthest = await read(page);
  check('the camera stops at its farthest', Math.abs(spread(pastFarthest.labels) - spread(farthest.labels)) < 1, {
    then: Math.round(spread(farthest.labels)),
    after: Math.round(spread(pastFarthest.labels)),
  });
  check('no gesture zoomed the page', pastFarthest.pageZoom === 1, pastFarthest.pageZoom);
  check('no gesture scrolled the page', !pastFarthest.scrolled);

  // A page the partner has zoomed, as with a pinch on a panel: the canvas lets a gesture move the page, so the
  // partner can come back out. At the page's own size the canvas takes its gestures again.
  await touches.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  // The page hears of the zoom a moment after it happens.
  const canvasTakes = (/** @type {string} */ action) =>
    page
      .waitForFunction((wanted) => getComputedStyle(/** @type {Element} */ (document.querySelector('#stage canvas'))).touchAction === wanted, action, { timeout: 5000 })
      .catch(() => {});
  await canvasTakes('auto');
  const zoomed = await read(page);
  await touches.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await canvasTakes('none');
  const unzoomed = await read(page);
  check('in a zoomed page the canvas lets a gesture move the page', zoomed.pageZoom > 1.5 && zoomed.canvasTouchAction === 'auto', {
    zoom: zoomed.pageZoom,
    canvas: zoomed.canvasTouchAction,
  });
  check('at its own size the page gives the canvas its gestures back',unzoomed.canvasTouchAction === 'none', unzoomed.canvasTouchAction);

  // A tap selects, as a click does: a plate, then a cell, then a mark.
  await page.reload();
  await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
  await atRest(page);
  const rested = await read(page);
  // The tag of the top tier stands on the far edge of its plate, from the plate's left end.
  const topPlate = plateUnderCount(labelAt(rested.labels, 0));
  await page.touchscreen.tap(topPlate.x, topPlate.y);
  await atRest(page);
  const atTier = await read(page);
  check('a tap on a plate goes to its tier', atTier.fragment === 'tier=T7', atTier.fragment);

  // T7's plate now fills the width. Its first cell is the cluster 7A, at the plate's left end.
  await page.evaluate(() => {
    location.hash = 'cluster=7A&select=7A';
  });
  await atRest(page);
  const cell = (await read(page)).selection;
  await page.tap('.detail-card .card-close');
  await atRest(page);
  await page.evaluate(() => {
    location.hash = 'tier=T7';
  });
  await atRest(page);
  await page.evaluate(() => {
    location.hash = 'cluster=7A';
  });
  await atRest(page);
  check('a link to a cluster opens with no detail card', (await read(page)).card === null);
  // The cell is one column of four marks. A tap between two marks is on the cell; a tap on a mark is on its tool.
  if (cell) {
    const acrossCell = (cell.left + cell.right) / 2;
    await page.touchscreen.tap(cell.left + 3, (cell.top + cell.bottom) / 2);
    await atRest(page);
    const onCell = await read(page);
    check('a tap on a cell selects its cluster', onCell.fragment === 'cluster=7A&select=7A' && onCell.card !== null, onCell.fragment);
    await page.touchscreen.tap(acrossCell, cell.top + (cell.bottom - cell.top) * 0.16);
    await atRest(page);
    const onMark = await read(page);
    check('a tap on a mark selects its tool', /select=tool:/.test(onMark.fragment) && onMark.card !== null, onMark.fragment);

    // A finger held in place shows what a hover shows.
    await page.tap('.detail-card .card-close');
    await atRest(page);
    const before = await read(page);
    const mark = { x: acrossCell, y: cell.top + (cell.bottom - cell.top) * 0.4 };
    await touch(touches, 'touchStart', [mark]);
    await page.waitForTimeout(HOLD_MS);
    const held = await read(page);
    await touch(touches, 'touchEnd', []);
    await atRest(page);
    const after = await read(page);
    check('a finger held on a mark shows its name', held.hover !== null, held.hover);
    check('letting go after a hold selects nothing, and the name stays', after.fragment === before.fragment && after.hover === held.hover, after.fragment);
    await page.touchscreen.tap(20, PHONE.height - 20);
    await atRest(page);
    check('the next touch takes the name away', (await read(page)).hover === null);
  } else {
    check('the page says where the selected cell is drawn', false);
  }

  // Every task by touch alone.
  console.log('\nEvery task, by touch alone');
  const icon = (/** @type {string} */ name) => `.rail-icon[aria-label^="${name}"]`;
  await page.evaluate(() => {
    location.hash = '';
  });
  await atRest(page);

  await page.tap(icon('Search'));
  await page.keyboard.type('serena');
  // A keyboard that covers the lower part of the window: 400 pixels are in sight.
  await page.evaluate(() => {
    const viewport = /** @type {VisualViewport} */ (window.visualViewport);
    Object.defineProperty(viewport, 'height', { configurable: true, get: () => 400 });
    viewport.dispatchEvent(new Event('resize'));
  });
  const inSight = await page.evaluate(() => {
    const rect = (/** @type {string} */ selector) => document.querySelector(selector)?.getBoundingClientRect();
    return { field: rect('.search-field')?.bottom, results: rect('.search-results')?.bottom, first: rect('.search-option')?.bottom };
  });
  check(
    'the search box and its results stay in sight over an on-screen keyboard',
    (inSight.field ?? Infinity) <= 400 && (inSight.results ?? Infinity) <= 400 && (inSight.first ?? Infinity) <= 400,
    inSight,
  );
  await page.evaluate(() => {
    const viewport = /** @type {VisualViewport} */ (window.visualViewport);
    // @ts-expect-error The stand-in is taken away again.
    delete viewport.height;
    viewport.dispatchEvent(new Event('resize'));
  });
  await page.tap('.search-option');
  await atRest(page);
  const found = await read(page);
  check('find a tool and read its detail card', found.card === 'Serena' && found.openPart === null, found.card);

  await page.tap('.detail-card .card-close');
  await atRest(page);
  check('close the card', (await read(page)).card === null);

  await page.tap(icon('Lens'));
  await page.tap('.lens .segment:has([value="role"])');
  await page.tap('.lens .segments-within .segment:has([value="D"])');
  await atRest(page);
  const role = await read(page);
  check('switch on the role lens and pick a role', /lens=role&role=D/.test(role.fragment), role.fragment);

  await page.tap('.lens .segment:has([value="need"])');
  await page.tap('.need-row');
  await atRest(page);
  const need = await read(page);
  check('switch on the need trace and pick a need', /lens=need&need=N/.test(need.fragment) && need.card !== null && need.openPart === null, need.fragment);
  await page.tap('.detail-card .card-close');
  await atRest(page);

  await page.tap(icon('Lens'));
  await page.tap('.lens .segment:has([value="phase"])');
  // A press on the dimmed canvas beside the open part closes it.
  await page.touchscreen.tap(PHONE.width - 10, PHONE.height / 2);
  await atRest(page);
  await page.tap('.phase-step:has([value="P3"])');
  await atRest(page);
  const phase = await read(page);
  check('switch on the phase scrub and step the phases', /lens=phase&phase=P3/.test(phase.fragment), phase.fragment);

  await page.tap(icon('Lens'));
  await page.tap('.lens .segment:has([value="none"])');
  await page.tap('.rail-close');
  await atRest(page);
  check('switch the lens off', !/lens=/.test((await read(page)).fragment));

  await page.tap(icon('Filters'));
  await page.tap('.filters-committed');
  await atRest(page);
  const filtered = await read(page);
  check('set a filter', /decision=/.test(filtered.fragment) && /^340 of 805/.test(filtered.passing ?? ''), filtered.passing);
  await page.tap('.filters-clear');
  await atRest(page);
  const cleared = await read(page);
  check('clear the filters', !/decision=/.test(cleared.fragment) && /^805 of 805/.test(cleared.passing ?? ''), cleared.passing);
  await page.tap('.rail-close');

  await page.tap(icon('Outline'));
  await page.tap('.outline-tree > .outline-item:nth-child(4) > .outline-row');
  await atRest(page);
  const viaOutline = await read(page);
  check('go to a tier from the outline', /^tier=T4/.test(viaOutline.fragment) && viaOutline.openPart === null, viaOutline.fragment);
  await page.tap('.breadcrumb li:first-child button');
  await atRest(page);
  check('step out to the stack', (await read(page)).fragment === '');

  await page.tap(icon('Legend'));
  check('open the legend', await page.evaluate(() => document.querySelector('.legend')?.getBoundingClientRect().height ?? 0) > 0);
  await page.touchscreen.tap(PHONE.width - 10, PHONE.height - 10);
  check('the legend leaves at the next touch outside it', (await page.evaluate(() => document.querySelector('.legend')?.getBoundingClientRect().height ?? 0)) === 0);

  // Turning the phone.
  console.log('\nTurning the phone on its side, and back');
  await page.evaluate((link) => {
    location.hash = link;
  }, LINK);
  await atRest(page);
  await page.evaluate(() => /** @type {HTMLElement | null} */ (document.querySelector('.detail-card .card-name'))?.focus());
  const upright = await read(page);
  await page.setViewportSize(PHONE_ON_ITS_SIDE);
  await inLayout(page, 'narrow');
  await atRest(page);
  const onItsSide = await read(page);
  const focusKept = () => page.evaluate(() => document.activeElement?.classList.contains('card-name') ?? false);
  check('the page layout becomes the narrow one', onItsSide.layout === 'narrow', onItsSide.layout);
  check('the selection, the lens and the filters are kept', onItsSide.fragment === upright.fragment && onItsSide.card === upright.card && onItsSide.reach === upright.reach, onItsSide.fragment);
  check('the keyboard focus is kept', await focusKept());
  const beside = onItsSide.selection;
  check('the selection is not under the detail card', beside !== null && beside.right <= PHONE_ON_ITS_SIDE.width - 360, beside && Math.round(beside.right));
  await page.setViewportSize(PHONE);
  await inLayout(page, 'upright');
  await atRest(page);
  const back = await read(page);
  check('turned back, all is as it was', back.layout === 'upright' && back.fragment === upright.fragment && (await focusKept()), back.fragment);
  await context.close();

  // One link at every size.
  console.log('\nOne link, opened at every size');
  /** @type {string[]} */
  const seen = [];
  for (const size of LINK_SIZES) {
    const opened = await open(size, { fragment: LINK });
    const state = await read(opened.page);
    seen.push(JSON.stringify([state.fragment, state.card, state.reach, state.passing]));
    check(`${size.width} by ${size.height}, the ${state.layout} layout`, state.card === 'Serena' && state.fragment === LINK, state.fragment);
    await opened.context.close();
  }
  check('the selection, the lens and the filters are the same at every size', new Set(seen).size === 1, seen[0]);

  // Reduced motion.
  console.log('\nWith reduced motion switched on');
  const still = await open(PHONE, { reducedMotion: 'reduce' });
  const moving = () => still.page.evaluate(() => window.frameworkMap?.isMoving());
  await still.page.tap(icon('Filters'));
  check('a part of the rail opens at once', (await moving()) === false);
  await still.page.tap('.rail-close');
  await still.page.tap(icon('Legend'));
  check('the legend opens at once', (await moving()) === false);
  // The open legend lies over the left end of the top plates, so it is closed before the tap on one.
  await still.page.tap(icon('Legend'));
  const stillAt = await read(still.page);
  const stillPlate = plateUnderCount(labelAt(stillAt.labels, 0));
  await still.page.touchscreen.tap(stillPlate.x, stillPlate.y);
  check('the camera cuts to a tier', (await moving()) === false && (await read(still.page)).fragment === 'tier=T7');
  await still.page.evaluate(() => {
    location.hash = 'cluster=4A&select=tool:serena';
  });
  check('the detail card opens at once', (await moving()) === false && (await read(still.page)).card === 'Serena');
  await still.context.close();

  // A laptop with a touch screen: the mouse works as before, and so does a finger.
  console.log('\nA laptop with a touch screen, 1366 by 768');
  const laptop = await open({ width: 1366, height: 768, touch: true }, { mobile: false });
  const desk = await read(laptop.page);
  check('the page layout is the full one', desk.layout === 'full', desk.layout);
  // The top tier's label runs along its plate and ends a gap short of it: the plate is 80 pixels on, level with the label.
  const topLabel = labelAt(desk.labels, 0);
  const plate = fromLabel(topLabel, bottomEdgeOf(topLabel) + 80, 14);
  await laptop.page.mouse.move(plate.x, plate.y);
  await laptop.page.mouse.move(plate.x + 2, plate.y + 2);
  const cursor = await laptop.page.evaluate(() => /** @type {HTMLElement | null} */ (document.querySelector('#stage > div'))?.style.cursor);
  check('the mouse still hovers: a plate shows the pointer of something to click', cursor === 'pointer', cursor);
  await laptop.page.mouse.click(plate.x, plate.y);
  await atRest(laptop.page);
  check('a click on a plate goes to its tier', (await read(laptop.page)).fragment === 'tier=T7');
  await laptop.page.keyboard.press('Escape');
  await atRest(laptop.page);
  check('Escape steps out', (await read(laptop.page)).fragment === '');
  await laptop.page.touchscreen.tap(plate.x, plate.y);
  await atRest(laptop.page);
  check('a tap of a finger on the same plate goes to its tier too', (await read(laptop.page)).fragment === 'tier=T7');
  await laptop.context.close();

  check('no console error and no uncaught error in any of it', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

if (failed() > 0) {
  console.error(`\n${failed()} check(s) failed.`);
  process.exit(1);
}
console.log('\nEvery check passed.');
