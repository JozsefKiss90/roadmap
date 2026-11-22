# framework-map

Source for the map: the interactive 3D presentation of the Hermes OS tool framework. The build produces one self-contained file, `framework-map.html`, at the repository root (ADR 0003). The spec is `.scratch/framework-map/spec.md`.

## Commands

Run these from this folder, after `npm install`.

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, validates the graph, checks the map's contrast rows, builds, checks the built file and copies it to `../framework-map.html` |
| `npm run validate` | Checks the graph JSON against the vocabulary file; add `-- path/to/graph.json` to check another file |
| `npm run contrast` | Measures the map's contrast rows in the style guide, for the light and the dark skin; add `-- path/to/style-guide.md` to check another file |
| `npm run generate` | Regenerates the graph JSON from the tool matrix CSV, then validates it; see `../tool-discovery/README.md` |
| `npm run screenshots` | Opens the built file in each named state at ten sizes, from a 360×640 phone to 1920×1080, with reduced motion off and on, and saves a screenshot to `../screenshots/`. It takes about twenty-five minutes |
| `npm run touch` | Drives the built file as a phone would, with an emulated touch screen, and says what it found; see "Touch" |
| `npm run accessibility` | Drives the built file with the keyboard alone, reads what it tells assistive technology, and measures its text and its controls; see "Accessibility" |
| `npm test` | Runs the unit tests, then the generator's tests in `../tool-discovery/` |
| `npm run typecheck` | Type-checks without building |
| `npm run dev` | Starts the dev server with the tuning panel |

## How the build stays one file

- `vite-plugin-singlefile` inlines the code, the styles and the fonts. The graph JSON in `../tool-discovery/` is imported as text, so it is inlined too.
- `scripts/publish.mjs` refuses to copy the built file to the repository root if it is over 5 MB, loads anything from another file, lacks the graph or the static picture of the stack, or contains the tuning panel.
- `scripts/screenshots.mjs` opens the built file from `file://` and fails on a console error, an uncaught error, a missing "ready" signal, or any network request. It opens each state with the system's reduced-motion setting off and then on, and fails if a state does not come to rest, or if anything is under way with reduced motion on. It also fails if a state shows more than 60 labels, two labels that overlap, or a label that runs out of the window, under the rail, under the bar or under the detail card; if two panels overlap or a panel runs out of the window; if the rail, the bar, the detail card or the phase strip lies over the selected mark or cell; and if the page is wider than its window. At the phone and tablet sizes it emulates a touch screen, and fails if a control is smaller than 44 by 44 pixels. It says each failure as it finds it. It uses the installed Chrome or Edge.

## How the stack is drawn

