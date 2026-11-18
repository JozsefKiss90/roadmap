/**
 * The named states the screenshot script opens. Each is the built file plus a
 * URL fragment. A ticket that adds something visible adds its state here.
 *
 * @typedef {object} Viewport
 * @property {number} width
 * @property {number} height
 * @property {boolean} [touch] `true` opens the viewport as a phone or a tablet: a touch screen for its main pointer, at two device pixels to one.
 *
 * @typedef {object} ScreenshotState
 * @property {string} name Used in the screenshot's file name.
 * @property {string} fragment The URL fragment, without the leading "#".
 * @property {readonly (readonly ['press' | 'type' | 'tap', string])[]} [steps] What to do once the page is ready: a key to press, text to type, or the selector of something to tap, or to click where the viewport has no touch screen.
 * @property {readonly Viewport[]} [at] The viewports the state is opened at, where it is not all of them.
 * @property {false} [webgl] `false` opens the state in a browser that gives the page no WebGL.
 */

/**
 * Where the page layout is upright, the bar across the top and the detail card at the bottom: two
 * phones held upright, the smaller at the smallest width the map is drawn at, and a tablet held upright.
 */
const UPRIGHT = [
  { width: 360, height: 640, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 768, height: 1024, touch: true },
];
/** Where the page layout is narrow, the bar across the top and the detail card at the right: a phone on its side. */
const NARROW = [{ width: 844, height: 390, touch: true }];
/** The two page layouts with the bar. */
const BAR = [...UPRIGHT, ...NARROW];
/**
 * Where the page layout is compact, the rail a column of icons: a tablet on its side, at the least
 * width of the layout, and the smallest laptop size.
 */
const TABLET_ON_ITS_SIDE = { width: 1024, height: 768, touch: true };
/** A small window on a laptop, between the least width of the compact layout and the smallest laptop size. */
const SMALL_WINDOW = { width: 1152, height: 720 };
const SMALLEST_LAPTOP = { width: 1280, height: 720 };
const COMPACT = [TABLET_ON_ITS_SIDE, SMALL_WINDOW, SMALLEST_LAPTOP];
/** The sizes the map is designed for, where the page layout is full. */
const FULL = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
/** A large tablet on its side: the full layout, with a touch screen for its main pointer. */
const LARGE_TABLET = { width: 1366, height: 1024, touch: true };

/** @type {readonly Viewport[]} */
export const viewports = [...BAR, ...COMPACT, ...FULL, LARGE_TABLET];

/** The icon of a part of the rail, by the start of its name. */
const icon = (/** @type {string} */ name) => `.rail-icon[aria-label^="${name}"]`;

