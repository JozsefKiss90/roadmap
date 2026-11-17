/**
 * Checks on the built HTML file, as text. They catch a build that is no longer
 * one self-contained file (ADR 0003) before it is copied to the repository
 * root. The screenshot script is the check on what the page does when opened.
 */

/**
 * @typedef {object} BuiltFileRules
 * @property {number} maxBytes Largest allowed size of the file, in bytes.
 * @property {readonly string[]} mustContain Text that has to be in the file.
 * @property {readonly string[]} mustNotContain Text that must not be in the file.
 */

const isInline = (/** @type {string} */ target) => /^data:/i.test(target) || target.startsWith('#');

/**
 * @param {string} text
 * @param {RegExp} pattern A global pattern; the target is its first group that matched.
 * @returns {string[]} Every target that points outside the file.
 */
function outsideTargets(text, pattern) {
  return [...text.matchAll(pattern)]
    .map((match) => (match.slice(1).find((group) => group !== undefined) ?? '').trim())
    .filter((target) => !isInline(target));
}

// "src" and "href" are matched as whole attribute names, so "data-src" does not count.
const SRC_ATTRIBUTE = /<[a-z][^>]*?(?<![\w-])src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const LINK_HREF = /<link\b[^>]*?(?<![\w-])href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const INLINE_SCRIPT = /(<script\b[^>]*>)[\s\S]*?<\/script>/gi;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
const CSS_IMPORT = /@import\s+(?:"([^"]*)"|'([^']*)')/gi;

/**
 * @param {string} html The built file.
 * @param {BuiltFileRules} rules
 * @returns {string[]} One message per fault; empty when the file passes.
 */
export function checkBuiltFile(html, rules) {
  const faults = [];

  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > rules.maxBytes) {
    faults.push(`The file is ${bytes} bytes, over the budget of ${rules.maxBytes} bytes.`);
  }

  // Inline scripts are emptied first: code may hold markup as text, and only
  // real elements load anything.
  const markup = html.replace(INLINE_SCRIPT, '$1</script>');

  for (const target of outsideTargets(markup, SRC_ATTRIBUTE)) {
    faults.push(`An element loads another file: ${target}`);
  }
  for (const target of outsideTargets(markup, LINK_HREF)) {
    faults.push(`A link element loads another file: ${target}`);
  }
  for (const [, css = ''] of markup.matchAll(STYLE_BLOCK)) {
    for (const target of [...outsideTargets(css, CSS_URL), ...outsideTargets(css, CSS_IMPORT)]) {
      faults.push(`A style block loads another file: ${target}`);
    }
  }

  for (const text of rules.mustNotContain) {
    if (html.includes(text)) faults.push(`The file contains "${text}", which must not be in it.`);
  }
  for (const text of rules.mustContain) {
    if (!html.includes(text)) faults.push(`The file does not contain "${text}".`);
  }

  return faults;
}