| Module | What it does |
| --- | --- |
| `src/data.ts` | Validates the graph with the validator below and indexes it. It throws `GraphRejected` for a graph with any fault |
| `src/inlined-graph.ts` | Hands `data.ts` the graph and the vocabulary file that are inlined in the page |
| `src/display.ts` | The display table: groups the ten decision classes into the four steps a mark shows, names the steps and the classes of "committed only", and gives each kind family its icon and each gate family its badge |
| `src/layout.ts` | The pure layout function. It returns a position and size for every plate, cell and mark |
| `src/tokens.ts` | The roles and the map tokens of the two skins, copied from the style guide, and `SKIN`, the skin the map is drawn in: the dark one. A test fails if they disagree with the guide, or if `src/styles.css` gives a role another colour |
| `src/camera.ts` | The arithmetic for where the camera stands at each distance |
| `src/state.ts` | The state store: the distance, the focused tier or cluster, the selection, the filters and the lens, in step with the URL fragment. It also says which tools a lens leaves in reach, and which a need trace traces |
| `src/scene.ts` | Draws plates, cells and marks with 3d-force-graph. Flies the camera between distances, fades the plates above the focused one, and takes clicks. Draws each plate over its underside, the hover fill and ring with the outline of the hovered cell, the selected and traced marks and the faded marks |
| `src/mark-material.ts` | How a mark is drawn: a square with a fill, an outline or both, from a mark token, in the faded state or not |
| `src/selection-drawing.ts` | The outline of a selected cluster's cell, and the `implements` lines with their far ends |
| `src/trace-drawing.ts` | What a need trace adds to its marks: the home cell's outline, the lines to the traced tools, the best-fit rings and the selected tool's ring |
| `src/fold.ts` | The stack as it stands now: the rows of a wrapped tier in a column, or flat on its plate, and every place between |
| `src/pick.ts` | Which plate, cell and mark lie under the pointer, or within reach of a finger |
| `src/press.ts` | What a press on the canvas is: a tap, a drag, a finger held in place, or a pinch |
| `src/hover-label.ts` | The label beside the pointer, or over a finger held in place, for the mark under it: where the mark stands, the tool's name and its decision-class step, with a leader toward the mark |
| `src/labels.ts` | The names in the scene, by distance: tiers and counts, then clusters, then tools |
| `src/label-layout.ts` | The arithmetic for where tier labels, cluster names and tool names stand |
| `src/icons.ts` | Draws a kind family's Lucide icon for the scene |
| `src/page-layout.ts` | Which page layout a window gets, the room its panels leave the picture, and whether the names of clusters and tools have room in it |
| `src/panels.ts` | Mounts the rail, the breadcrumb, the detail card, the line that says what to choose and the list of keys, and takes the keys that work anywhere |
| `src/rail-collapse.ts` | The rail as icons: a column of them in the compact layout, and the bar in the narrow and the upright one |
| `src/detail-card.ts` | The detail card, in its tool, cluster and need forms |
| `src/outline.ts` | The outline: the tree of tiers, clusters and tools in the rail |
| `src/lens-panel.ts` | The lens switch in the rail, with the roles of the role lens and the number of tools in reach |
| `src/need-list.ts` | The need list in the rail: the 33 needs under their phases, while the need trace is on, and the needs of one phase under the phase scrub |
| `src/phase-strip.ts` | The phase strip at the bottom of the map: the five steps of the phase scrub, each with its counts |
| `src/rail-fold.ts` | Folds the filters and the outline to their headings while the need list is on show, and lets a heading open or fold its part |
| `src/filter-panel.ts` | The seven filters in the rail, with the count, "committed only" and "clear" |
| `src/legend.ts` | The legend of the four decision-class steps, with the faded, traced and best-fit states while they are on show, and the mark under the pointer |
| `src/search.ts` | The search index over tool names and capabilities, cluster names and need names |
| `src/search-box.ts` | The search field and the list of what it finds |
| `src/key-list.ts` | The list of keys that `?` opens, with the switch for the single keys |
| `src/single-keys.ts` | The switch for the keys that act anywhere on their own, which the browser keeps |
| `src/announcer.ts` | Tells assistive technology what is now selected, which lens is on and how many tools the lens and the filters leave, or where the map has gone |
| `src/dom.ts` | The helpers the panels build their elements with |

**The layout runs in the build, not in the page** (ADR 0002). A plugin in `vite.config.ts` runs `layoutStack` on the graph and serves the result as the module `virtual:stack-layout`. The page imports positions and never computes them, and nothing is written into the graph JSON. The layout's spacings are `STACK_METRICS` in `src/layout.ts`; after changing one, rebuild or reload the dev server.

**How the layout works.** Every cell uses one mark grid, four marks deep, so a cell's area follows its tool count and a plate's length follows its tier's. Plates share their left edge and their depth. A cell fills a column at a time, from its committed tools to its guarded ones and by name within a step.

**The camera** orbits the stack's vertical axis. Its tilt and zoom limits, its field of view and the margins around the stack are in `src/constants.ts`, and the dev server's tuning panel changes them live.

**The stack at rest is seen at a turn.** The camera stands 20 degrees round the stack, `restTurnDegrees`. Face on, the plates read as flat strips. At a turn each plate runs back from its near end, and the stack reads as a solid. `placeToFitPoints` in `src/camera.ts` then brings the camera as near as holds every corner of every plate, and every tier label, inside the window's insets. A wider turn makes the stack taller in the picture, so it is drawn smaller to fit.

**Under the bar the angle at rest is fitted to the window.** In an upright window a stack turned 20 degrees is as wide as the window and leaves most of its height empty. Turned further, each plate is shorter across the picture and the stack is taller, so the camera comes nearer. `restAngleAt` in `src/page-layout.ts` tries each tilt from `underBarRestTiltDegrees` to `underBarMostTiltDegrees` and each turn from `restTurnDegrees` to `underBarMostTurnDegrees`, and takes the one that draws a mark over the most pixels. It passes over an angle that leaves less than `underBarTagRoomPx` between the far edge of one plate and the near edge of the next, where a tier's tag stands. In a window wider than it is tall the first angle is already the best, and is kept. The angle follows from the window alone: an open panel moves the stack and does not turn it. The open legend lies over the left end of the top plates on a phone.

