# 02: Scaffold the single-file build

**What to build:** A partner can double-click `framework-map.html` and see an empty page in the map's typefaces, with no network request. Behind it, the whole delivery path works end to end: TypeScript source, a Vite build with `vite-plugin-singlefile` that inlines code, the graph data and fonts into one file (ADR 0003), a unit test runner, and the Playwright screenshot script that later tickets use as their gate.

The page shows only the title for now. It embeds the current graph JSON so the inlining and the size budget are exercised from the start.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The map has its own source folder and package manifest, in TypeScript, with empty modules for data, layout, state, scene, labels, panels and search
- [ ] One build command writes a single `framework-map.html` to the repository root
- [ ] Opened from `file://` in current Chrome or Edge, the file renders its title in Instrument Serif and makes no network request
- [ ] Geist, Geist Mono and Instrument Serif are bundled through Fontsource
- [ ] The graph JSON is inlined in the built file, and the built file is under 5 MB
- [ ] The page exposes a "ready" signal once it has finished its first render
- [ ] Vitest runs and one trivial test passes
- [ ] A Playwright script opens a list of named states by URL fragment at 1366×768 and 1920×1080, waits for the "ready" signal, saves a screenshot of each, and fails on any console error; the list holds one state for now
- [ ] Tweakpane is wired so it loads only under the dev server and is absent from the built file
- [ ] The work is committed

## Comments
