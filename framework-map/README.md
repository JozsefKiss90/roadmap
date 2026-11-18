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
| `npm run screenshots` | Opens the built file in each named state at 1280×720, 1366×768 and 1920×1080, with reduced motion off and on, and saves a screenshot to `../screenshots/` |
| `npm test` | Runs the unit tests, then the generator's tests in `../tool-discovery/` |
| `npm run typecheck` | Type-checks without building |
| `npm run dev` | Starts the dev server with the tuning panel |

## How the build stays one file

- `vite-plugin-singlefile` inlines the code, the styles and the fonts. The graph JSON in `../tool-discovery/` is imported as text, so it is inlined too.
- `scripts/publish.mjs` refuses to copy the built file to the repository root if it is over 5 MB, loads anything from another file, lacks the graph or the static picture of the stack, or contains the tuning panel.
- `scripts/screenshots.mjs` opens the built file from `file://` and fails on a console error, an uncaught error, a missing "ready" signal, or any network request. It opens each state with the system's reduced-motion setting off and then on, and fails if a state does not come to rest, or if anything is under way with reduced motion on. It also fails if a state shows more than 60 labels, two labels that overlap, or a label that runs out of the window, under the rail or under the detail card; and if two panels overlap or a panel runs out of the window. It uses the installed Chrome or Edge.

## How the stack is drawn

| Module | What it does |
| --- | --- |
| `src/data.ts` | Validates the graph with the validator below and indexes it. It throws `GraphRejected` for a graph with any fault |
| `src/inlined-graph.ts` | Hands `data.ts` the graph and the vocabulary file that are inlined in the page |
| `src/display.ts` | The display table: groups the ten decision classes into the four steps a mark shows, names the steps and the classes of "committed only", and gives each kind family its icon and each gate family its badge |
| `src/layout.ts` | The pure layout function. It returns a position and size for every plate, cell and mark |
| `src/tokens.ts` | The map tokens the scene draws with, copied from the style guide. A test fails if they disagree with the guide |
| `src/camera.ts` | The arithmetic for where the camera stands at each distance |
| `src/state.ts` | The state store: the distance, the focused tier or cluster, the selection, the filters and the lens, in step with the URL fragment. It also says which tools a lens leaves in reach, and which a need trace traces |
| `src/scene.ts` | Draws plates, cells and marks with 3d-force-graph. Flies the camera between distances, fades the plates above the focused one, and takes clicks. Draws the hover ring, the selected and traced marks and the faded marks |
| `src/mark-material.ts` | How a mark is drawn: a square with a fill, an outline or both, from a mark token, in the faded state or not |
| `src/selection-drawing.ts` | The outline of a selected cluster's cell, and the `implements` lines with their far ends |
| `src/trace-drawing.ts` | What a need trace adds to its marks: the home cell's outline, the lines to the traced tools, the best-fit rings and the selected tool's ring |
| `src/pick.ts` | Which plate, cell and mark lie under the pointer |
| `src/hover-label.ts` | The label beside the pointer that names the mark under it |
| `src/labels.ts` | The names in the scene, by distance: tiers and counts, then clusters, then tools |
| `src/label-layout.ts` | The arithmetic for where cluster and tool names stand |
| `src/icons.ts` | Draws a kind family's Lucide icon for the scene |
| `src/panels.ts` | Mounts the rail, the breadcrumb, the detail card and the list of keys, and takes the keys that work anywhere |
| `src/detail-card.ts` | The detail card, in its tool, cluster and need forms |
| `src/outline.ts` | The outline: the tree of tiers, clusters and tools in the rail |
| `src/lens-panel.ts` | The lens switch in the rail, with the roles of the role lens and the number of tools in reach |
| `src/need-list.ts` | The need list in the rail: the 33 needs under their phases, while the need trace is on, and the needs of one phase under the phase scrub |
| `src/phase-strip.ts` | The phase strip at the bottom of the map: the five steps of the phase scrub, each with its counts |
| `src/rail-fold.ts` | Folds the filters and the outline to their headings while the need list is on show, and lets a heading open or fold its part |
| `src/filter-panel.ts` | The seven filters in the rail, with the count, "committed only" and "clear" |
| `src/legend.ts` | The legend of the four decision-class steps, with the faded, traced and best-fit states while they are on show |
| `src/search.ts` | The search index over tool names and capabilities, cluster names and need names |
| `src/search-box.ts` | The search field and the list of what it finds |
| `src/key-list.ts` | The list of keys that `?` opens |
| `src/announcer.ts` | Tells assistive technology what is now selected, or where the map has gone |
| `src/dom.ts` | The helpers the panels build their elements with |