**A phone held upright gets the wrapped layout.** In a window under `uprightBelowPx` wide the long plates would be drawn small, or turned so far that they slope steeply. The build therefore makes a second layout, `virtual:stack-layout-wrapped`, from `WRAPPED_STACK` in `src/layout.ts`. In it no plate is longer than `mostPlateWidth`: a tier with more cells stands them in two rows or more, of near one length. `stackWrapsAt` in `src/page-layout.ts` says which layout a window gets. The scene is made once, from one layout, so `src/main.ts` loads the page again when a window comes to need the other, as when a phone is turned on its side. The fragment holds the state, and the keyboard focus is noted in session storage and given back.

**In the stack the rows of a wrapped tier stand in a column; with a tier open they lie on one plate.** At the stack distance each row is a plate of its own. The first row is on top and each next one stands straight under it, `rowRise` lower, so every plate of the stack has its left end and both its edges in line with the others, and the tier's tag stands on the first row. The plates above stand as much higher. At the tier and the cluster distance the rows lie side by side on the tier's one plate, which is as much deeper and runs further back. The layout gives the second form, and for every row its `lift`: the way up and forward to its place in the column. `src/fold.ts` keeps a copy of the layout and moves the rows, their cells and their marks between the two, and `src/scene.ts` folds the stack as the camera flies to or from a tier. Picking, the hover, the selection, the trace and the tier tags read that copy, so each follows the rows. The camera at rest is fitted to the column: `restAngleAt` asks tag room between two tiers only, and between two rows of one tier just that they show clear of each other. In the layout that is not wrapped no row has a lift, and nothing moves.

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
- **Labels keep their size as the camera comes closer or stands back.** Each is anchored to a point of the stack and offset from it in pixels. `src/label-layout.ts` works out the offsets, and `src/scene.ts` leaves room for them when it places the camera.
- **A tier's label stands in the scene, along its plate.** It is a tier's count over its name, upright, at the left end of the plate, and it ends 32 pixels short of the plate. It turns and tilts with the stack as its plate does. It is stretched so that at rest it is drawn at its own size, 20px for the name. The names of clusters and tools face the camera instead.
- **Seen from behind the stack, the tier labels change ends.** The plates' right ends are then at the left of the picture. The labels stand there, turned round, so they stay in the same part of the window and still read from left to right. The change comes as the labels are seen edge on.
- **A tier name stands on one line.** The longest is 336 pixels, and `labelColumnPx` keeps that room beside the rail. Where the plates stand too close for the names, the names are left out, and the stack takes their room down to `labelCountPx`.
- **The page reports its labels.** `window.frameworkMap.labels()` returns one rectangle for each label on screen, with the label's four corners, and `window.frameworkMap.selection()` the rectangle of the selected mark or cell. The screenshot script reads both. A tier's label stands at an angle, so two labels overlap only where the shapes inside their corners do.

## Selection and the detail card

A partner can select a tool, a cluster or a need. The detail card on the right describes the selection, and is absent when nothing is selected. `src/state.ts` holds the selection. The scene and the detail card both read it there, and neither calls the other.

| To select | Do this |
| --- | --- |
| A tool | Click its mark on the focused plate, its name in the list above a focused cell, or its row in the detail card. Or choose it in the outline or the search |
| A cluster | Click its cell on the focused plate, between the marks, or click its name. Or choose it in the outline or the search |
| A need | Choose it in the need list, click its row in a tool's detail card, or choose it in the search |

- **Selecting a tool or a cluster goes to that cluster.** Selecting a need starts its need trace, at the stack distance. A traced tool that is selected at the stack distance leaves the map there.
- **A need's detail card opens at the stack distance.** The whole stack then stands left of the card. In a narrow window the plates come too close for the tier names, which are left out; each tier keeps its count, which begins with its code. The stack is then drawn larger, in the room the names would have had.
- **Going somewhere else drops the selection.** The breadcrumb, a click on another plate and a step out all close the detail card.
- **Escape closes the detail card first.** The next Escape steps out one distance.
- **Hover works at every distance.** The mark under the pointer fills with `accent` and gets a ring, and its cell takes an `accent` outline. A label gives where the mark stands, as "T6 · 6A · 06" for the sixth tool of cluster 6A in tier T6, then the tool's name and its decision-class step. From the stack, a click still goes to the tier. By touch, a finger held in place shows the same; see "Touch".
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

