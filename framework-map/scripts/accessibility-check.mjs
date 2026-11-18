/**
 * The accessibility check: drives the built framework-map.html with the
 * keyboard alone, as a partner would who has no mouse, and reads what the page
 * tells assistive technology. The screenshot script checks what each state
 * looks like, and the touch check what a finger can do; this checks what the
 * keyboard can do, what a screen reader is told, and what the panels measure.
 *
 * It does every task with the keyboard alone: find a tool, read its detail
 * card, switch on each lens, pick a role, pick a need, step the phases, set
 * and clear a filter, step out, and close the card. After each step it reads
 * the live region and where the keyboard focus is. It walks the Tab order,
 * and measures every piece of text and every control on the page: the name
 * assistive technology gets, the contrast, the text floor, and the 24 pixels
 * a control needs for a mouse. It does the same in the page layouts where the
 * rail stands as icons, with reduced motion on, with wider text spacing, with
 * the single keys switched off, and on the fallback page.
 *
 * It is a browser driven by a script, and no screen reader. What a screen
 * reader says of these names and roles is for a partner who uses one.
 *
 * Usage: node scripts/accessibility-check.mjs [path to the built file]
 */
import { atRest, builtFileUrlFrom, createChecks, withoutWebGL } from './check-page.mjs';
import { controlFaults } from './control-faults.mjs';
import { launchBrowser } from './launch-browser.mjs';
import { readControls } from './read-controls.mjs';
import { textFaults } from './text-faults.mjs';

const builtFileUrl = builtFileUrlFrom(process.argv[2]);

/** A size for each page layout. The narrow one is a 1366 by 768 window with the page zoomed to 200%. */
const FULL = { width: 1366, height: 768 };
const COMPACT = { width: 1280, height: 720 };
const NARROW = { width: 683, height: 384 };
const UPRIGHT = { width: 390, height: 844 };
/** The least width and height of a control for a mouse (WCAG 2.2, 2.5.8), and for a finger. The screenshot script checks the second in every state. */
const LEAST_TARGET_PX = 24;
const LEAST_TOUCH_TARGET_PX = 44;
/** The most presses of Tab it takes to reach anything on the page. */
const MOST_TABS = 90;
/** The text spacing a partner may set, which must cut no text (WCAG 2.1, 1.4.12). */
const TEXT_SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }';

const { check, failed } = createChecks();

const browser = await launchBrowser();
/** @type {string[]} */
const errors = [];

/**
 * Opens the built file in a window of its own, with a mouse for its pointer unless a touch screen is asked for.
 * @param {{ width: number, height: number }} size
 * @param {{ fragment?: string, reducedMotion?: 'reduce' | 'no-preference', webgl?: boolean, touch?: boolean }} [options]
 */