/** @type {readonly ScreenshotState[]} */
export const states = [
  { name: 'stack-at-rest', fragment: '' },
  // T3 has the most clusters, and 1A the most tools: the two states with the most labels.
  { name: 'one-tier', fragment: 'tier=T3' },
  { name: 'one-cluster', fragment: 'cluster=1A' },
  // The detail card's tool and cluster forms; the need form is with the need trace below. Serena has a repository, a note, needs and an overlap group.
  { name: 'tool-selected', fragment: 'cluster=4A&select=tool:serena' },
  // An internal skill, with its `implements` line; 1A is the widest list of names beside the card.
  { name: 'internal-skill-selected', fragment: 'cluster=1A&select=tool:ci-gate-add' },
  { name: 'cluster-selected', fragment: 'cluster=5B&select=5B' },
  // The search, reached with "/": results in all three groups, and a word the framework lacks.
  { name: 'search-results', fragment: '', steps: [['press', '/'], ['type', 'semantic']] },
  { name: 'search-no-result', fragment: '', steps: [['press', '/'], ['type', 'zeppelin']] },
  // The outline by keyboard alone: Tab to the tree, open T7's first cluster and stand on its first tool. The tree
  // is the thirteenth stop: after the search box, the lens switch, the filters' heading, "Committed only" and the
  // seven filters, and the outline's own heading.
  {
    name: 'outline-keyboard-focus',
    fragment: '',
    at: FULL,
    steps: [...Array.from({ length: 13 }, () => /** @type {const} */ (['press', 'Tab'])), ['press', 'ArrowDown'], ['press', 'ArrowRight'], ['press', 'ArrowRight']],
  },
  // The same in the compact layout, where the rail stands as icons: Tab to the outline's icon, the fifth
  // in the column, and Enter opens the rail over the canvas and goes to the tree.
  {
    name: 'rail-open-by-keyboard',
    fragment: '',
    at: COMPACT,
    steps: [
      ['press', 'Tab'], ['press', 'Tab'], ['press', 'Tab'], ['press', 'Tab'], ['press', 'Tab'],
      ['press', 'Enter'], ['press', 'ArrowDown'], ['press', 'ArrowRight'], ['press', 'ArrowRight'],
    ],
  },
  { name: 'key-list', fragment: 'cluster=4A&select=tool:serena', steps: [['press', '?']] },
  // Filters: "or" within the roles and "and" with the hosting, across the whole stack; then "committed only" close in.
  { name: 'filtered', fragment: 'used=D&used=M&hosting=Hub' },
  { name: 'filtered-cluster', fragment: 'cluster=4A&decision=Core+v1&decision=Core+later&decision=Build' },
  // The role lens: the Designer's reach across the whole stack; then close in, with "committed only" on top.
  // 4G is in the Designer's reach and its neighbours are not, and "committed only" leaves 11 of its 16 tools.
  { name: 'designer-role-lens', fragment: 'lens=role&role=D' },
  {
    name: 'role-lens-filtered-cluster',
    fragment: 'cluster=4G&lens=role&role=D&decision=Core+v1&decision=Core+later&decision=Build',
  },
  // The need trace. N15 has the widest trace: 15 tools on five tiers, seven of them best fits. Then the
  // trace with no need chosen, as key 3 leaves it. Then a traced tool selected: at the stack, where the
  // whole trace stays in the picture, and close in, with the way back to its need.
  { name: 'one-need-trace', fragment: 'select=N15&lens=need&need=N15' },
  { name: 'need-trace-unchosen', fragment: '', steps: [['press', '3']] },
  { name: 'need-trace-tool-selected-stack', fragment: 'select=tool:pr-agent&lens=need&need=N01' },
  { name: 'need-trace-tool-selected', fragment: 'cluster=5F&select=tool:pr-agent&lens=need&need=N01' },
  // The phase scrub. P2 has ten needs and 92 tools. Then P3, the widest phase, reached with the keyboard: key 4
  // switches the scrub on and goes to the strip, and three presses step it to the right. Switching it on opens
  // the strip and flies the camera clear of it, and the script waits for both. Then a tool
  // of the phase selected at the stack, where the strip, the legend and the card share the bottom of the
  // window; and a tier under the scrub.
  { name: 'phase-p2', fragment: 'lens=phase&phase=P2' },
  {
    name: 'phase-p3-by-keyboard',
    fragment: '',
    steps: [['press', '4'], ['press', 'ArrowRight'], ['press', 'ArrowRight'], ['press', 'ArrowRight']],
  },
  { name: 'phase-tool-selected-stack', fragment: 'select=tool:plannotator&lens=phase&phase=P2' },
  { name: 'phase-p2-tier', fragment: 'tier=T3&lens=phase&phase=P2' },
  // Under the bar a part of the rail opens on its own, from its icon: the filters with one chosen, the
  // outline at a selected tool, and the lens switch with the need list. Then the legend, which opens on
  // request there, with every state it names: a need traced, a filter chosen and a tool selected.
  { name: 'bar-filters', fragment: 'hosting=Hub', at: BAR, steps: [['tap', icon('Filters')]] },
  { name: 'bar-outline', fragment: 'cluster=4A&select=tool:serena', at: BAR, steps: [['tap', icon('Outline')]] },
  { name: 'bar-needs', fragment: 'lens=need&need=N15', at: BAR, steps: [['tap', icon('Needs')]] },
  {
    name: 'bar-legend',
    fragment: 'select=tool:pr-agent&lens=need&need=N01&hosting=Hub',
    at: BAR,
    steps: [['tap', icon('Legend')]],
  },
  // A small cluster under the bar, whose list of tool names has room in a phone held upright.
  { name: 'bar-small-cluster', fragment: 'cluster=7A', at: BAR },
  // The edge. A browser with no WebGL gets the static picture of the stack; a fragment changes nothing there.
  { name: 'no-webgl', fragment: 'cluster=4A&select=tool:serena', webgl: false },
];

/** The most labels a state may show at once. The spec asks for "no more than about 60". */
export const MOST_LABELS = 60;