The rail is the 240-pixel column down the left. It holds the title, the search box, the lens switch, the filters, the outline and the build stamp, and the need list while the need trace or the phase scrub is on. Below 1366 pixels it stands as a column of icons, and below 1024 pixels as a bar across the top; see "Page layouts, the fallback page and the build stamp". The headings "Filters" and "Outline" are buttons that fold their part of the rail to the heading, or open it. A partner can do everything the canvas does from the rail and the detail card, with the keyboard alone.

**The outline** is a tree of the 8 tiers, 57 clusters and 803 tools. Tiers start open and clusters closed. A cluster's tool rows are made when it is first opened.

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
- **Focus is never lost.** When Escape closes a detail card that holds the focus, the focus goes to the outline, at the row for where the map is. When the filters or the outline fold under the focus, it goes to their heading.
- **Changes are announced.** A live region says what is now selected, or where the map has gone when nothing is selected. It says a change of lens or of filters too, with the count; see "Accessibility". The search says how many results it found.
- **The single keys can be switched off.** `/`, `?` and `1` to `4` act anywhere on the page with no other key held. The list of keys has a checkbox for them, and the browser keeps what it is set to. Escape, Tab and the arrow keys work whatever it says.
- **The camera keeps clear of the rail**, as it does of the detail card. `railPx` in `src/constants.ts` is the rail's width, and `pictureRoomAt` in `src/page-layout.ts` gives the room the panels leave the picture in each page layout.
- **A long tool name is cut short with an ellipsis** in the list above a cell, where the list would not fit between the rail and the open detail card. The outline, the hover label and the detail card give the name in full.

## Accessibility

The canvas cannot be read by a screen reader. The outline is its equivalent, and the canvas says so: its description names the outline, and its `aria-details` points to it. While the rail stands as icons it points to the icon that opens the outline. Everything the canvas does can be done from the outline, the search and the panels, with the keyboard alone. The panels are held to WCAG 2.1 AA.

- **One live region says every change**, in `src/announcer.ts`. It is on the page in every page layout. The counts in the rail are not: while the rail stands as icons they are not drawn, and a live region that is not drawn says nothing.

  | Change | What is said |
  | --- | --- |
  | A tool or a cluster is selected | "Selected the tool Serena, in cluster 4A, Engineering graph and code intelligence. Its detail card is open." |
  | A need is chosen | "Tracing need N15, … 15 tools serve it, 7 as a best fit. Its detail card is open." |
  | A lens comes on | "Role lens on. 269 of 752 tools in reach of the Designer." |
  | A step within a lens, to another role or phase | "92 of 752 tools serving a need scheduled in P2." |
  | The need trace waits for a need | "Need trace on. Choose a need to trace." |
  | The lens goes off | "Lens off. All 752 tools are in reach, with no filter chosen." |
  | A filter is set or cleared | "166 of 752 tools in reach of the Designer and passing the filters." |
  | The selection is cleared, or the map goes elsewhere | "Nothing selected.", "Tier T3, Pipelines and applications." |

- **Every control is at least 24 by 24 pixels** where a mouse is the main pointer, and 44 where a touch screen is; see "Touch". The chevron of an outline row is a control of its own, which opens and closes the row, and has those sizes too.
- **A part of the rail that folds under the keyboard focus hands the focus to its heading.** The filters and the outline fold when a need trace comes on, as with the key `3`.
- **While the single keys are off, no control offers one**: not in the text shown on hover, not to assistive technology, and not beside the search field or "Keys".
- **Text keeps to the contrast contract and the text floor**, and no name is cut where a partner sets wider letter, word and line spacing. A segment of the lens switch or a step of the phase strip then takes a second line.
- **A link that opens in a new tab says so** to assistive technology. The arrow beside it shows it.
- **On the fallback page** each tier's count and name is text that a screen reader reads. The drawings of the plates are hidden from it.
- **`npm run accessibility`** runs `scripts/accessibility-check.mjs`. It does every task with the keyboard alone and reads the live region and the keyboard focus after each step. It walks the Tab order. In each state it checks that every control has a name, that the text meets the contrast contract and the text floor, and that every control is 24 pixels each way. It does the same where the rail stands as icons, at 1280×720, 683×384 and 390×844. 683×384 is a 1366×768 window with the page zoomed to 200%. It checks a part that folds under the focus, the size of the controls on a touch screen with the outline on show, reduced motion, wider text spacing, the switch for the single keys and the fallback page. It is a browser driven by a script, and no screen reader. `scripts/check-page.mjs` holds what it shares with the touch check and the screenshot script.