**The layout runs in the build, not in the page** (ADR 0002). A plugin in `vite.config.ts` runs `layoutStack` on the graph and serves the result as the module `virtual:stack-layout`. The page imports positions and never computes them, and nothing is written into the graph JSON. The layout's spacings are `STACK_METRICS` in `src/layout.ts`; after changing one, rebuild or reload the dev server.

**How the layout works.** Every cell uses one mark grid, four marks deep, so a cell's area follows its tool count and a plate's length follows its tier's. Plates share their left edge and their depth. A cell fills a column at a time, from its committed tools to its guarded ones and by name within a step.

**The camera** orbits the stack's vertical axis. Its tilt and zoom limits, its field of view and the margins around the stack are in `src/constants.ts`, and the dev server's tuning panel changes them live.

## The three distances

The map has three distances: stack, tier and cluster. `src/state.ts` holds the distance and the focused tier or cluster. The scene, the labels and the panels read the store and write to it. They never call each other.

| Distance | What is on screen | How to get there |
| --- | --- | --- |
| Stack | Every plate, with each tier's name and tool count | Open the map, press Escape from a tier, or click "Stack" in the breadcrumb |
| Tier | The focused plate, with its cluster names above it. The plates above it are faded | Click a plate or a tier name, or choose a tier in the outline |
| Cluster | The focused cell, with its tool names above it. Each name has its kind icon and, where the tool is gated, a gate badge | Click a cell of the focused plate, or a cluster name, or choose a cluster in the outline |

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
| A tool | Click its mark on the focused plate, its name in the list above a focused cell, or its row in the detail card. Or choose it in the outline or the search |
| A cluster | Click its cell on the focused plate, between the marks, or click its name. Or choose it in the outline or the search |
| A need | Choose it in the need list, click its row in a tool's detail card, or choose it in the search |

- **Selecting a tool or a cluster goes to that cluster.** Selecting a need starts its need trace, at the stack distance. A traced tool that is selected at the stack distance leaves the map there.
- **A need's detail card opens at the stack distance.** The whole stack then stands left of the card. In a narrow window the plates come too close for the tier names, which are left out; each tier keeps its count, which begins with its code.
- **Going somewhere else drops the selection.** The breadcrumb, a click on another plate and a step out all close the detail card.
- **Escape closes the detail card first.** The next Escape steps out one distance.
- **Hover works at every distance.** The mark under the pointer gets a ring, and a label gives the tool's name and cluster. At the cluster distance the label gives the name alone, because the breadcrumb names the cluster. From the stack, a click still goes to the tier.
- **The selected mark takes the accent fill.** It no longer shows its decision class, so the detail card states it, with a square in the mark's own form. The square is drawn from the same mark token as the mark.
- **The selection shows in three places in the scene.** The selected tool's mark is filled, its name in the list above the cell is in the accent colour, and a selected cluster's cell is outlined.
- **`implements` lines.** A selected tool has a line to each cluster it implements. A selected cluster has a line to each tool that implements it. The detail card lists the same clusters and tools.
- **Both ends of a line are in the picture.** The far end is outlined: a cell for a selected tool, a mark for a selected cluster. The camera stands back far enough to frame it, and the plates between the two ends fade.
- **The list of tool names stays in view.** It is centred on its cell, and moves across where that would take it out of the window or under the detail card.
- **The detail card fades in and out over the panel duration.** See "Motion and depth blur".
- **The camera keeps clear of the detail card.** At the tier and cluster distances the focused plate or cell is centred in the room left of the card.
- **A field with no value is left out.** A tool with no repository shows no repository, stars, last commit or licence.
- **The link to the tool matrix** leads to `Hermes OS tool matrix.xlsx` beside the map's file. Its address is `toolMatrixHref` in `src/constants.ts`.

## The rail: outline, search and keyboard