async function open(size, { fragment = '', reducedMotion = 'no-preference', webgl = true, touch = false } = {}) {
  const context = await browser.newContext({ viewport: size, reducedMotion, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  if (!webgl) await context.addInitScript(withoutWebGL);
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
  return { context, page };
}

/** Goes to a fragment in the open page, as a link would, and waits for the map to come to rest. */
async function goTo(/** @type {import('playwright').Page} */ page, /** @type {string} */ fragment) {
  await page.evaluate((hash) => {
    location.hash = hash;
  }, fragment);
  await atRest(page);
}

/** Presses keys one after another, and waits for the map to come to rest. */
async function press(/** @type {import('playwright').Page} */ page, /** @type {string[]} */ ...keys) {
  for (const key of keys) await page.keyboard.press(key);
  await atRest(page);
}

/**
 * What the page says of itself: where the map is, what the live region last said, and where the
 * keyboard focus is. The focus is lost where nothing holds it, or where what holds it is not on show.
 */
const read = (/** @type {import('playwright').Page} */ page) =>
  page.evaluate(() => {
    const card = document.querySelector('.detail-card');
    const strip = document.querySelector('.phase-strip');
    const rail = document.querySelector('.rail');
    const focused = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const shown = (/** @type {Element | null} */ element) => element !== null && element.checkVisibility({ visibilityProperty: true }) && !element.closest('[inert]');
    const panel = focused?.closest('.detail-card, .phase-strip, .breadcrumb, .key-list, .search, .lens, .needs, .filters, .outline, .rail-icons, .rail-foot, .rail');
    const live = document.querySelector('[aria-live="polite"]');
    return {
      layout: document.documentElement.dataset.layout ?? null,
      fragment: decodeURIComponent(location.hash.slice(1)),
      card: shown(card) ? (card?.querySelector('.card-name')?.textContent ?? null) : null,
      strip: shown(strip),
      railOpen: rail !== null && !rail.hasAttribute('data-collapsed'),
      said: live?.textContent ?? null,
      liveOnPage: shown(live),
      focusLost: !shown(focused),
      /** The panel that holds the focus, by its class: "detail-card", "outline", "rail-icons" and so on. */
      focusIn: panel?.classList[0] ?? null,
      focusOn: focused ? `${focused.tagName.toLowerCase()}${focused.classList[0] ? `.${focused.classList[0]}` : ''}` : null,
      focusName: (focused?.getAttribute('aria-label') ?? focused?.textContent ?? '').trim(),
      pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      /**
       * The map never scrolls as a page. Something that lies out of the window, such as words kept for assistive
       * technology at the foot of a card that scrolls, makes the page taller, and a row scrolled into view then pulls it along.
       */
      scrolled: window.scrollX !== 0 || window.scrollY !== 0 || document.documentElement.scrollHeight > window.innerHeight,
      keyList: document.querySelector('dialog')?.open ?? false,
      singleKeys: document.documentElement.dataset.singleKeys ?? 'on',
    };
  });

/**
 * Presses Tab until the focus is on something that matches a selector, as a partner with no mouse
 * would get there. Says whether it got there.
 */
async function tabTo(/** @type {import('playwright').Page} */ page, /** @type {string} */ selector, { back = false } = {}) {
  for (let presses = 0; presses < MOST_TABS; presses += 1) {
    if (await page.evaluate((wanted) => document.activeElement?.matches(wanted) ?? false, selector)) return true;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  return false;
}

/**
 * Run in the page: every piece of text on show, with its colour and the colour of the surface under
 * it. A translucent colour or surface is laid over what is under it first.
 */
function readText() {
  /** @typedef {[number, number, number, number]} Rgba */
  const parse = (/** @type {string} */ colour) => {
    const parts = /rgba?\(([^)]+)\)/.exec(colour)?.[1]?.split(/[,/ ]+/).filter(Boolean).map(Number) ?? [0, 0, 0, 0];
    return /** @type {Rgba} */ ([parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1]);
  };
  const over = (/** @type {Rgba} */ top, /** @type {Rgba} */ under) => {
    const blend = (/** @type {0 | 1 | 2} */ at) => top[at] * top[3] + under[at] * (1 - top[3]);
    return /** @type {Rgba} */ ([blend(0), blend(1), blend(2), 1]);
  };
  const opaque = (/** @type {Rgba} */ colour) => /** @type {[number, number, number]} */ ([colour[0], colour[1], colour[2]]);
  const surfaceOf = (/** @type {Element} */ element) => {
    /** @type {Rgba[]} */
    const layers = [];
    for (let at = /** @type {Element | null} */ (element); at; at = at.parentElement) {
      const fill = parse(getComputedStyle(at).backgroundColor);
      if (fill[3] > 0) layers.push(fill);
      if (fill[3] === 1) break;
    }
    return layers.reduceRight((under, layer) => over(layer, under), /** @type {Rgba} */ ([255, 255, 255, 1]));
  };
  /** @type {import('./text-faults.mjs').TextStyle[]} */
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!node.textContent?.trim() || !element || element.closest('script, style, .visually-hidden')) continue;
    if (!element.checkVisibility({ visibilityProperty: true })) continue;
    // Text that is on the page for assistive technology alone, such as the title while the rail stands as icons.
    if (element.getBoundingClientRect().width <= 1) continue;
    const style = getComputedStyle(element);
    const surface = surfaceOf(element);
    texts.push({
      name: `${element.tagName.toLowerCase()}${element.classList[0] ? `.${element.classList[0]}` : ''}, as in "${node.textContent.trim().slice(0, 24)}"`,
      colour: opaque(over(parse(style.color), surface)),
      surface: opaque(surface),
      sizePx: Number.parseFloat(style.fontSize),
      weight: Number(style.fontWeight),
      mono: /mono/i.test(style.fontFamily),
    });
  }
  // One entry for each kind of text: the same element, colour, surface and size.
  const kinds = new Map(texts.map((text) => [`${text.name.split(',')[0]} ${text.colour} ${text.surface} ${text.sizePx} ${text.weight}`, text]));
  return [...kinds.values()];
}

/**
 * Run in the page: every control and every named part on show that assistive technology would get
 * no name for. A name comes from `aria-labelledby`, `aria-label`, a field's label, or the text inside.
 */