What the review left as it is, and why, is in ticket 16.

## The role lens

The lens switch stands in the rail under the search box. It offers no lens, the role lens, the need trace and the phase scrub. One lens is on at a time, and `src/state.ts` holds it.

- **The role lens brings forward the tools one role uses.** A partner chooses the Architect, the Designer, the Analyst or the Trader. The tools that role uses keep their form at full strength, in all eight tiers. Every other tool fades in place, as a filtered-out tool does.
- **It means "used by" only.** A tool the role operates but does not use is faded. "Operated by" is a filter.
- **A shared tool looks like the role's other tools.** The detail card's "Used by" line lists every role that uses it.
- **The number of tools in reach** stands beside "Lens", as "269 tools in reach" for the Designer. A change of lens or role is announced with the count; see "Accessibility".
- **Each tier's count is of its tools in reach** while the lens is on, as "T3 · 87 of 154 in reach" on the canvas. A tier with no tool in reach has its name in the colour of a tag. The counts in the outline's tier and cluster rows follow.
- **The filters apply on top of the lens.** A tool is at full strength when it is in reach and passes the filters. The count at the head of the filters gives those tools. The number in reach and the tiers' counts do not change with the filters.
- **The one filled segment is the chosen one of the lens switch**, "None" as much as a lens. The chosen role is shown by a ring. The count beside the heading is of the tools in reach, which is all of them with no lens.
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
- **The count** at the head of the filters gives the tools that pass, as "276 of 752". Assistive technology is told "276 of 752 tools". While a lens is on, it gives the tools that are in reach and pass, and says whose reach. A change is announced; see "Accessibility".
- **"Committed only"** chooses the decision classes Core v1, Core later and Build, which is 340 tools. It is off when the map opens. `COMMITTED_ONLY` in `src/display.ts` lists them. They are not the legend's "Committed" step, which is Core v1, Adapter and Skill / rule.
- **"Clear"** clears every filter. It is there only while a filter is on.
- **The numbers beside the values do not change.** Each is the number of all tools with that value, whatever else is chosen.
- **Kind and gate are filtered by family.** The families and their order come from `../tool-discovery/vocabulary.json`. Decision classes are listed from the committed step to the guarded one.
- **The URL fragment holds the filters**, one part for each chosen value: `#used=D&used=M&hosting=Hub`. The names are `decision`, `kind`, `used`, `operated`, `hosting`, `stream` and `gate`. Roles and value streams are given by their codes. A value a filter does not list is dropped.
- **The filters hold** wherever the map goes and whatever is selected.
- **The change is a fade.** The marks change form in place over the fade duration. See "Motion and depth blur".

**The legend** at the bottom left of the canvas shows the four decision-class steps with their names, after a tag that names it. Its squares are drawn from the same mark tokens as the marks. Its last square is the mark under the pointer, "Hover / selected": the two take the same fill. While tools are traced that fill means "traced", and the square is named "Hover". While a lens or a filter is on, it also shows a faded square. It is named "Out of reach" for a lens, "Filtered out" for the filters, and "Out of reach or filtered out" for both. While a need is traced, it shows "Traced" and "Best fit" as well. Beside an open detail card the legend keeps left of it, on two rows or more if it must, and the phase strip stands over it however high it is. The stack at rest keeps clear of it: `insetBottomPx` in `src/constants.ts` is its room.

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
- **Nothing moves while the partner does nothing.** No timer and no loop starts a change. The one timer on the page is the half second of a hold, which a finger starts and which moves nothing.
- **The page says whether it is moving.** `window.frameworkMap.isMoving()` is true while a flight, a fade or a panel is under way. The screenshot script waits for it to be false.

**Depth blur.** The dark skin has no blur, and the map is drawn in it, so `depthBlur` in `src/constants.ts` is `false` and none of what follows is on show. With it switched on, at the tier and cluster distances the plates under the focused one are blurred a little: the more, the further under it they lie. `src/depth-blur.ts` draws it.

