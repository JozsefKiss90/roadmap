/**
 * Last step of the build: checks dist/framework-map.html and, only if it
 * passes, copies it to the repository root. A build that fails the checks
 * leaves the previous file at the root untouched.
 */
import { copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkBuiltFile } from './built-file.mjs';

const builtPath = fileURLToPath(new URL('../dist/framework-map.html', import.meta.url));
const publishedPath = fileURLToPath(new URL('../../framework-map.html', import.meta.url));
const graphPath = fileURLToPath(new URL('../../tool-discovery/tool-framework.graph.json', import.meta.url));

/** @type {{ meta: { title: string } }} */
const graph = JSON.parse(readFileSync(graphPath, 'utf8'));

const MAX_BYTES = 5 * 1024 * 1024;
const megabytes = (/** @type {number} */ bytes) => (bytes / (1024 * 1024)).toFixed(2);

const html = readFileSync(builtPath, 'utf8');
const faults = checkBuiltFile(html, {
  maxBytes: MAX_BYTES,
  // The graph's own title shows that the graph JSON was inlined, and the opening of the static
  // picture's markup that the picture was (see src/stack-picture.ts).
  mustContain: [graph.meta.title, '<div data-stack-picture>'],
  // Class names that Tweakpane puts in its stylesheet and its DOM.
  mustNotContain: ['tp-rotv', 'tp-dfwv'],
});

if (faults.length > 0) {
  console.error(`framework-map.html failed ${faults.length} check(s) and was not published:`);
  for (const fault of faults) console.error(`  - ${fault}`);
  process.exit(1);
}

copyFileSync(builtPath, publishedPath);
console.log(
  `Published ${publishedPath} (${megabytes(Buffer.byteLength(html, 'utf8'))} MB of ${megabytes(MAX_BYTES)} MB).`,
);
