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
- `scripts/screenshots.mjs` opens the built file from `file://` and fails on a console error, an uncaught error, a missing "ready" signal, or any network request. It also fails if a state shows more than 60 labels, two labels that overlap, or a label that runs out of the window or under the detail card. It uses the installed Chrome or Edge.

## How the stack is drawn

| Module | What it does |
| --- | --- |
| `src/data.ts` | Validates the graph with the validator below and indexes it. It throws `GraphRejected` for a graph with any fault |
| `src/inlined-graph.ts` | Hands `data.ts` the graph and the vocabulary file that are inlined in the page |
| `src/display.ts` | The display table: groups the ten decision classes into the four steps a mark shows, and gives each kind family its icon and each gate family its badge |
| `src/layout.ts` | The pure layout function. It returns a position and size for every plate, cell and mark |
| `src/tokens.ts` | The map tokens the scene draws with, copied from the style guide. A test fails if they disagree with the guide |
| `src/camera.ts` | The arithmetic for where the camera stands at each distance |
| `src/state.ts` | The state store: the distance, the focused tier or cluster, and the selection, in step with the URL fragment |
| `src/scene.ts` | Draws plates, cells and marks with 3d-force-graph. Flies the camera between distances, fades the plates above the focused one, and takes clicks. Draws the hover ring and the selected mark |
| `src/mark-material.ts` | How a mark is drawn: a square with a fill, an outline or both, from a mark token |
| `src/selection-drawing.ts` | The outline of a selected cluster's cell, and the `implements` lines with their far ends |
| `src/pick.ts` | Which plate, cell and mark lie under the pointer |
| `src/hover-label.ts` | The label beside the pointer that names the mark under it |
| `src/labels.ts` | The names in the scene, by distance: tiers and counts, then clusters, then tools |
| `src/label-layout.ts` | The arithmetic for where cluster and tool names stand |
| `src/icons.ts` | Draws a kind family's Lucide icon for the scene |
| `src/panels.ts` | Mounts the breadcrumb and the detail card, and takes the Escape key |
| `src/detail-card.ts` | The detail card, in its tool, cluster and need forms |

**The layout runs in the build, not in the page** (ADR 0002). A plugin in `vite.config.ts` runs `layoutStack` on the graph and serves the result as the module `virtual:stack-layout`. The page imports positions and never computes them, and nothing is written into the graph JSON. The layout's spacings are `STACK_METRICS` in `src/layout.ts`; after changing one, rebuild or reload the dev server.

**How the layout works.** Every cell uses one mark grid, four marks deep, so a cell's area follows its tool count and a plate's length follows its tier's. Plates share their left edge and their depth. A cell fills a column at a time, from its committed tools to its guarded ones and by name within a step.

**The camera** orbits the stack's vertical axis. Its tilt and zoom limits, its field of view and the margins around the stack are in `src/constants.ts`, and the dev server's tuning panel changes them live.

## The three distances

The map has three distances: stack, tier and cluster. `src/state.ts` holds the distance and the focused tier or cluster. The scene, the labels and the panels read the store and write to it. They never call each other.

| Distance | What is on screen | How to get there |
| --- | --- | --- |
| Stack | Every plate, with each tier's name and tool count | Open the map, press Escape from a tier, or click "Stack" in the breadcrumb |
| Tier | The focused plate, with its cluster names above it. The plates above it are faded | Click a plate or a tier name |
| Cluster | The focused cell, with its tool names above it. Each name has its kind icon and, where the tool is gated, a gate badge | Click a cell of the focused plate, or a cluster name |

- **Nothing moves but the camera.** A change of distance flies the camera and changes opacity. No plate, cell or mark changes place.
- **From the stack, a click anywhere on a plate goes to its tier.** A cell takes clicks once its plate is focused.
- **Escape steps out one distance.** The breadcrumb at the top centre shows the stack, the tier and the cluster, and each part is a button.
- **The URL fragment names the focus and the selection.** `#tier=T3` opens at the tier distance and `#cluster=1A` at the cluster distance. `select=` adds the selection, as in `#cluster=4A&select=tool:serena`. An id the graph lacks opens the stack at rest.
- **Close in, the camera stays near the front.** At the tier and cluster distances it turns 30 degrees to either side at most, because the names stand above the plate.
- **Labels keep their size on screen.** Each is anchored to a point of the stack and offset from it in pixels. `src/label-layout.ts` works out the offsets, and `src/scene.ts` leaves room for them when it places the camera.
- **The page reports its labels.** `window.frameworkMap.labels()` returns one rectangle for each label on screen. The screenshot script reads it.

## Selection and the detail card

A partner can select a tool, a cluster or a need. The detail card on the right describes the selection, and is absent when nothing is selected. `src/state.ts` holds the selection. The scene and the detail card both read it there, and neither calls the other.

| To select | Do this |
| --- | --- |
| A tool | Click its mark on the focused plate, its name in the list above a focused cell, or its row in the detail card |
| A cluster | Click its cell on the focused plate, between the marks, or click its name |
| A need | Click its row in a tool's detail card |

- **Selecting a tool or a cluster goes to that cluster.** Selecting a need leaves the map where it is.
- **Going somewhere else drops the selection.** The breadcrumb, a click on another plate and a step out all close the detail card.
- **Escape closes the detail card first.** The next Escape steps out one distance.
- **Hover works at every distance.** The mark under the pointer gets a ring, and a label gives the tool's name and cluster. At the cluster distance the label gives the name alone, because the breadcrumb names the cluster. From the stack, a click still goes to the tier.
- **The selected mark takes the accent fill.** It no longer shows its decision class, so the detail card states it, with a square in the mark's own form. The square is drawn from the same mark token as the mark.
- **The selection shows in three places in the scene.** The selected tool's mark is filled, its name in the list above the cell is in the accent colour, and a selected cluster's cell is outlined.
- **`implements` lines.** A selected tool has a line to each cluster it implements. A selected cluster has a line to each tool that implements it. The detail card lists the same clusters and tools.
- **Both ends of a line are in the picture.** The far end is outlined: a cell for a selected tool, a mark for a selected cluster. The camera stands back far enough to frame it, and the plates between the two ends fade.
- **The list of tool names stays in view.** It is centred on its cell, and moves across where that would take it out of the window or under the detail card.
- **The detail card slides in over 200 ms** when it opens, and not at all with reduced motion on. It is a CSS animation; ticket 14 decides whether anime.js takes it over.
- **The camera keeps clear of the detail card.** At the tier and cluster distances the focused plate or cell is centred in the room left of the card.
- **A field with no value is left out.** A tool with no repository shows no repository, stars, last commit or licence.
- **The link to the tool matrix** leads to `Hermes OS tool matrix.xlsx` beside the map's file. Its address is `toolMatrixHref` in `src/constants.ts`.

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