- **The focused plate is never blurred.** The blur follows the plates, not the depth buffer. Each plate under the focused one is blurred as a whole, and only where it is in the picture. Every name stands on or above the focused plate, so every name stays sharp.
- **A plate that holds the far end of an `implements` line is not blurred**, so the outlined end stays sharp.
- **There is no blur at the stack distance**, and it fades in and out with the plates.
- **There is no blur while a need is traced.** The trace's lines cross the plates under the focused one, and a blurred line is too pale to follow.
- **`depthBlur` in `src/constants.ts` is the one switch.** Set to `false`, no plate is blurred and the picture is drawn as the renderer draws it. It is the first thing to switch off where frames run slow.
- **`depthBlurPx` is the widest spread**, in pixels on screen, and `depthBlurFullAt` is how far under the focused plate the blur reaches it, in layout units.
- **There is no glow and no vignette.** The blur is the map's only postprocessing, where it is on. Antialiasing is the renderer's own and is always on.
- **The tuning panel has a "Motion" and a "Depth blur" folder.** A value settled there is copied into `src/constants.ts` by hand.

## Page layouts, the fallback page and the build stamp

**Four page layouts, by the size and shape of the window.** The map is drawn in every one, from 360 pixels wide upward. `src/page-layout.ts` decides which, and names it on the `<html>` element as `data-layout`. The two layouts with the bar also carry `data-bar`. The widths are `compactBelowPx`, `narrowBelowPx` and `uprightBelowPx` in `src/constants.ts`.

| Layout | Window | What a partner gets |
| --- | --- | --- |
| Full | 1366 pixels and wider | The rail stands open down the left |
| Compact | 1024 to 1365 pixels | The rail stands as a 56-pixel column of icons, and the canvas has the rest |
| Narrow | 480 to 1023 pixels, and wider than tall: a phone on its side | The rail stands as a bar across the top, with the breadcrumb in its row. The detail card stands under the bar at the right |
| Upright | Under 1024 pixels and at least as tall as wide, or under 480 pixels: a phone or a tablet held upright | The bar, with the breadcrumb in a row of its own under it. The detail card opens from the bottom |

360×640 is the smallest supported size. The screenshot script opens every state at 360×640, 390×844, 768×1024, 844×390, 1024×768, 1152×720, 1280×720, 1366×768, 1920×1080 and 1366×1024. It opens 360×640, 390×844, 768×1024, 844×390, 1024×768 and 1366×1024 as a phone or a tablet, with a touch screen.

- **The picture is fitted to the room the panels leave.** The scene and the labels ask `pictureRoomAt` for that room with the window's size, so the picture and the panels cannot disagree. A selection is never under the rail, the bar or the detail card.
- **Turning a phone, or resizing a window across page layouts, keeps the selection, the lens, the filters and the keyboard focus.** The first three are in the store, which no page layout touches. The focus stays where it is; where what holds it leaves the page, the icon of its part takes it, or the part itself. A part of the rail that is open under the bar stays open when a phone is turned, so a partner can go on typing in it.
- **The camera's angle is kept between the full and the compact layout, and at a change of size within a layout.** Where a window comes under the bar, leaves it, or is turned under it, the panels stand somewhere else and the stack at another tilt, and the camera takes its place anew.
- **A link opens the same in every page layout.** The URL fragment names no window.

**The compact layout.**

- **An icon opens the rail over the canvas** and goes to its part: the search box, the lens switch, the need list, the filters or the outline. The need list's icon is there only while the list is. The icon at the foot opens the list of keys.
- **An icon shows that its part is at work.** While a lens is on, or a filter is chosen, its icon is `ink` on `paper-2`, and its name ends in "on".
- **The canvas beside the open rail is dimmed**, as the page is behind the list of keys.
- **The open rail closes** with the button beside the title, with a press on the page outside it, or when the keyboard focus leaves it. The list of keys leaves it open. Escape keeps its own meaning and does not close it.
- **`/` and `3` open the rail**, because they go to the search box and the need list. When a detail card or the phase strip closes while it holds the focus, the icon of the part takes the focus, and the rail stays as icons.
- **The detail card lies over the canvas**, and the picture keeps clear of it.
- **From 1024 to 1279 pixels** the layout is the same, with less room. Beside an open detail card a window under 1,072 pixels has no room for the phase strip's five steps with their counts side by side, and the two counts of a step stand one over the other; see "The phase strip" below.

**The narrow and the upright layout: the bar.** `src/rail-collapse.ts` lays the same icons out as a row, and `src/styles.css` places the panels.

