# framework-map

Source for the map: the interactive 3D presentation of the Hermes OS tool framework. The build produces one self-contained file, `framework-map.html`, at the repository root (ADR 0003). The spec is `.scratch/framework-map/spec.md`.

## Commands

Run these from this folder, after `npm install`.

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, builds, checks the built file and copies it to `../framework-map.html` |
| `npm run screenshots` | Opens the built file in each named state and saves a screenshot to `../screenshots/` |
| `npm test` | Runs the unit tests |
| `npm run typecheck` | Type-checks without building |
| `npm run dev` | Starts the dev server with the tuning panel |

## How the build stays one file

- `vite-plugin-singlefile` inlines the code, the styles and the fonts. The graph JSON in `../tool-discovery/` is imported as text, so it is inlined too.
- `scripts/publish.mjs` refuses to copy the built file to the repository root if it is over 5 MB, loads anything from another file, lacks the graph, or contains the tuning panel.
- `scripts/screenshots.mjs` opens the built file from `file://` and fails on a console error, an uncaught error, a missing "ready" signal, or any network request. It uses the installed Chrome or Edge.

## The "ready" signal

The page sets `data-ready="true"` on the `<html>` element and fires a `framework-map:ready` event on `window` once its first render is done. The screenshot script waits for it.

## Adding a screenshot state

Add a name and a URL fragment to `scripts/screenshot-states.mjs`.
