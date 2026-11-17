/**
 * The named states the screenshot script opens. Each is the built file plus a
 * URL fragment. A ticket that adds something visible adds its state here.
 *
 * @typedef {object} ScreenshotState
 * @property {string} name Used in the screenshot's file name.
 * @property {string} fragment The URL fragment, without the leading "#".
 * @property {readonly (readonly ['press' | 'type', string])[]} [keys] What to do at the keyboard once the page is ready: a key to press, or text to type.
 */

/** @type {readonly ScreenshotState[]} */
export const states = [
  { name: 'stack-at-rest', fragment: '' },
  // T3 has the most clusters, and 1A the most tools: the two states with the most labels.
  { name: 'one-tier', fragment: 'tier=T3' },
  { name: 'one-cluster', fragment: 'cluster=1A' },
  // The detail card in its three forms. Serena has a repository, a note, needs and an overlap group.
  { name: 'tool-selected', fragment: 'cluster=4A&select=tool:serena' },
  // An internal skill, with its `implements` line; 1A is the widest list of names beside the card.
  { name: 'internal-skill-selected', fragment: 'cluster=1A&select=tool:ci-gate-add' },
  { name: 'cluster-selected', fragment: 'cluster=5B&select=5B' },
  { name: 'need-selected', fragment: 'cluster=5F&select=N01' },
  // The search, reached with "/": results in all three groups, and a word the framework lacks.
  { name: 'search-results', fragment: '', keys: [['press', '/'], ['type', 'semantic']] },
  { name: 'search-no-result', fragment: '', keys: [['press', '/'], ['type', 'zeppelin']] },
  // The outline by keyboard alone: Tab to the tree, open T7's first cluster and stand on its first tool.
  {
    name: 'outline-keyboard-focus',
    fragment: '',
    keys: [['press', 'Tab'], ['press', 'Tab'], ['press', 'ArrowDown'], ['press', 'ArrowRight'], ['press', 'ArrowRight']],
  },
  { name: 'key-list', fragment: 'cluster=4A&select=tool:serena', keys: [['press', '?']] },
];

/** The most labels a state may show at once. The spec asks for "no more than about 60". */
export const MOST_LABELS = 60;

/** @type {readonly { width: number, height: number }[]} */
export const viewports = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];