- **An icon opens its own part of the rail, alone**, over the canvas from the left: 320 pixels wide, or the window less 40 pixels. A small window has no room for the parts to share. The lens switch and the need list open together, because a need is chosen there. Each open part has the title above it and the "Keys" button and the build stamp at its foot. The search box alone has no foot, and on a phone on its side no title either: an on-screen keyboard leaves little height, and the results need it.
- **Choosing something the map goes to closes the open part**: a search result, a row of the outline, a need. A change of lens, role or filter leaves it open. It also closes as the compact rail does.
- **The legend opens on request**, from the last icon of the bar, with one step to a row. It leaves at the next press outside it.
- **The breadcrumb** stands in the bar's row in the narrow layout and in a row under it in the upright one, from the left. The crumb between the stack's and the last gives way first.
- **The detail card in the upright layout** is as wide as the window and takes 45% of its height, `cardHeightShare`. The picture is fitted to the room above it. In the narrow layout the card is 360 pixels wide, or half the window where that is less.
- **The phase strip** stands at the foot of the picture's room: over the card in the upright layout, left of it in the narrow one. A step's two counts stand side by side where the strip is at least 624 pixels wide, `phaseStripSideBySidePx`, and one over the other where it is not: on a phone, and beside a detail card in a window too narrow for both. `phaseStripStackedAt` in `src/page-layout.ts` decides, for the strip and for the picture's room alike.
- **At the stack distance each tier's code and name stand on the far edge of its plate**, from the plate's left end, as one tag: "T3 PIPELINES AND APPLICATIONS". The tag is 10 pixels, `tierTitlePx`, a pixel under the other tags, so that the longest name has room in a phone's window. There is no room beside the stack for the name at its own size. The tag gives no count, under a lens or without one; the outline counts each tier. It has the colour of a name, and the colour of a tag where a lens leaves none of the tier's tools in reach. The tag stands in the scene as the tier labels do, so it runs along its plate. The camera stands a little more level, `underBarRestTiltDegrees`, which opens the room for the tags. The code has no dot after it, which leaves the name two more letters of room. Every name has room with the stack at rest from 324 pixels wide. A name that would still run out of the window is cut short, with an ellipsis: above a detail card on a phone 360 pixels wide, where the stack stands back, and in a window under 324 pixels. Where the room would leave fewer than four letters of the name, the tag gives the code alone. The room is measured with the stack at rest, so turning the stack changes no tag. Beside a detail card and the phase strip on a phone the plates stand closer than a tag is tall, and the tags are left out too.
- **Names that have no room are left out, never drawn smaller.** The names of a tier's clusters stand above its plate, and the names of a cluster's tools above its cell, where `namesFitFor` in `src/page-layout.ts` finds room for them. The scene, the labels and the line under the breadcrumb all ask it. On a phone held upright the tools' names have room for a cluster of up to nineteen tools with no card open, and the clusters' names have none. On a tablet nearly every list has room.
- **A line under the breadcrumb says what to choose** where names are left out and nothing is selected: "Choose a cell to read its cluster." or "Choose a mark to read its tool." The detail card and the outline give every name.
- **The search box and its results keep to what is in sight.** The open part is as tall as the browser's visual viewport, which shrinks while a phone's on-screen keyboard is up. The results stand under the field and scroll in what is left.
- **A phone's notch and home bar.** The page does not ask the browser to draw under them: its viewport has no `viewport-fit=cover`. So the browser keeps the page clear of the notch, and no panel can be under it. The phase strip stands 16 pixels off the window's foot, clear of the bar a phone on its side draws there for going home.

**Touch.** `src/press.ts` tells what a press on the canvas is, and `src/scene.ts` acts on it. The orbit controls of three.js take the drag and the pinch.

| Gesture | What it does |
| --- | --- |
| Tap | Selects, as a click does: a plate goes to its tier, a cell selects its cluster, a mark its tool, a name what it names |
| Drag | Orbits the stack, within the camera's limits |
| Pinch | Changes the camera's distance, within the same limits |
| Hold: a finger kept in place for half a second | Shows the hover label and the ring for the nearest mark under the finger. They stay until the next touch. Letting go selects nothing |