function readNameless() {
  const nameOf = (/** @type {Element} */ element) => {
    const labelled = (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (labelled) return labelled;
    const label = element.getAttribute('aria-label')?.trim();
    if (label) return label;
    if (element instanceof HTMLInputElement) return [...(element.labels ?? [])].map((each) => each.textContent ?? '').join(' ').trim();
    return (element.textContent ?? '').trim();
  };
  const named =
    'button, a[href], input, [role="treeitem"], [role="option"], [role="tree"], [role="listbox"], [role="radiogroup"], [role="img"], nav, aside, dialog[open], .fallback-picture';
  return [...document.querySelectorAll(named)]
    .filter((element) => element.checkVisibility({ visibilityProperty: true }) && !element.closest('[inert]') && nameOf(element) === '')
    .map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.') || element.getAttribute('role') || '?'}`);
}

/** Checks the names, the text and the size of the controls of the state the page is in. */
async function measure(/** @type {import('playwright').Page} */ page, /** @type {string} */ state) {
  const nameless = await page.evaluate(readNameless);
  check(`${state}: every control and every named part has a name`, nameless.length === 0, nameless.join(', '));
  const faults = textFaults(await page.evaluate(readText));
  check(`${state}: all text meets the contrast contract and the text floor`, faults.length === 0, faults.join('; '));
  const small = controlFaults(await page.evaluate(readControls), LEAST_TARGET_PX);
  check(`${state}: every control is at least ${LEAST_TARGET_PX} by ${LEAST_TARGET_PX} pixels`, small.length === 0, small.join('; '));
}

/**
 * Run in the page: where the focus is, for the walk through the Tab order. `ring` says whether the
 * focus is drawn: on what holds it, on its row, or on the control around it.
 */
function readStop() {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement) || focused === document.body) return null;
  const drawn = (/** @type {Element | null} */ element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) >= 2;
  };
  const around = focused.closest('.segments, .phase-steps, .search-field, label');
  const rect = (focused.querySelector(':scope > .outline-row') ?? around ?? focused).getBoundingClientRect();
  // The panel the stop is in, or the part of the rail: a list in the rail scrolls, and its part stays where it is.
  const region = focused.closest('.rail-icons, .rail-close, .search, .lens, .needs, .filters, .outline, .rail-foot, .breadcrumb, .detail-card, .phase-strip');
  return {
    name: `${focused.tagName.toLowerCase()}${focused.classList[0] ? `.${focused.classList[0]}` : ''} "${(focused.getAttribute('aria-label') ?? focused.textContent ?? '').trim().slice(0, 32)}"`,
    region: region?.classList[0] ?? 'elsewhere',
    inRail: focused.closest('.rail') !== null,
    regionTop: Math.round(region?.getBoundingClientRect().top ?? 0),
    top: Math.round(rect.top),
    ring: drawn(focused) || drawn(focused.querySelector(':scope > .outline-row')) || drawn(around),
    inSight: rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth,
  };
}

/** Walks the Tab order from the top of the page until the focus leaves the page or comes round again. */
async function tabStops(/** @type {import('playwright').Page} */ page) {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  /** @type {NonNullable<Awaited<ReturnType<typeof readStop>>>[]} */
  const stops = [];
  for (let presses = 0; presses < MOST_TABS; presses += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(readStop);
    if (!stop || stops.some((seen) => seen.name === stop.name && seen.top === stop.top)) return { stops, ended: true };
    stops.push(stop);
  }
  return { stops, ended: false };
}

/** Whether a list of numbers never goes down. */
const neverFalls = (/** @type {number[]} */ values) => values.every((value, at) => at === 0 || value >= (values[at - 1] ?? value));

