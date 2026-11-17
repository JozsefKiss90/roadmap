/**
 * Build step: validates the graph JSON against the vocabulary file and exits
 * with 1 if it finds any fault, so a broken graph never reaches the built map.
 *
 * Usage: npm run validate [-- path/to/graph.json]
 * With no path it checks ../tool-discovery/tool-framework.graph.json.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVocabulary, validateGraph } from '../src/validate.ts';
import type { Vocabulary } from '../src/validate.ts';

const inToolDiscovery = (name: string): string =>
  fileURLToPath(new URL(`../../tool-discovery/${name}`, import.meta.url));

const graphPath = process.argv[2] ? resolve(process.argv[2]) : inToolDiscovery('tool-framework.graph.json');
const vocabularyPath = inToolDiscovery('vocabulary.json');

const vocabulary = JSON.parse(readFileSync(vocabularyPath, 'utf8')) as Vocabulary;
const graph: unknown = JSON.parse(readFileSync(graphPath, 'utf8'));

const faults = [...checkVocabulary(vocabulary), ...validateGraph(graph, vocabulary)];

if (faults.length > 0) {
  console.error(`${graphPath} failed validation with ${faults.length} fault(s):`);
  for (const fault of faults) console.error(`  - [${fault.fault}] ${fault.message}`);
  console.error(`Fix the data, or add the value to ${vocabularyPath} under a family.`);
  process.exit(1);
}

console.log(`Validated ${graphPath}: no faults.`);