- **A finger goes in one step at a time.** A mark drawn under 10 pixels, `fingerMarkPx`, is too small to tap, and a tap on it lands on its cell. So from a tier on a phone a tap selects the cluster, and from the cluster a tap selects the tool. A mark large enough is met from 8 pixels off, so a tap between two marks is not lost.
- **Two fingers are never a tap**, however little one of them moved, and a finger that has dragged is never a tap. A mouse's click is judged as it always was, by where the button is let go.
- **A hold's label keeps under the bar and left of the detail card**, and goes when the finger drags on.
- **No gesture on the canvas scrolls or zooms the page.** The canvas has `touch-action: none`. A quick second tap on a panel does not zoom the page either.
- **A pinch on a panel still zooms the page**, for a partner who needs larger text. While the page is zoomed, a gesture on the canvas moves the page, as anywhere else, so the canvas cannot hold a partner in the zoomed page. At the page's own size the canvas takes its gestures back.
- **Every control is at least 44 by 44 pixels where a touch screen is the main pointer**, `(pointer: coarse)`, in every page layout. A laptop with a touch screen has a mouse as its main pointer: it keeps the laptop's sizes, and its screen still takes the tap, the drag, the pinch and the hold.
- **`npm run touch`** runs `scripts/touch-check.mjs`. It opens the built file in an emulated phone and checks the gestures, every task by touch alone, a phone turned on its side, one link at every size, reduced motion, and a laptop with a touch screen. It is an emulation: it tells the page how much of the window is in sight, as an on-screen keyboard would, and has no real keyboard to raise.

**The fallback page.** `src/fallback.ts` asks the browser for WebGL before any scene is made. Without it the page shows the title, a short explanation, a link to the tool matrix, the static picture of the stack, the four decision-class steps and the build stamp. There is no console error, and a URL fragment changes nothing.

- **A screen reader reads the picture's names.** Each tier's count and name is text of the page. The drawings of the plates are hidden from assistive technology, and the picture as a whole is a named group.
- **The static picture is drawn by the build.** `src/stack-picture.ts` is a pure function of the layout. `vite.config.ts` runs it and inlines its markup as the module `virtual:stack-picture`, as it does the layout itself (ADR 0002). The picture adds about 0.07 MB to the built file.
- **It shows the stack at rest**: a row for each tier, with its count and name and a drawing of its plate, cells and marks. Each mark is in the form of its decision-class step. A mark's outline has the width its mark token gives, and is drawn inside the mark. It takes its colours from the map's tokens in `src/styles.css`.
- **It fits a window of any width.** The names are text of the page and keep their size. In a window of 1,233 pixels or more they stand beside the plates, which are drawn at their own size. In a narrower one each tier's count and name stand over its plate, and the plates are drawn as wide as the window allows. The page never scrolls sideways; it scrolls down where it must.

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

`npm run contrast` reads `../references/style-guide.md` and exits with 1 if it has a finding. The map has two skins, and the guide has a table of contrast rows for each: "Map contrast rows" for the light skin and "Map contrast rows, dark skin" for the dark one. The check measures every row of both, each with its own skin's roles: the light values of "Semantic roles", and "Map roles, dark skin". A finding says which skin it is of. The build runs the check, and `npm test` runs the same check on the real guide.

A finding is one of these:

- a row below the minimum for its use;
- a Minimum or Measured cell that disagrees with the measurement;
- a colour or surface that is not a semantic role, or a use the contract does not know;
- a colour that the token's value for that skin in "Map tokens" does not name;
- a table whose columns are not the ones the check reads;
- a token of a skin with no row in that skin's table, or a row for a token the skin lacks. "None" in a skin's column of "Map tokens" says the skin does not have the token.

A row may name a role of its skin in place of a token. It then measures that role on its own, as the dark skin's rows for `ink-strong` on a filled control do.

To add a map token, add it to "Map tokens" with a value for each skin, give it a row for each surface it sits on in each skin's table, and run the command. The command prints the measured ratio to write in the row.

**To change the skin the map is drawn in**, set `SKIN` in `src/tokens.ts` and give `:root` in `src/styles.css` that skin's roles. `src/tokens.test.ts` fails until the two agree. The light skin has no `map-plate-side`, `map-hover-cell` or `map-text-count`, so the code that reads those tokens has to be given what to do without them, and the type check says where.

The rows of the guide's "Semantic roles" table are not checked here. The diagram-design plugin's `verify-contrast.py` checks those.

## The "ready" signal

The page sets `data-ready="true"` on the `<html>` element once its first render is done. The screenshot script waits for it, and then for `window.frameworkMap.isMoving()` to be false, so every screenshot is of a state at rest.

## Adding a screenshot state

Add a name and a URL fragment to `scripts/screenshot-states.mjs`. A state that needs more than its fragment to reach it also lists its `steps`: `['press', '/']` presses a key, `['type', 'semantic']` types text, and `['tap', '.rail-close']` taps what a selector finds, or clicks it where the viewport has no touch screen. A state is opened at every viewport unless it names its own with `at`. A viewport with `touch: true` is opened as a phone or a tablet. `webgl: false` opens the state in a browser that gives the page no WebGL.