The rail is the 240-pixel column down the left. It holds the title, the search box, the lens switch, the filters, the outline and the build stamp, and the need list while the need trace or the phase scrub is on. Below 1366 pixels it stands as a column of icons; see "Window sizes, the fallback page and the build stamp". The headings "Filters" and "Outline" are buttons that fold their part of the rail to the heading, or open it. A partner can do everything the canvas does from the rail and the detail card, with the keyboard alone.

**The outline** is a tree of the 8 tiers, 55 clusters and 752 tools. Tiers start open and clusters closed. A cluster's tool rows are made when it is first opened.

- **Choosing a row goes there.** A tier row goes to the tier. A cluster or tool row selects it, which flies to it and opens its detail card.
- **The outline follows the map.** Selecting on the canvas, in the detail card or by a link opens the rows above the selected row, marks it and scrolls to it. With nothing selected, the outline scrolls to the focused tier or cluster and marks its row as the place. A focused cluster's row is opened.
- **It is a tree to assistive technology.** Each row gives its name and its tool count, or its decision step for a tool.
- **Tool rows are in the order of the cell's grid**, as the names above a focused cell are.

**The search** uses MiniSearch (`src/search.ts`). It reads tool names and capabilities, cluster names and need names.

- **A word matches from its first letters, and with a small typo**: one wrong letter in five. A match on a name ranks above a match on a capability.
- **Every word of the query must match**, so a second word narrows the results.
- **Results are grouped as tools, clusters and needs.** A group lists its best 20 tools or 8 clusters or needs, and its heading gives the number found.
- **Choosing a result selects it** and puts the keyboard focus on the detail card's name.

**The keys.** `?` shows these in the page.

| Where | Key | What it does |
| --- | --- | --- |
| Anywhere | `/` | Goes to the search box |
| Anywhere | `?` | Shows the list of keys |
| Anywhere | `1` | Switches the lens off |
| Anywhere | `2` | Switches the role lens on |
| Anywhere | `3` | Switches the need trace on |
| Anywhere | `4` | Switches the phase scrub on, and goes to the phase strip |
| Phase strip | Left, Right | Steps to the phase before or after |
| Anywhere | Escape | Closes the detail card, then steps out one distance |
| Anywhere | Tab | Goes to the next control |
| Outline | Up, Down | Goes to the row above or below |
| Outline | Right | Opens a row, or goes to its first row |
| Outline | Left | Closes a row, or goes to the row it stands under |
| Outline | Home, End | Goes to the first or the last row |
| Outline | Enter or Space | Chooses the row |
| Search box | Up, Down | Goes through the results |
| Search box | Enter | Chooses the result |
| Search box | Escape | Clears the search |

- **Focus is always shown.** One rule in `src/styles.css` gives whatever holds the keyboard focus the guide's `map-focus-outline`.
- **Focus is never lost.** When Escape closes a detail card that holds the focus, the focus goes to the outline, at the row for where the map is.
- **Changes are announced.** A live region says what is now selected, or where the map has gone when nothing is selected. The search says how many results it found.
- **The camera keeps clear of the rail**, as it does of the detail card. `railPx` in `src/constants.ts` is the rail's width.
- **A long tool name is cut short with an ellipsis** in the list above a cell, where the list would not fit between the rail and the open detail card. The outline, the hover label and the detail card give the name in full.

## The role lens

The lens switch stands in the rail under the search box. It offers no lens, the role lens, the need trace and the phase scrub. One lens is on at a time, and `src/state.ts` holds it.

- **The role lens brings forward the tools one role uses.** A partner chooses the Architect, the Designer or the Analyst. The tools that role uses keep their form at full strength, in all eight tiers. Every other tool fades in place, as a filtered-out tool does.
- **It means "used by" only.** A tool the role operates but does not use is faded. "Operated by" is a filter.
- **A shared tool looks like the role's other tools.** The detail card's "Used by" line lists every role that uses it.
- **The number of tools in reach** stands beside "Lens", as "269 tools in reach" for the Designer. The count at the head of the filters is the live region that announces a change of lens or role.
- **Each tier's count is of its tools in reach** while the lens is on, as "T3 · 87 of 154 in reach" on the canvas. A tier with no tool in reach has its name in the colour of a tag. The counts in the outline's tier and cluster rows follow.
- **The filters apply on top of the lens.** A tool is at full strength when it is in reach and passes the filters. The count at the head of the filters gives those tools. The number in reach and the tiers' counts do not change with the filters.
- **The one filled segment is the lens that is on.** "None" and the chosen role are shown by a ring.
- **`1` switches the lens off and `2` switches the role lens on.** If `1` closes the row of roles while it holds the focus, the focus goes to the lens switch. The role lens comes back with the role it last showed, and starts with the Architect.
- **The URL fragment holds the lens and its role**, as `#lens=role&role=D`. The roles' codes are A, D and M. `lens=role` alone gives the first role. A role the graph lacks gives no lens.
- **The lens holds** wherever the map goes and whatever is selected.
- **The change is a fade.** The marks change form in place over the fade duration. See "Motion and depth blur".

