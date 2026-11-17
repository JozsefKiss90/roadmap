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

const isInline = (/** @type {string} */ target) => target.startsWith('data:') || target.startsWith('#');

/**
 * @param {string} html
 * @param {RegExp} pattern A global pattern whose first group is the target.
 * @returns {string[]} Every target that points outside the file.
 */
function outsideTargets(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => (match[1] ?? '').trim()).filter((target) => !isInline(target));
}

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

  for (const target of outsideTargets(html, /<script\b[^>]*\bsrc\s*=\s*["']?([^"'\s>]+)/gi)) {
    faults.push(`A script is loaded from another file: ${target}`);
  }
  for (const target of outsideTargets(html, /<link\b[^>]*\bhref\s*=\s*["']?([^"'\s>]+)/gi)) {
    faults.push(`A link element loads another file: ${target}`);
  }
  for (const [, css = ''] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const target of outsideTargets(css, /url\(\s*["']?([^"')]+)/gi)) {
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
