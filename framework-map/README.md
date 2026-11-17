# framework-map

Source for the map: the interactive 3D presentation of the Hermes OS tool framework. The build produces one self-contained file, `framework-map.html`, at the repository root (ADR 0003). The spec is `.scratch/framework-map/spec.md`.

## Commands

Run these from this folder, after `npm install`.

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, validates the graph, checks the map's contrast rows, builds, checks the built file and copies it to `../framework-map.html` |
| `npm run validate` | Checks the graph JSON against the vocabulary file; add `-- path/to/graph.json` to check another file |
| `npm run contrast` | Measures the map's contrast rows in the style guide; add `-- path/to/style-guide.md` to check another file |
| `npm run generate` | Regenerates the graph JSON from the tool matrix CSV, then validates it; see `../tool-discovery/README.md` |
| `npm run screenshots` | Opens the built file in each named state and saves a screenshot to `../screenshots/` |
| `npm test` | Runs the unit tests, then the generator's tests in `../tool-discovery/` |
| `npm run typecheck` | Type-checks without building |
| `npm run dev` | Starts the dev server with the tuning panel |

## How the build stays one file

- `vite-plugin-singlefile` inlines the code, the styles and the fonts. The graph JSON in `../tool-discovery/` is imported as text, so it is inlined too.
- `scripts/publish.mjs` refuses to copy the built file to the repository root if it is over 5 MB, loads anything from another file, lacks the graph, or contains the tuning panel.
- `scripts/screenshots.mjs` opens the built file from `file://` and fails on a console error, an uncaught error, a missing "ready" signal, or any network request. It uses the installed Chrome or Edge.

## The graph validator

`npm run validate` checks `../tool-discovery/tool-framework.graph.json` and exits with 1 if it finds a fault. The build runs it first, so a graph with a fault never reaches the built file. Each fault is printed with its type and the id at fault.

| Fault | Meaning |
| --- | --- |
| `duplicate-id` | Two nodes share an id |
| `missing-node` | An edge points to an id that is not a node |
| `no-cluster` | A tool names no cluster, or names something that is not a cluster |
| `tier-mismatch` | A tool's tier differs from its cluster's tier |
| `unknown-value` | A kind, decision class, hosting, value stream or gate is not in the vocabulary file |
| `unserved-need` | No tool serves a need |
| `bad-phase` | A need's phase is not a list of phases or ranges within P0 to P4 |
| `count-mismatch` | A count in the metadata, or a cluster's tool count, differs from the graph |
| `vocabulary` | The vocabulary file lists one kind or gate value under two families |
| `malformed` | The file is not a graph, or a node or edge lacks its id, type, source or target |

The vocabulary file is `../tool-discovery/vocabulary.json`. Kind and gate values are listed under the family the map groups them into. To allow a new value, add it there under a family.

## The contrast check

`npm run contrast` reads `../references/style-guide.md` and exits with 1 if it has a finding. It measures every row of the guide's "Map contrast rows" table in the light skin. The build runs it, and `npm test` runs the same check on the real guide.

A finding is one of these:

- a row below the minimum for its use;
- a Minimum or Measured cell that disagrees with the measurement;
- a colour or surface that is not a semantic role, or a use the contract does not know;
- a colour that the token's row in "Map tokens" does not name;
- a table whose columns are not the ones the check reads;
- a token in the "Map tokens" table with no contrast row, or a row for a token that table lacks.

To add a map token, add it to "Map tokens", give it a row for each surface it sits on, and run the command. The command prints the measured ratio to write in the row.

The rows of the guide's "Semantic roles" table are not checked here. The diagram-design plugin's `verify-contrast.py` checks those.

## The "ready" signal

The page sets `data-ready="true"` on the `<html>` element once its first render is done. The screenshot script waits for it.

## Adding a screenshot state

Add a name and a URL fragment to `scripts/screenshot-states.mjs`.