## The need trace

The need trace shows one of the 33 needs and the tools that serve it. Needs are not objects in space: a partner picks one from the need list in the rail. `src/state.ts` holds the lens and its need, and `src/trace-drawing.ts` draws what the trace adds to the marks.

- **`3`, or "Need" in the lens switch, switches the need trace on.** The place and a selected tool stay, as under the other lenses. The need list then stands in the rail under the lens switch, with the needs under their phases, P0 to P4. A need that spans several phases is listed under each of them, and each of its rows ends with the phases it spans, as "P3-P4". The filters and the outline fold to their headings, so the list has the rail's height. They open again when the trace is switched off, and a click on a heading opens or folds its part at any time.
- **Until a need is chosen, no mark changes.** Every tool stays at full strength. A line under the breadcrumb says that the trace is on and asks for a need, and the legend names the traced mark and the best-fit ring. When `3` leaves no need chosen, the keyboard focus goes to the need list.
- **Choosing a need traces it.** The tools that serve it take the selected fill, and its best-fit tools also take a ring. The need's home cell is outlined, and a line runs from it to each traced tool outside it. Every other tool fades in place.
- **A traced tool of the home cluster has no line.** It stands inside the outline.
- **Each line leaves the home cell at a point of its own.** A line to a tool on the same plate leaves the nearer side of the cell, level with the tool. A line to another plate leaves the back edge for a higher plate and the front edge for a lower one, as near under or over the tool as the edge reaches.
- **A best-fit ring never reaches a neighbouring mark.** At the stack distance in a small window the marks are a few pixels wide. The ring then keeps to the space between two marks and its line thins, to no less than 1px.
- **The map goes to the stack distance** when a need is chosen, and the detail card shows the need: its verdict, phase, lead role, approach, gap and best-fit tools, and then the other tools that serve it. The whole stack stands left of the card, so every traced tool is in the picture.
- **A selected need is always the traced need.** Choosing a need in a tool's detail card or in the search starts its trace. Switching the lens off, or to the role lens, closes the need's card.
- **A click on a traced mark selects its tool**, from any distance, and the trace stays on. A traced mark the filters have faded takes clicks as any other mark does. The tool's detail card names the traced need at its head, as "Tracing N15 · …". One click there goes back to the need.
- **A traced tool selected at the stack distance leaves the map there**, so the whole trace stays in the picture beside the tool's card. That holds for a click on its mark and for its row in the need's card, the outline or the search. From closer in, selecting a tool goes to its cluster, as it does without a trace. The fragment is then `#select=tool:…&lens=need&need=N01`, with no cluster.
- **The selection is drawn in `ink` while a need is traced**, because the selected fill then means "traced". The selected tool's mark keeps the form the trace gives it and takes an `ink` ring, and a selected cluster's cell takes an `ink` outline, which sets it apart from the home cell. The legend names the ring "Selected".
- **A tool selected at the stack distance is closed with its trace.** Switching the lens off, or to the role lens or another need, closes its card, as it closes a need's card.
- **Escape closes the detail card and leaves the trace on.** The need stays chosen in the need list, and a click on it opens its card again.
- **The number of traced tools** stands beside "Lens", as "15 tools in reach". Each tier's count reads "T1 · 11 of 119 in reach", as under the role lens.
- **The filters apply on top of the trace.** A traced tool the filters leave out is faded, and has no line and no ring.
- **The legend names the traced mark and the best-fit ring** while the need trace is on, and the selection's ring while a tool or a cluster is selected under a traced need. Under the phase scrub it names the traced mark, and the selection's ring in the same way.
- **The need trace comes back with the need it last showed**, as the role lens does with its role. It comes back where the map is, with the need's card closed; the need's row in the need list opens it.
- **The URL fragment holds the lens and its need**, as `#lens=need&need=N15`. With the need's card open it also has `select=N15`. `lens=need` alone is the trace with no need chosen. A need the graph lacks gives no lens.
- **The change is a fade.** The marks change form in place over the fade duration. See "Motion and depth blur".

