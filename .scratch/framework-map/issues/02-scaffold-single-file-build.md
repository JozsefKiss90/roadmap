# 02: Scaffold the single-file build

**What to build:** A partner can double-click `framework-map.html` and see an empty page in the map's typefaces, with no network request. Behind it, the whole delivery path works end to end: TypeScript source, a Vite build with `vite-plugin-singlefile` that inlines code, the graph data and fonts into one file (ADR 0003), a unit test runner, and the Playwright screenshot script that later tickets use as their gate.

The page shows only the title for now. It embeds the current graph JSON so the inlining and the size budget are exercised from the start.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] The map has its own source folder and package manifest, in TypeScript, with empty modules for data, layout, state, scene, labels, panels and search
- [x] One build command writes a single `framework-map.html` to the repository root
- [x] Opened from `file://` in current Chrome or Edge, the file renders its title in Instrument Serif and makes no network request
- [x] Geist, Geist Mono and Instrument Serif are bundled through Fontsource
- [x] The graph JSON is inlined in the built file, and the built file is under 5 MB
- [x] The page exposes a "ready" signal once it has finished its first render
- [x] Vitest runs and one trivial test passes
- [x] A Playwright script opens a list of named states by URL fragment at 1366×768 and 1920×1080, waits for the "ready" signal, saves a screenshot of each, and fails on any console error; the list holds one state for now
- [x] Tweakpane is wired so it loads only under the dev server and is absent from the built file
- [x] The work is committed

## Comments

### 2026-11-17: done

The source is in `framework-map/`. `npm run build` there writes `framework-map.html` at the repository root: 0.85 MB of the 5 MB budget, of which the graph JSON is 0.73 MB. `framework-map/README.md` lists the commands.

What was checked, and how:

| Criterion | Evidence |
| --- | --- |
| Renders the title in Instrument Serif from `file://`, no network request | Opened in headless Chrome and Edge: Instrument Serif reported as loaded, and the only request was the file itself |
| Fonts bundled through Fontsource | Six woff2 files inlined as data URIs: Instrument Serif 400, Geist and Geist Mono (variable weight), each in Latin and Latin Extended |
| Graph inlined, under 5 MB | Checked on every build by `scripts/publish.mjs` |
| "Ready" signal | `data-ready="true"` on `<html>`, plus a `framework-map:ready` event |
| Vitest | 7 tests pass, on the built-file checks |
| Screenshot script | 1 state at 2 viewports, saved to `screenshots/`; a page with a console error and an outside request made it exit 1 |
| Tweakpane dev only | Mounted under the dev server; the build fails if its class names are in the built file |

Decisions made here that later tickets inherit:

- **The build goes to `framework-map/dist/` first.** `scripts/publish.mjs` copies it to the repository root only if it passes the checks, so a failed build leaves the last good file in place.
- **The built `framework-map.html` is not tracked by git.** It is ignored, as is `dist/`. A build stamp taken from the commit (ticket 15) could never match a file committed in that same commit. Ticket 18 links to the file from the roadmap page, so it should confirm or reverse this.
- **The graph JSON is imported as text and parsed at start-up.** Typing it is left to ticket 03.
- **Font faces are declared in `src/fonts.css`, pointing at Fontsource's files.** Fontsource's own stylesheets would also inline Cyrillic, Vietnamese and woff fallbacks. Only upright faces are included; italic Instrument Serif is not, until something uses it. troika-three-text loads fonts by its own route, so ticket 06 has to feed it these same files.
- **The modules are single files** (`src/data.ts`, `src/layout.ts` and so on), each holding only its one-line purpose.
- **The screenshot script fails on any network request**, in addition to console errors. It uses the installed Chrome, then Edge, then Playwright's own Chromium.
- **Colour tokens in `src/styles.css` are copied from the style guide by hand** (`paper`, `ink`). Ticket 05 decides how the map reads tokens.
- **Versions are newer than the spec assumed:** Vite 8 (Rolldown), Vitest 5, TypeScript 7. Nothing needed a workaround. Tweakpane 4 needs `@tweakpane/core` installed for its types.

The tdd skill was not called: this ticket has no test seam of its own (data, layout and state are empty), so the tests were written first by hand for the one piece of logic, the built-file checks.
