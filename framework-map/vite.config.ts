/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { DEV_BUILD, NO_COMMIT, buildIdOf } from './src/build-stamp.ts';
import { readGraph } from './src/data.ts';
import { layoutStack } from './src/layout.ts';
import { stackPicture } from './src/stack-picture.ts';
import type { Vocabulary } from './src/validate.ts';

const inToolDiscovery = (name: string): string =>
  fileURLToPath(new URL(`../tool-discovery/${name}`, import.meta.url));

/**
 * Runs the layout function when the map is built and serves its result as the
 * module `virtual:stack-layout` (ADR 0002). The page imports positions; it
 * never computes them, and they are never written into the graph JSON.
 *
 * The static picture of the stack, for a browser with no WebGL, is drawn from
 * the same layout and served as `virtual:stack-picture`: markup, as text.
 */
function stackModules(): Plugin {
  const layoutId = 'virtual:stack-layout';
  const pictureId = 'virtual:stack-picture';
  // Rollup's convention for a module that is not a file: its id starts with a NUL character.
  const resolved = (id: string): string => String.fromCharCode(0) + id;
  const graphPath = inToolDiscovery('tool-framework.graph.json');
  const vocabularyPath = inToolDiscovery('vocabulary.json');
  return {
    name: 'framework-map:stack-layout',
    resolveId: (id) => (id === layoutId || id === pictureId ? resolved(id) : undefined),
    load(id) {
      if (id !== resolved(layoutId) && id !== resolved(pictureId)) return undefined;
      this.addWatchFile(graphPath);
      this.addWatchFile(vocabularyPath);
      const vocabulary = JSON.parse(readFileSync(vocabularyPath, 'utf8')) as Vocabulary;
      const index = readGraph(JSON.parse(readFileSync(graphPath, 'utf8')), vocabulary);
      const layout = layoutStack(index);
      return id === resolved(pictureId)
        ? `export default ${JSON.stringify(stackPicture(layout, index))};`
        : `export default JSON.parse(${JSON.stringify(JSON.stringify(layout))});`;
    },
  };
}

/**
 * The build identifier for the build stamp: the short commit, marked if the
 * map's sources or its data hold changes that commit does not. A build outside
 * a git checkout still succeeds, and says that its commit is not known.
 */
function readBuildId(): string {
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const changed = git('status', '--porcelain', '--', '.', '../tool-discovery') !== '';
    return buildIdOf(git('rev-parse', '--short', 'HEAD'), changed);
  } catch {
    return buildIdOf(null, false);
  }
}

// The build writes dist/framework-map.html with code, graph data, layout and
// fonts inlined (ADR 0003). scripts/publish.mjs checks that file and copies it
// to the repository root.
export default defineConfig(({ command }) => {
  // The dev server and the tests build nothing, so they have no commit to name.
  const buildId = command === 'build' ? readBuildId() : DEV_BUILD;
  if (command === 'build') {
    console.log(buildId === NO_COMMIT ? 'Build identifier: none, because git gave no commit.' : `Build identifier: ${buildId}`);
  }
  return {
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [stackModules(), viteSingleFile({ removeViteModuleLoader: true })],
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
  };
});