## The phase scrub

The phase scrub steps through the roadmap's phases, P0 to P4, and shows what each one calls for: the needs scheduled in it and the tools that serve them. `src/state.ts` holds the lens and its phase, and `src/phase-strip.ts` is the strip that steps it.

- **`4`, or "Phase" in the lens switch, switches the phase scrub on.** The place and a selected tool stay, as under the other lenses. It starts at P0, and comes back at the phase it last showed. `4` also puts the keyboard focus on the phase strip.
- **The phase strip stands at the bottom of the map, above the legend**, only while the phase scrub is on. It has five steps. Each gives its phase and the number of needs scheduled in it and of tools that serve them, as "10 needs · 92 tools" for P2. The counts are of the whole phase, whatever the filters.
- **The left and right arrow keys step the phase** while the strip has the focus, and so do the up and down ones: the steps are radio buttons. From P4 the right arrow goes to P0. A click on a step goes to it.
- **The strip never advances on its own.** It has no timer and no play control.
- **A step shows its own phase only.** The tools that serve a need scheduled in the phase take the selected fill, as traced tools do, and every other tool fades in place. A tool that serves no need is faded in every phase.
- **A need that spans phases is in each of them.** `P2-P3` is in P2 and P3, `P0-P4` in all five, and `P1, P3` in P1 and P3 but not in P2.
- **There are no lines, no best-fit rings and no home cell.** Those belong to one need, and the scrub shows many.
- **The need list holds the needs of the phase.** It stands in the rail as under the need trace, cut down to the one phase, and the filters and the outline fold to their headings. Choosing a need opens its need trace: the lens changes to the need trace and the strip goes. `4` comes back to the phase.
- **A click on a mark of the phase selects its tool**, from any distance. Selected at the stack distance, the tool leaves the map there, so the whole phase stays in the picture beside its card. Stepping to another phase closes that card. The selection is drawn with the `ink` ring, as under a traced need, and the legend names it.
- **The picture keeps clear of the strip.** The stack, a tier or a cluster stands a little higher while the phase scrub is on, so switching it on or off moves the camera once. Stepping the phase moves nothing.
- **The number of tools of the phase** stands beside "Lens", as "92 tools in reach", and each tier's count reads "T5 · 32 of 86 in reach". The filters apply on top.
- **The URL fragment holds the lens and its phase**, as `#lens=phase&phase=P2`. `lens=phase` alone is P0. A phase the roadmap lacks gives no lens.
- **A step is a fade.** The marks change form in place over the phase-step duration. See "Motion and depth blur".

## Filters and the legend

Seven filters stand in the rail between the search box and the outline: decision class, kind, used by, operated by, hosting, value stream and gate. A filter opens under its name and lists its values, each with the number of tools that have it. `src/state.ts` holds what is chosen.

- **Values of one filter combine as "or", and filters combine as "and".** Designer and Analyst under "Used by", with Hub under "Hosting", leaves the Hub tools that either role uses.
- **A tool the filters leave out fades and stays in place.** Its mark keeps its form and takes the guide's `map-faded`. Its row in the outline is dimmed, and so is its name in the list above a focused cell. It can still be hovered, clicked and selected. A selected mark keeps the selected fill.
- **A cluster or tier row of the outline is dimmed** when the filters leave none of its tools in.
- **The count** at the head of the filters gives the tools that pass, as "276 of 752 tools". While a lens is on, it gives the tools that are in reach and pass, and says whose reach. It is a live region, so a change is announced.
- **"Committed only"** chooses the decision classes Core v1, Core later and Build, which is 327 tools. It is off when the map opens. `COMMITTED_ONLY` in `src/display.ts` lists them. They are not the legend's "Committed" step, which is Core v1, Adapter and Skill / rule.
- **"Clear"** clears every filter. It is there only while a filter is on.
- **The numbers beside the values do not change.** Each is the number of all tools with that value, whatever else is chosen.
- **Kind and gate are filtered by family.** The families and their order come from `../tool-discovery/vocabulary.json`. Decision classes are listed from the committed step to the guarded one.
- **The URL fragment holds the filters**, one part for each chosen value: `#used=D&used=M&hosting=Hub`. The names are `decision`, `kind`, `used`, `operated`, `hosting`, `stream` and `gate`. Roles and value streams are given by their codes. A value a filter does not list is dropped.
- **The filters hold** wherever the map goes and whatever is selected.
- **The change is a fade.** The marks change form in place over the fade duration. See "Motion and depth blur".

