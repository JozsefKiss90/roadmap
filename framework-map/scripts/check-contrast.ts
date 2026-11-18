/**
 * Build step: measures the map's contrast rows in the style guide, for the
 * light and the dark skin, and exits with 1 if any row falls short of the
 * contrast contract or is stated wrongly.
 *
 * Usage: npm run contrast [-- path/to/style-guide.md]
 * With no path it checks ../references/style-guide.md.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMapContrast, minimumText, ratioText } from './contrast.ts';

const guidePath = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('../../references/style-guide.md', import.meta.url));

let markdown: string;
try {
  markdown = readFileSync(guidePath, 'utf8');
} catch (error) {
  console.error(`Cannot read ${guidePath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const { rows, findings } = checkMapContrast(markdown);

for (const row of rows) {
  const colour = row.opacity === 1 ? row.colour : `${row.colour} @ ${row.opacity}`;
  console.log(
    `${row.skin.padEnd(5)} ${row.token.padEnd(20)} ${colour.padEnd(15)} on ${row.surface.padEnd(8)} ${row.use.padEnd(10)} ${ratioText(row.ratio).padStart(7)} (minimum ${minimumText(row.minimum)})`,
  );
}

if (findings.length > 0) {
  console.error(`${guidePath} failed the contrast check with ${findings.length} finding(s):`);
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exit(1);
}

console.log(`Checked ${guidePath}: ${rows.length} map contrast rows, no findings.`);
