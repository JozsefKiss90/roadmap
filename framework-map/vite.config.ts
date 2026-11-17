/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readGraph } from './src/data.ts';
import { layoutStack } from './src/layout.ts';
import type { Vocabulary } from './src/validate.ts';

const inToolDiscovery = (name: string): string =>
  fileURLToPath(new URL(`../tool-discovery/${name}`, import.meta.url));

/**
 * Runs the layout function when the map is built and serves its result as the
 * module `virtual:stack-layout` (ADR 0002). The page imports positions; it
 * never computes them, and they are never written into the graph JSON.
 */
function stackLayout(): Plugin {
  const publicId = 'virtual:stack-layout';
  // Rollup's convention for a module that is not a file: its id starts with a NUL character.
  const resolvedId = String.fromCharCode(0) + publicId;
  const graphPath = inToolDiscovery('tool-framework.graph.json');
  const vocabularyPath = inToolDiscovery('vocabulary.json');
  return {
    name: 'framework-map:stack-layout',
    resolveId: (id) => (id === publicId ? resolvedId : undefined),
    load(id) {
      if (id !== resolvedId) return undefined;
      this.addWatchFile(graphPath);
      this.addWatchFile(vocabularyPath);
      const vocabulary = JSON.parse(readFileSync(vocabularyPath, 'utf8')) as Vocabulary;
      const layout = layoutStack(readGraph(JSON.parse(readFileSync(graphPath, 'utf8')), vocabulary));
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(layout))});`;
    },
  };
}

// The build writes dist/framework-map.html with code, graph data, layout and
// fonts inlined (ADR 0003). scripts/publish.mjs checks that file and copies it
// to the repository root.
export default defineConfig({
  plugins: [stackLayout(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { input: 'framework-map.html' },
  },
  server: {
    // The graph JSON lives in ../tool-discovery.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