**The legend** at the bottom left of the canvas shows the four decision-class steps with their names. Its squares are drawn from the same mark tokens as the marks. While a lens or a filter is on, it also shows a faded square. It is named "Out of reach" for a lens, "Filtered out" for the filters, and "Out of reach or filtered out" for both. While a need is traced, it shows "Traced" and "Best fit" as well. Beside an open detail card the legend keeps left of it, on two rows if it must. The stack at rest keeps clear of it: `insetBottomPx` in `src/constants.ts` is its room.

## Motion and depth blur

Every change on the map takes one of four durations. They are the style guide's "Map motion" table, and they are settled in `src/constants.ts`. `src/motion.ts` hands them out and runs the fades.

| What changes | Duration | Constant |
|---|---|---|
| A camera flight: between distances, to a selection, or to frame a need trace | 700 ms | `flightMs` |
| A change of lens or filters, and the fading of a plate | 250 ms | `fadeMs` |
| The detail card, the phase strip, or a part of the rail opening or closing | 200 ms | `panelMs` |
| A step from one phase to another | 300 ms | `phaseStepMs` |

- **The renderer flies the camera.** anime.js runs everything else, and it changes opacity only: the opacity of a plate or a panel, and the mix between two forms of a mark.
- **Nothing changes position but the camera.** A mark that changes form is drawn as a mix of the form it had and the form it takes, on the same square. A panel fades and does not slide.
- **A new need trace fades in with its marks.** Its lines, rings and home-cell outline take the fade duration. A change of filters or of selection under the same need leaves them as they are.
- **A change that starts during another finishes the first at once.** The marks take the form the first change gave them, and fade from there.
- **A panel that closes keeps its content while it fades**, and takes no click and no focus. It leaves the page when the fade ends, so the legend and the phase strip take its room then.
- **A part of the rail fades in and leaves at once.** That holds for the need list, the row of roles, and the filters and the outline when they unfold. A part that closes gives its room to the part that opens, so the two cannot be on the page together.
- **With the system's reduced-motion setting on, every duration is zero.** The camera cuts, and every fade is made at once. The setting is read at each change, so it holds without a reload.
- **Nothing moves while the partner does nothing.** No timer and no loop starts a change.
- **The page says whether it is moving.** `window.frameworkMap.isMoving()` is true while a flight, a fade or a panel is under way. The screenshot script waits for it to be false.

**Depth blur.** At the tier and cluster distances the plates under the focused one are blurred a little: the more, the further under it they lie. `src/depth-blur.ts` draws it.

- **The focused plate is never blurred.** The blur follows the plates, not the depth buffer. Each plate under the focused one is blurred as a whole, and only where it is in the picture. Every name stands on or above the focused plate, so every name stays sharp.
- **A plate that holds the far end of an `implements` line is not blurred**, so the outlined end stays sharp.
- **There is no blur at the stack distance**, and it fades in and out with the plates.
- **There is no blur while a need is traced.** The trace's lines cross the plates under the focused one, and a blurred line is too pale to follow.
- **`depthBlur` in `src/constants.ts` is the one switch.** Set to `false`, no plate is blurred and the picture is drawn as the renderer draws it. It is the first thing to switch off where frames run slow.
- **`depthBlurPx` is the widest spread**, in pixels on screen, and `depthBlurFullAt` is how far under the focused plate the blur reaches it, in layout units.
- **There is no glow and no vignette.** The blur is the map's only postprocessing. Antialiasing is the renderer's own and is always on.
- **The tuning panel has a "Motion" and a "Depth blur" folder.** A value settled there is copied into `src/constants.ts` by hand.