try {
  // The canvas, and the keyboard alone, in the full layout.
  console.log(`\nThe full layout, ${FULL.width} by ${FULL.height}: the canvas, and every task with the keyboard alone`);
  {
    const { context, page } = await open(FULL);

    const stage = await page.evaluate(() => {
      const canvas = document.getElementById('stage');
      const equivalent = document.getElementById(canvas?.getAttribute('aria-details') ?? '');
      return {
        role: canvas?.getAttribute('role') ?? null,
        label: canvas?.getAttribute('aria-label') ?? '',
        pointsToTree: equivalent?.querySelector('[role="tree"]') !== null && equivalent !== null,
        focusable: canvas !== null && (canvas.hasAttribute('tabindex') || canvas.querySelector('[tabindex]') !== null),
      };
    });
    check('the canvas is described to assistive technology as an image', stage.role === 'img' && stage.label.length > 40, stage.label);
    check('its description names the outline as the way to read it', /outline/i.test(stage.label));
    check('it points to the outline as its equivalent', stage.pointsToTree);
    check('the canvas is no stop of the Tab key: it takes no key', !stage.focusable);
    const total = await page.evaluate(() => Number(/of (\d+) tools/.exec(document.querySelector('.filters-count')?.textContent ?? '')?.[1] ?? Number.NaN));
    check('the page gives the number of tools', Number.isFinite(total) && total > 0, total);
    await measure(page, 'at rest');

    // Find a tool, and read its detail card.
    await press(page, '/');
    check('"/" goes to the search box', (await read(page)).focusOn === 'input.search-input');
    await page.keyboard.type('serena');
    const found = await page.evaluate(() => document.querySelector('.search [role="status"]')?.textContent ?? '');
    check('the search says how many results it found', /^Found \d+ tools?/.test(found), found);
    await measure(page, 'the search results');
    await press(page, 'Enter');
    const chosen = await read(page);
    check('Enter on a result selects the tool and opens its detail card', chosen.card === 'Serena' && /select=tool:serena/.test(chosen.fragment), chosen.fragment);
    check('the focus goes to the card, at its name', chosen.focusIn === 'detail-card' && chosen.focusOn === 'h2.card-name', chosen.focusOn);
    check('the selection is announced, with its detail card', /^Selected the tool Serena, in cluster 4A, .+\. Its detail card is open\.$/.test(chosen.said ?? ''), chosen.said);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const reading = await read(page);
    check('Tab goes on through the card', reading.focusIn === 'detail-card' && !reading.focusLost, reading.focusOn);
    check('the page has not scrolled, and nothing of the card lies out of the window to scroll it', !reading.scrolled);
    await measure(page, "a tool's detail card");

    // Close the card.
    await press(page, 'Escape');
    const closed = await read(page);
    check('Escape closes the detail card', closed.card === null && closed.fragment === 'cluster=4A', closed.fragment);
    check('the focus is not lost with the card: it goes to the outline', closed.focusIn === 'outline' && !closed.focusLost, closed.focusOn);
    check('the change is announced', closed.said === 'Nothing selected.', closed.said);

    // Each lens, with its key.
    await press(page, '2');
    const role = await read(page);
    check('"2" switches the role lens on', /lens=role/.test(role.fragment), role.fragment);
    check('the lens is announced with the number of tools in reach', /^Role lens on\. \d+ of \d+ tools in reach of the \w+\.$/.test(role.said ?? ''), role.said);
    await press(page, '3');
    const need = await read(page);
    check('"3" switches the need trace on, and goes to the need list', /lens=need/.test(need.fragment) && need.focusIn === 'needs', need.focusOn);
    check('the trace is announced, and asks for a need', need.said === 'Need trace on. Choose a need to trace.', need.said);
    await press(page, '4');
    const phase = await read(page);
    check('"4" switches the phase scrub on, and goes to the phase strip', /lens=phase&phase=P0/.test(phase.fragment) && phase.strip && phase.focusIn === 'phase-strip', phase.focusOn);
    check('the scrub is announced with its count', /^Phase scrub on\. \d+ of \d+ tools serving a need scheduled in P0\.$/.test(phase.said ?? ''), phase.said);
    await measure(page, 'the phase scrub');
    await press(page, 'ArrowRight');
    const stepped = await read(page);
    check('the right arrow steps the phase', /phase=P1/.test(stepped.fragment) && stepped.focusIn === 'phase-strip', stepped.fragment);
    check('the step is announced with its count', /^\d+ of \d+ tools serving a need scheduled in P1\.$/.test(stepped.said ?? ''), stepped.said);
    await press(page, '1');
    const off = await read(page);
    check('"1" switches the lens off', !/lens=/.test(off.fragment) && !off.strip, off.fragment);
    check('the focus is not lost with the phase strip: it goes to the lens switch', off.focusIn === 'lens' && !off.focusLost, off.focusOn);
    check('the change is announced with the count', off.said === `Lens off. All ${total} tools are in reach, with no filter chosen.`, off.said);

    // Each lens again from the lens switch, with Tab and the arrow keys: no single key is needed.
    await press(page, 'ArrowRight');
    const bySwitch = await read(page);
    check('the right arrow on the lens switch switches the role lens on', /lens=role/.test(bySwitch.fragment), bySwitch.fragment);
    check('Tab reaches the roles', await tabTo(page, '.segments-within input'));
    const firstRole = (await read(page)).fragment;
    await press(page, 'ArrowRight');
    const otherRole = await read(page);
    check('an arrow key picks another role', /lens=role&role=\w/.test(otherRole.fragment) && otherRole.fragment !== firstRole, otherRole.fragment);
    check('the role is announced with its count', /^\d+ of \d+ tools in reach of the \w+\.$/.test(otherRole.said ?? ''), otherRole.said);
    await measure(page, 'the role lens');
    check('Shift+Tab goes back to the lens switch', await tabTo(page, '.lens .segments:not(.segments-within) input', { back: true }));
    await press(page, 'ArrowRight');
    check('the next arrow switches the need trace on', /lens=need/.test((await read(page)).fragment));
    check('Tab reaches the need list', await tabTo(page, '.need-row'));
    await press(page, 'Enter');
    const traced = await read(page);
    check('Enter on a need traces it and opens its detail card', /select=N\d+&lens=need&need=N\d+/.test(traced.fragment) && traced.card !== null, traced.fragment);
    check('the trace is announced with what it found', /^Tracing need N\d+, .+\. \d+ tools? serves? it, \d+ as a best fit\. Its detail card is open\.$/.test(traced.said ?? ''), traced.said);
    check('the focus stays on the need', traced.focusIn === 'needs' && !traced.focusLost, traced.focusOn);
    await measure(page, 'a need trace');
    check('Shift+Tab goes back to the lens switch from the need list', await tabTo(page, '.lens .segments:not(.segments-within) input', { back: true }));
    await press(page, 'ArrowRight');
    check('the next arrow switches the phase scrub on', /lens=phase/.test((await read(page)).fragment));
    check('Tab reaches the phase strip', await tabTo(page, '.phase-step input'));
    // The scrub comes back at the phase it last showed, which was P1.
    await press(page, 'ArrowRight', 'ArrowRight');
    check('the arrow keys step the phases there', /phase=P3/.test((await read(page)).fragment), (await read(page)).fragment);
    check('Shift+Tab goes back to the lens switch from the phase strip', await tabTo(page, '.lens .segments:not(.segments-within) input', { back: true }));
    await press(page, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
    check('the arrow keys switch the lens off again', !/lens=/.test((await read(page)).fragment), (await read(page)).fragment);

    // Set and clear a filter.
    check('Tab reaches "Committed only"', await tabTo(page, '.filters-committed input'));
    await press(page, 'Space');
    const filtered = await read(page);
    check('Space sets the filter', /decision=/.test(filtered.fragment), filtered.fragment);
    check('the filter is announced with the number of tools that pass', /^\d+ of \d+ tools passing the filters\.$/.test(filtered.said ?? ''), filtered.said);
    check('Tab reaches a filter by its name', await tabTo(page, '.filter-toggle[aria-controls="filter-hosting"]'));
    await press(page, 'Enter', 'Tab', 'Space');
    const both = await read(page);
    check('Enter opens the filter, and Space chooses a value of it', /hosting=/.test(both.fragment), both.fragment);
    await measure(page, 'the filters, with a filter open');
    check('Shift+Tab reaches "Clear"', await tabTo(page, '.filters-clear', { back: true }));
    await press(page, 'Enter');
    const cleared = await read(page);
    check('Enter on "Clear" clears every filter', !/decision=|hosting=/.test(cleared.fragment), cleared.fragment);
    check('the focus is not lost with "Clear": it goes to "Committed only"', cleared.focusIn === 'filters' && !cleared.focusLost, cleared.focusOn);
    check('the change is announced', cleared.said === `All ${total} tools are in reach, with no filter chosen.`, cleared.said);

    // The outline: go to a tier, select a cluster and a tool, step out, and close the card with its button.
    await goTo(page, '');
    check('Tab reaches the outline', await tabTo(page, '[role="treeitem"]'));
    // The tree's one stop is the row it last stood on. Home goes to the first tier.
    await press(page, 'Home', 'Enter');
    const atTier = await read(page);
    check('Enter on a tier goes to it', /^tier=T\d$/.test(atTier.fragment), atTier.fragment);
    check('the place is announced', /^Tier T\d, .+\.$/.test(atTier.said ?? ''), atTier.said);
    await press(page, 'ArrowDown', 'Enter');
    const atCluster = await read(page);
    check('the down arrow and Enter select a cluster', /^cluster=(\w+)&select=\1$/.test(atCluster.fragment) && atCluster.card !== null, atCluster.fragment);
    check('the focus stays in the outline, and the card is announced', atCluster.focusIn === 'outline' && /^Selected cluster \w+, .+\. Its detail card is open\.$/.test(atCluster.said ?? ''), atCluster.said);
    await measure(page, "a cluster's detail card");
    await press(page, 'ArrowRight', 'Enter');
    const atTool = await read(page);
    check('the right arrow and Enter select a tool of it', /select=tool:/.test(atTool.fragment), atTool.fragment);
    check('the row and the card name the same tool', atTool.card !== null && atTool.focusName.startsWith(atTool.card), `${atTool.focusName} / ${atTool.card}`);
    const selectedRow = await page.evaluate(() => document.activeElement?.getAttribute('aria-selected'));
    check('the outline marks the row as selected', selectedRow === 'true', selectedRow);
    check('Tab reaches the button that closes the card', await tabTo(page, '.card-close'));
    await press(page, 'Enter');
    const byButton = await read(page);
    check('Enter on it closes the card', byButton.card === null);
    check('the focus is not lost with the card: it goes to the outline', byButton.focusIn === 'outline' && !byButton.focusLost, byButton.focusOn);
    await press(page, 'Escape');
    const outOnce = await read(page);
    check('Escape steps out to the tier', /^tier=T\d$/.test(outOnce.fragment), outOnce.fragment);
    await press(page, 'Escape');
    const outTwice = await read(page);
    check('Escape steps out to the stack', outTwice.fragment === '' && outTwice.said === 'The whole stack.', `${outTwice.fragment} / ${outTwice.said}`);
    check('the focus was never lost on the way out', !outOnce.focusLost && !outTwice.focusLost);

    // The list of keys.
    await press(page, '?');
    const keys = await read(page);
    check('"?" opens the list of keys, and the focus goes into it', keys.keyList && keys.focusIn === 'key-list', keys.focusOn);
    await measure(page, 'the list of keys');
    await press(page, 'Escape');
    const keysShut = await read(page);
    check('Escape closes it, and the focus comes back', !keysShut.keyList && !keysShut.focusLost && keysShut.fragment === '', keysShut.focusOn);
    await context.close();
  }

  // The Tab order, with every panel on the page.
  console.log('\nThe Tab order, with the detail card and the phase strip open');
  {
    const { context, page } = await open(FULL, { fragment: 'cluster=4A&select=tool:serena&lens=phase&phase=P2' });
    const { stops, ended } = await tabStops(page);
    // The rail counts as one panel, whichever of its parts holds the stop.
    const panels = stops.map((stop) => (stop.inRail ? 'rail' : stop.region));
    const order = ['rail', 'breadcrumb', 'detail-card', 'phase-strip'];
    check('Tab comes round, or leaves the page: the focus is trapped nowhere', ended, `${stops.length} stops`);
    check('Tab stops in every panel', order.every((panel) => panels.includes(panel)), [...new Set(panels)].join(', '));
    check('the order is the rail, the breadcrumb, the detail card, the phase strip', neverFalls(panels.map((panel) => order.indexOf(panel))), panels.join(' '));
    const inRail = stops.filter((stop) => stop.inRail);
    check(
      'the rail is gone through from its top to its foot, part by part',
      neverFalls(inRail.map((stop) => stop.regionTop)),
      inRail.map((stop) => `${stop.region} ${stop.regionTop}`).join(', '),
    );
    const noRing = stops.filter((stop) => !stop.ring).map((stop) => stop.name);
    check('the focus is drawn at every stop', noRing.length === 0, noRing.join(', '));
    const outOfSight = stops.filter((stop) => !stop.inSight).map((stop) => stop.name);
    check('every stop is in sight when the focus is on it', outOfSight.length === 0, outOfSight.join(', '));
    check('the page has not scrolled on the way, and has nothing to scroll to', !(await read(page)).scrolled);
    await measure(page, 'the phase scrub with a tool selected');
    await context.close();
  }

  // A part of the rail that folds while it holds the focus.
  console.log('\nA part of the rail that folds under the keyboard focus');
  {
    const { context, page } = await open(FULL);
    // A need is traced and the lens switched off again, so that "3" brings the trace back with its need.
    await press(page, '3');
    await press(page, 'Enter');
    await press(page, 'Escape');
    await press(page, '1');
    check('Tab reaches the outline', await tabTo(page, '[role="treeitem"]'));
    await press(page, '3');
    const folded = await read(page);
    check('"3" brings the trace back, and the outline folds under the focus', /lens=need&need=N\d+/.test(folded.fragment), folded.fragment);
    check("the focus is not lost with the rows: it goes to the outline's heading", !folded.focusLost && folded.focusOn === 'button.rail-fold', folded.focusOn);
    await press(page, '1');
    check('Tab reaches a filter', await tabTo(page, '.filter-toggle'));
    await press(page, '3');
    const filtersFolded = await read(page);
    check("the same holds for the filters: the focus goes to their heading", !filtersFolded.focusLost && filtersFolded.focusOn === 'button.rail-fold', filtersFolded.focusOn);
    await context.close();
  }

  // A touch screen: the chevron of an outline row is a control of its own there too.
  console.log('\nA touch screen for the main pointer');
  for (const [size, fragment, icon] of /** @type {const} */ ([
    [UPRIGHT, 'cluster=4A&select=tool:serena', true],
    [{ width: 1366, height: 1024 }, 'cluster=4A&select=tool:serena', false],
  ])) {
    const { context, page } = await open(size, { fragment, touch: true });
    if (icon) {
      await page.tap('.rail-icon[aria-label^="Outline"]');
      await atRest(page);
    }
    const small = controlFaults(await page.evaluate(readControls), LEAST_TOUCH_TARGET_PX);
    check(
      `${size.width} by ${size.height}, with the outline on show: every control is at least ${LEAST_TOUCH_TARGET_PX} by ${LEAST_TOUCH_TARGET_PX} pixels`,
      small.length === 0,
      small.join('; '),
    );
    await context.close();
  }

  // The page layouts in which the rail stands as icons.
  for (const [name, size, layout] of /** @type {const} */ ([
    ['The compact layout', COMPACT, 'compact'],
    ['The narrow layout: a 1366 by 768 window with the page zoomed to 200%', NARROW, 'narrow'],
    ['The upright layout', UPRIGHT, 'upright'],
  ])) {
    console.log(`\n${name}, ${size.width} by ${size.height}`);
    const { context, page } = await open(size);
    const start = await read(page);
    check(`the map opens in the ${layout} page layout`, start.layout === layout, start.layout);
    check('the page is no wider than the window', start.pageWidth <= size.width, start.pageWidth);
    check('the live region is on the page while the rail stands as icons', start.liveOnPage && !start.railOpen);
    const pointedTo = await page.evaluate(() => {
      const target = document.getElementById(document.getElementById('stage')?.getAttribute('aria-details') ?? '');
      return target?.checkVisibility() ? (target.getAttribute('aria-label') ?? '') : null;
    });
    check('the canvas points to the icon that opens the outline, which is on show', pointedTo !== null && pointedTo.startsWith('Outline'), pointedTo);
    await measure(page, 'at rest');
    await press(page, '2');
    const role = await read(page);
    check('a change of lens is announced with its count', /^Role lens on\. \d+ of \d+ tools in reach of the \w+\.$/.test(role.said ?? ''), role.said);
    await press(page, '1');

    // Find a tool through the outline, from its icon.
    check("Tab reaches the outline's icon", await tabTo(page, '.rail-icon[aria-label^="Outline"]'));
    await press(page, 'Enter');
    const opened = await read(page);
    check('Enter opens the outline, and the focus goes into it', opened.railOpen && opened.focusIn === 'outline', opened.focusOn);
    await measure(page, 'the outline, open over the canvas');
    await press(page, 'ArrowDown', 'Enter');
    const selected = await read(page);
    check('the arrow keys and Enter select a cluster', /^cluster=(\w+)&select=\1$/.test(selected.fragment) && selected.card !== null, selected.fragment);
    check('the selection is announced', /^Selected cluster \w+, .+\. Its detail card is open\.$/.test(selected.said ?? ''), selected.said);
    check('the focus is not lost', !selected.focusLost, selected.focusOn);
    check('Tab reaches the button that closes the card', await tabTo(page, '.card-close'));
    await measure(page, "a cluster's detail card");
    await press(page, 'Enter');
    const closed = await read(page);
    check('Enter on it closes the card, and the focus is not lost', closed.card === null && !closed.focusLost, closed.focusOn);

    // The phase strip opens and closes under the keyboard.
    await press(page, '4');
    const scrub = await read(page);
    check('"4" opens the phase strip and goes to it', scrub.strip && scrub.focusIn === 'phase-strip', scrub.focusOn);
    await measure(page, 'the phase scrub');
    await press(page, '1');
    const off = await read(page);
    check('"1" closes it, and the focus is not lost', !off.strip && !off.focusLost, off.focusOn);
    check('the page is still no wider than the window, and has not scrolled', off.pageWidth <= size.width && !off.scrolled, off.pageWidth);
    await context.close();
  }

  // Reduced motion: the fallback of ticket 14.
  console.log('\nWith reduced motion switched on');
  {
    const { context, page } = await open(FULL, { reducedMotion: 'reduce' });
    /** @type {string[]} */
    const moved = [];
    for (const key of ['4', 'ArrowRight', '1', '/', 's', 'e', 'r', 'e', 'n', 'a', 'Enter', 'Escape', 'Escape', 'Escape']) {
      await page.keyboard.press(key);
      // A frame later the page has heard of the key. Nothing may then be under way.
      const moving = await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => done((window.frameworkMap?.isMoving() ?? true) || document.getAnimations().length > 0))),
      );
      if (moving) moved.push(key);
    }
    check('no flight, fade or panel is under way after any key: every change is made at once', moved.length === 0, moved.join(' '));
    const transitions = await page.evaluate(
      () => [...document.querySelectorAll('body *')].filter((element) => getComputedStyle(element).transitionDuration !== '0s' || getComputedStyle(element).animationName !== 'none').length,
    );
    check('the stylesheet moves nothing either: no transition and no animation', transitions === 0, transitions);
    await context.close();
  }

  // Wider text spacing.
  console.log('\nWith the text spacing a partner may set');
  {
    const { context, page } = await open(FULL, { fragment: 'cluster=4A&select=tool:serena&hosting=Hub&lens=role&role=D' });
    await page.addStyleTag({ content: TEXT_SPACING });
    await press(page, '4');
    // The controls that cut what runs out of them, and the parts of them that hold a name.
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll('.segments, .segment, .phase-steps, .phase-step')]
        // The last letter of a line has its spacing after it, which may run 2 pixels out of the box and cuts nothing.
        .filter((element) => element.checkVisibility() && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2))
        .map((element) => `${element.className} "${(element.textContent ?? '').trim().slice(0, 20)}"`),
    );
    check('no name in the lens switch, the roles or the phase strip is cut', cut.length === 0, cut.join(', '));
    await context.close();
  }

  // The single keys can be switched off.
  console.log('\nThe switch for the single keys');
  {
    const { context, page } = await open(FULL);
    check('Tab reaches the "Keys" button', await tabTo(page, '.rail-keys'));
    await press(page, 'Enter');
    check('Enter opens the list of keys', (await read(page)).keyList);
    check('Tab reaches the switch', await tabTo(page, '.key-list-switch input'));
    await press(page, 'Space', 'Escape');
    const off = await read(page);
    check('Space switches the single keys off', off.singleKeys === 'off' && !off.keyList, off.singleKeys);
    const offered = () =>
      page.evaluate(() => ({
        named: document.querySelectorAll('[title*="(key "]').length,
        said: document.querySelectorAll('[aria-keyshortcuts]').length,
        shown: [...document.querySelectorAll('.search-key, .rail-keys kbd')].filter((hint) => hint.checkVisibility()).length,
      }));
    const whileOff = await offered();
    check('no control then offers a single key: not on hover, not to assistive technology, not on the page', whileOff.named + whileOff.said + whileOff.shown === 0, whileOff);
    await press(page, '2');
    await press(page, '/');
    await press(page, '?');
    const ignored = await read(page);
    check('"2", "/" and "?" then do nothing', ignored.fragment === '' && ignored.focusOn === 'button.rail-keys' && !ignored.keyList, `${ignored.fragment} ${ignored.focusOn}`);
    await goTo(page, 'tier=T3');
    await press(page, 'Escape');
    check('Escape still steps out', (await read(page)).fragment === '');
    await page.reload();
    await page.waitForSelector('html[data-ready="true"]', { state: 'attached' });
    await atRest(page);
    check('the switch is kept when the file is opened again', (await read(page)).singleKeys === 'off');
    check('the "Keys" button still opens the list', (await tabTo(page, '.rail-keys')) && (await press(page, 'Enter'), (await read(page)).keyList));
    check('Tab reaches the switch again', await tabTo(page, '.key-list-switch input'));
    await press(page, 'Space', 'Escape');
    await press(page, '2');
    const on = await read(page);
    check('Space switches the single keys on again', on.singleKeys === 'on' && /lens=role/.test(on.fragment), on.fragment);
    const whileOn = await offered();
    check('the controls offer their keys again', whileOn.named >= 5 && whileOn.said >= 5, whileOn);
    await context.close();
  }

  // The fallback page.
  console.log('\nThe fallback page, in a browser with no WebGL');
  {
    const { context, page } = await open(FULL, { webgl: false });
    const picture = await page.evaluate(() => {
      const figure = document.querySelector('.fallback-picture');
      return {
        fallback: document.documentElement.hasAttribute('data-fallback'),
        role: figure?.getAttribute('role') ?? null,
        label: figure?.getAttribute('aria-label') ?? '',
        names: [...document.querySelectorAll('.picture-name')].filter((name) => !name.closest('[role="img"], [aria-hidden="true"]')).length,
        drawingsHidden: [...document.querySelectorAll('.picture-drawing')].every((drawing) => drawing.getAttribute('aria-hidden') === 'true'),
        link: document.querySelector('.card-link')?.textContent ?? '',
      };
    });
    check('the page is the fallback page', picture.fallback);
    check('the picture is described, and is not one image that hides its text', picture.role === 'group' && picture.label.length > 0, picture.role);
    check("every tier's name is text that assistive technology reads", picture.names === 8, picture.names);
    check('the drawings of the plates are hidden from it', picture.drawingsHidden);
    check('the link to the tool matrix says that it opens in a new tab', /Open the tool matrix \(opens in a new tab\)/.test(picture.link), picture.link);
    await measure(page, 'the fallback page');
    await context.close();
  }

  check('the page logged no error', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

if (failed() > 0) {
  console.error(`\n${failed()} check(s) failed.`);
  process.exit(1);
}
console.log('\nEvery check passed.');
