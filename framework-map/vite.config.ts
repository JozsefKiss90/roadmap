/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build writes dist/framework-map.html with code, graph data and fonts
// inlined (ADR 0003). scripts/publish.mjs checks that file and copies it to
// the repository root.
export default defineConfig({
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
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