## Window sizes, the fallback page and the build stamp

**Three page layouts, by the window's width.** `src/page-layout.ts` decides which, and names it on the `<html>` element as `data-layout`. The widths are `compactBelowPx` and `narrowBelowPx` in `src/constants.ts`.

| Layout | Window width | What a partner gets |
| --- | --- | --- |
| Full | 1366 pixels and wider | The rail stands open down the left |
| Compact | 1024 to 1365 pixels | The rail stands as a 56-pixel column of icons, and the canvas has the rest |
| Narrow | Below 1024 pixels | A short message in place of the map, which asks for a wider window |

1280×720 is the smallest supported size. The compact layout also serves windows down to 1024 pixels, which are not supported and are not checked.

- **The picture is fitted to the room beside the icons.** The scene and the labels ask `railPxAt` for the rail's width at the window's width, so the picture and the panels cannot disagree. The stack at rest takes the room the rail gives up.
- **An icon opens the rail over the canvas** and goes to its part: the search box, the lens switch, the need list, the filters or the outline. The need list's icon is there only while the list is. The icon at the foot opens the list of keys.
- **An icon shows that its part is at work.** While a lens is on, or a filter is chosen, its icon is `ink` on `paper-2`, and its name ends in "on".
- **The canvas beside the open rail is dimmed**, as the page is behind the list of keys.
- **The open rail closes** with the button beside the title, with a press on the page outside it, or when the keyboard focus leaves it. The list of keys leaves it open. Escape keeps its own meaning and does not close it.
- **`/` and `3` open the rail**, because they go to the search box and the need list. When a detail card or the phase strip closes while it holds the focus, the icon of the part takes the focus, and the rail stays as icons.
- **The detail card lies over the canvas at every size**, and the picture keeps clear of it. With the rail as icons, 1280 pixels leave the picture more room beside an open card than 1366 pixels do with the rail open.
- **Under the narrow message the map keeps running**, out of sight, so it is right the moment the window is widened. The keys that work anywhere do nothing there.

**The fallback page.** `src/fallback.ts` asks the browser for WebGL before any scene is made. Without it the page shows the title, a short explanation, a link to the tool matrix, the static picture of the stack, the four decision-class steps and the build stamp. There is no console error, and a URL fragment changes nothing.

- **The static picture is drawn by the build.** `src/stack-picture.ts` is a pure function of the layout. `vite.config.ts` runs it and inlines its SVG markup as the module `virtual:stack-picture`, as it does the layout itself (ADR 0002). The picture adds about 0.07 MB to the built file.
- **It shows the stack at rest**: each plate with its cells and marks, each mark in the form of its decision-class step, and each tier's count and name. A mark's outline has the width its mark token gives, and is drawn inside the mark. It takes its colours from the map's tokens in `src/styles.css`.
- **It is never scaled.** It is 1,166 pixels wide, and the page scrolls where the window is smaller, so its names keep to the text floor.

**The build stamp** is at the foot of the rail and of the fallback page: the data date over the build identifier. The map ships as one file (ADR 0003), so it is how a partner tells whether their copy is current.

- **The data date** is `meta.generated` in the graph JSON, shown as "17 Nov 2026".
- **The build identifier** is the short commit the file was built from. `vite.config.ts` reads it from git and inlines it. `npm run build` prints it.
- **A "+" after the commit** means the build held changes that commit does not, in `framework-map/` or `tool-discovery/`. A file for the partners is built from a clean commit and has no "+".
- **"no commit"** means the build could read none, as outside a git checkout. The dev server shows "dev".
- **In the column of icons** the stamp stands in a compact form, over the icon for the keys: the day, the year and the build identifier, without the names "Data" and "Build".
- **Hovering the stamp** says the same in a sentence.

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

The page sets `data-ready="true"` on the `<html>` element once its first render is done. The screenshot script waits for it, and then for `window.frameworkMap.isMoving()` to be false, so every screenshot is of a state at rest.

## Adding a screenshot state

Add a name and a URL fragment to `scripts/screenshot-states.mjs`. A state that needs the keyboard to reach it also lists its keys: `['press', '/']` presses a key and `['type', 'semantic']` types text. A state is opened at every viewport unless it names its own with `at`. `webgl: false` opens it in a browser that gives the page no WebGL.
