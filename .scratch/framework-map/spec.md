# Framework map: an interactive 3D map of the Hermes OS tool framework

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. Decisions recorded in ADR 0001 (style guide extended with a map section), ADR 0002 (pinned layout computed at build time) and ADR 0003 (one self-contained file) are binding on this spec.

## Problem Statement

The Hermes OS tool framework sorts 752 tools into 8 tiers and 55 clusters and maps them to 33 needs. The three partners can already look up, sort and filter tools as rows in the tool matrix. What they cannot see is how the tools relate:

- where a tool sits in the stack and what sits around it;
- which tools a need pulls in across several tiers;
- which tools one role has in reach;
- which needs and tools each roadmap phase calls for.

The Designer and Analyst work on mid-tier laptops and should not have to install or run anything to see this.

## Solution

A map: an interactive 3D presentation of the framework that a partner opens by double-clicking one HTML file. Each tier is a plate, each cluster a cell on its plate, and each tool a mark in its cell. Every mark is always in the same place. Three lenses (role lens, need trace, phase scrub) and seven filters re-colour that fixed layout without moving anything. A detail card, a search box and an outline tree sit around the canvas. Row lookup stays in the tool matrix, and the detail card links to it.

The look is simple and minimal with a polished finish, drawn from the existing "Ivory and cobalt" style guide in its light skin. It must not look like a typical graph-visualisation demo.

## User Stories

### Seeing the stack

1. As a partner, I want to open the map by double-clicking one file, so that I need no install, server or network.
2. As a partner, I want to see all eight tiers stacked as plates when the map opens, so that I grasp the shape of the framework at once.
3. As a partner, I want each tier to show its name and tool count at the stack distance, so that I know how large each tier is.
4. As a partner, I want every one of the 752 tools present as a mark from the start, so that the map agrees with the tool matrix.
5. As a partner, I want each cluster drawn as a cell sized by its tool count, so that I can compare clusters by eye.
6. As a partner, I want a tool to be in the same place every time I open the map, so that I learn where things are.
7. As a partner, I want a mark's form to show its decision class in four steps (committed, planned, optional, guarded), so that I see how committed we are without opening anything.
8. As a partner, I want a legend for the four decision-class steps, so that I can read the marks without guessing.
9. As a partner, I want nothing to move when I am not interacting, so that the map stays calm.

### Moving through distances

10. As a partner, I want to click a tier and have it fill the view with its cluster names, so that I can read one tier at a time.
11. As a partner, I want the plates above a focused tier to fade, so that I can see the plate I chose.
12. As a partner, I want to click a cluster and see the names of its tools, so that I know what the cluster contains.
13. As a partner, I want a kind icon and a gate badge beside each tool name at the cluster distance, so that I can tell what sort of thing each tool is and whether it is gated.
14. As a partner, I want a breadcrumb showing the stack, tier and cluster I am in, so that I always know where I am.
15. As a partner, I want Escape to step out one distance, so that I can back out without hunting for a button.
16. As a partner, I want the camera to stay within sensible limits, so that I cannot end up under or inside the plates.
17. As a partner, I want to orbit the stack around its vertical axis, so that I can look at it from any side.

### Reading a tool, cluster or need

18. As a partner, I want hovering a mark to show the tool's name and cluster, so that I can scan without clicking.
19. As a partner, I want to select a tool and read a detail card with its kind, capability, decision class, roles, hosting, value stream, gate and evidence, so that I do not need the matrix for a single tool.
20. As the Architect, I want the detail card to say whether a decision is mine or "Proposed here", so that I do not mistake a proposal for a commitment.
21. As a partner, I want the detail card to list the needs a tool serves and let me open each one, so that I can move from a tool to the reason it is there.
22. As a partner, I want the detail card to list the other tools in the same overlap group, so that I know what competes with it.
23. As a partner, I want a link from the detail card to the tool's repository, so that I can read the source.
24. As a partner, I want a link from the detail card to the tool matrix, so that I can switch to row lookup.
25. As a partner, I want to select a cluster and see its tier, attributes and tools as a list, so that I can read a cluster as a whole.
26. As a partner, I want to select an internal skill and see a line to the higher cluster it implements, so that I understand the vertical wiring.

### Role lens

27. As the Designer, I want to switch on the role lens for my role and see the tools I use brought forward across all tiers, so that I know my reach.
28. As the Analyst, I want the same for my role, so that I know my reach.
29. As a partner, I want the rest of the tools to fade but stay in place under the role lens, so that I keep my bearings.
30. As a partner, I want the detail card to show which other roles use a tool, so that I know who to talk to.

### Need trace

31. As the Architect, I want to pick a need from a list grouped by phase, so that I can find it quickly.
32. As the Architect, I want the tools serving the chosen need highlighted, with best-fit tools marked more strongly, so that I see the recommended set.
33. As the Architect, I want the need's home cluster outlined and lines drawn from it to each serving tool, so that I see how the need spans tiers.
34. As the Architect, I want the camera to frame every tool in the trace, so that none is off screen.
35. As the Architect, I want the detail card to show the need's verdict, phase, lead role, approach and gap, so that I know what still has to be built.

### Phase scrub

36. As the Architect, I want to step through P0 to P4 and see only the needs and tools scheduled in each phase, so that I can plan one phase at a time.
37. As the Architect, I want a need that spans phases to appear in each of them, so that nothing is missed.
38. As the Architect, I want a count of needs and tools per phase on the phase strip, so that I can compare phases.
39. As a partner, I want the phase scrub to move only when I move it, so that I control the pace.

### Search, filters and outline

40. As a partner, I want to search tool names and capabilities, cluster names and need names, so that I can find anything by a word I remember.
41. As a partner, I want choosing a search result to fly to it and open its detail card, so that search doubles as navigation.
42. As a partner, I want to filter by decision class, kind family, used by, operated by, hosting, value stream and gate family, so that I can narrow the map to what I care about.
43. As a partner, I want a one-click "committed only" filter, so that I can hide everything optional.
44. As a partner, I want filtered-out marks to fade but stay in place, and a count such as "214 of 752", so that I know how much is left.
45. As a partner, I want filters to apply on top of the active lens, so that I can ask combined questions.
46. As a partner, I want an outline of tiers, clusters and tools in the left rail, so that I can browse the framework as a list.

### Sharing and versions

47. As a partner, I want to copy a link that reopens the same lens, selection and filters, so that I can point another partner at exactly what I see.
48. As a partner, I want the map to show the data date and a build identifier, so that I can tell whether my file is current.

### Keyboard, accessibility and motion

49. As a keyboard user, I want to reach every tool through the outline, search and panels, so that I do not need the mouse.
50. As a keyboard user, I want `/` to focus search, `1` to `4` to switch lens, and `?` to list the keys, so that the common actions are one key away.
51. As a screen-reader user, I want selection changes announced and the outline exposed as a tree, so that I can follow the map without seeing the canvas.
52. As a partner who has reduced motion switched on, I want the camera to cut and fades to be instant, so that the map does not make me unwell.
53. As a partner, I want camera flights and fades to be short and consistent, so that the map feels finished and not showy.

### Limits

54. As a partner on a laptop with integrated graphics, I want the map to stay smooth while I orbit, so that it is usable on my machine.
55. As a partner whose browser has no WebGL, I want a static picture of the stack, a short explanation and a link to the matrix, so that I am not left with a blank page.
56. As a partner on a phone, a tablet or a small window, I want the whole map, drawn and usable by touch, so that I am not tied to a laptop. (Amended by ticket 15b on the Architect's decision of 2026-11-18. The story asked for a short message in a window narrower than the map supports.)

### Keeping the map current

57. As the Architect, I want to edit the tool matrix, run one build and get a new file, so that the map stays in step with the framework.
58. As the Architect, I want the build to fail with a clear message when the data is inconsistent, so that a broken map never reaches the partners.
59. As the Architect, I want kind and gate values checked against a declared vocabulary, so that the data and the framework document stop drifting apart.
60. As the Architect, I want a hidden tuning panel while building, so that I can settle spacing and sizes by eye, and I want it absent from the finished file.

## Implementation Decisions

### Audience and job

- The users are the three partners, each working alone. The Architect is the primary user. There is no client audience and no presenter mode.
- The map answers relational questions only. Row lookup, sorting and bulk comparison stay in the tool matrix.

### Spatial model (ADR 0002)

- Only clusters and tools are objects in space. Tiers are plates. Needs, roles, value streams and phases are interface controls. The root is not drawn.
- Each tier is a rectangular plate, stacked by tier height. Each cluster is a rectangular cell on its plate, sized by its tool count. Marks sit on a regular grid inside their cell. The `sector` value in the graph data is used only as the cluster's order on the plate.
- Positions come from one pure layout function that takes the graph and returns a position and size for every plate, cell and mark. It runs when the map is built. Positions are not stored in the graph data.
- 3d-force-graph is the renderer and camera. Every node is pinned and no simulation runs.
- All 752 tools are always present. The "committed only" filter (Core v1, Core later, Build) is off by default.
- No edges are drawn at rest. `serves` lines appear in a need trace. `implements` lines appear when an internal skill or its target cluster is selected. `contains` edges are never drawn. `overlaps` edges are not drawn in this version; overlap group members are listed on the detail card.
- Nothing ever moves a mark. Lenses, filters and focus change colour and opacity only.

### Encodings

| Axis | Encoding |
| --- | --- |
| Tier | Plate height |
| Cluster | Cell on the plate |
| Decision class | Mark form in four steps (see Visual language) |
| Kind | Filter by kind family; Lucide icon on the detail card and at the cluster distance |
| Used by | Role lens; filter |
| Operated by | Filter; detail card |
| Hosting | Filter; detail card |
| Value stream | Filter; detail card |
| Needs | Need trace |
| Phase | Phase scrub |
| Gate | Detail card; filter on five gate families; badge at the cluster distance |
| Evidence | Detail card only; all marks are the same size |

- The ten decision-class values group into four steps: committed (Core v1, Adapter, Skill / rule), planned (Core later, Build), optional (Optional / benchmark, Reference / concept, Out of scope, Unverified) and guarded (Delay / guarded).
- Raw kind values group into about eight kind families, and raw gate values into five gate families (none, admission review, licence check, guarded, operator approval). These groupings live in one explicit display table in the map and need the Architect's sign-off.

### Lenses

- One lens is active at a time: none, role lens, need trace or phase scrub. Filters apply on top of the active lens.
- Role lens: means "used by" only, one role at a time. Tools shared with other roles look the same as the role's other tools. "Operated by" is a filter, not a lens.
- Need trace: tools serving the need take the accent colour; best-fit tools get a heavier ring; the home cell is outlined in the accent; lines run from the home cell to each serving tool; the camera frames them all; the detail card shows the need. Needs are picked from a list in the left rail grouped by phase.
- Phase scrub: each step shows only the needs scheduled in that phase and the tools serving them. It is not cumulative. A need spanning several phases appears in each. Tools serving no need stay faded. The phase strip shows counts of needs and tools per phase. It moves by hand only.

### Distances and labels

- Stack distance: tier names and tool counts; cells outlined; marks unlabelled.
- Tier distance: cluster names appear.
- Cluster distance: tool names for that cluster only, with kind icon and gate badge.
- Tier, cluster and tool names use troika-three-text. Counts and small tags use three-spritetext.

### Navigation and interaction

- Camera: orbit around the stack's vertical axis, with fixed limits on tilt and zoom and a narrow perspective lens for a near-axonometric look. No free flight.
- Touch (ticket 15b): a tap selects as a click does, a drag orbits, a pinch changes the distance within the same limits, and a finger held in place shows what a hover shows. No gesture on the canvas scrolls or zooms the page at its own size. A pinch on a panel still zooms the page, for a partner who needs larger text, and in a page so zoomed a gesture on the canvas moves the page.
- Clicking a tier, cluster or tool flies to it. Escape closes the detail card if it is open, otherwise steps out one distance.
- Focusing a tier fades the plates above it and tilts the camera toward top-down. Plates never move apart.
- Detail card: one panel docked on the right, 360 pixels wide, with three forms.
  - Tool: name, kind, capability, decision class and decision source, used by, operated by, hosting, value stream, gate, needs served (each opens its need trace), overlap group members, repository link, stars, last commit, licence, verification, note, link to the tool matrix.
  - Cluster: tier, cluster attributes, and its tools as a list.
  - Need: verdict, phase, lead role, approach, gap, best-fit tools.
- Hover shows the tool's name and cluster only.
- Search: MiniSearch over tool names and capabilities, cluster names and need names. Results are grouped by those three types. Choosing one flies to it and opens its detail card.
- Filters: decision class, kind family, used by, operated by, hosting, value stream, gate family. Values within one filter combine as "or"; different filters combine as "and". Filtered-out marks fade in place. A count shows the result.
- Shareable state: the URL fragment holds the lens (and its role, need or phase), the selection and the filters. The camera angle is not stored; the focused tier or cluster is.
- Keyboard: `/` focuses search; Escape as above; arrow keys move in the outline tree and Enter selects and flies; `1` to `4` switch between no lens, role lens, need trace and phase scrub; left and right step the phase while the phase strip has focus; `?` shows the key list. There are no camera keys.

### Interface around the canvas

- Top left: title and search box. Top centre: breadcrumb.
- Left rail, 240 pixels: lens switch, filters, the outline tree, the need list when the need trace is active, and the build stamp.
- Right: the detail card, present only when something is selected.
- Bottom: the phase strip, present only in the phase scrub. Bottom left: the decision-class legend.
- Designed for 1366×768 to 1920×1080. The map is drawn, and every task can be done, from 360 pixels wide upward; 360×640 is the smallest supported size. Below 1366 wide the left rail collapses to icons and the detail card overlays the canvas. Below 1024 wide the rail stands as a bar across the top and its parts open over the canvas; the page layouts there are in the style guide's map section. (Amended by ticket 15b on the Architect's decision of 2026-11-18. This line made 1280×720 the smallest supported size and asked for a short message in place of the canvas below 1024 wide.)
- Panels are plain DOM around the canvas, with Lucide icons.

### Visual language (ADR 0001)

- Light skin only. Every colour is read from a named token so a dark skin can be added later without touching scene code.
- The style guide gains a "Map" section. No existing token changes, and its `Font source: web` line stays. The map section defines:
  - Plate: `paper-2` fill with a `rule-solid` edge. Cell: `rule` hairline.
  - Decision-class scale: committed is a solid `ink` fill; planned is a `paper` fill with an `ink` outline; optional is a `paper` fill with a thin `soft` outline; guarded is a dashed `muted` outline. The steps differ by form, never by opacity alone.
  - States: hover is an `ink` ring; selected or traced is `accent` fill; keyboard focus is a 2-pixel `accent` outline with a gap; faded is `ink` at about 12%.
  - Two stated exceptions to the guide: `accent` may mark many tools at once during a need trace or phase scrub, and faded marks sit below 3:1 because the marks inside the set carry the meaning.
  - Text floor on screen: 12 pixels for names, 11 for tags.
  - Type: tier names in Instrument Serif; cluster and tool names in Geist; counts and tags in Geist Mono, uppercase.
- New map tokens are added to the contrast contract as rows and must pass it.
- Fonts (Geist, Geist Mono, Instrument Serif) are bundled through Fontsource.
- Postprocessing: antialiasing always; slight depth blur at the tier and cluster distances only; no glow; no vignette.
- Motion: camera flights 700 ms, run by the renderer's own camera transition; lens and filter fades 250 ms; panels 200 ms; phase steps 300 ms. anime.js drives fades, panels and the phase scrub, never the camera and never positions. With reduced motion on, every duration is zero.

### Data contract

- The map reads the graph JSON only, never the CSV or the xlsx.
- A generator script in Python, with no new dependencies, reads the tool matrix CSV plus three small files extracted once from the current JSON (clusters, needs and overlap groups) and writes the graph JSON. The CSV becomes the edited source of truth; the xlsx is an export.
- A vocabulary file declares the allowed values for kind, decision class, hosting, value stream and gate. The values in today's data are reconciled against it once.
- The map never patches data silently. Mismatches are reported by the validator and fixed upstream.
- The map shows a build stamp: the data date from the graph's metadata and a build identifier from the commit.

### Architecture and delivery (ADR 0003)

- The repository is put under git before any map code is written.
- The map is written in TypeScript in its own source folder with its own package manifest.
- Vite with `vite-plugin-singlefile` builds one self-contained `framework-map.html` at the repository root, with code, graph data and fonts inlined. The file makes no request at run time and works from `file://` in current Chrome and Edge.
- Modules:
  - **data**: loads, validates and indexes the graph.
  - **layout**: the pure position function.
  - **state**: one store for lens, selection, filters and distance, synced to the URL fragment.
  - **scene**: draws plates, cells, marks and trace lines from state and layout.
  - **labels**: text in the scene, by distance.
  - **panels**: the DOM interface around the canvas.
  - **search**: the index and its results.
- Panels and scene never call each other. Both read from and write to state.
- The map exposes a "ready" signal that the screenshot script waits on.
- Tweakpane is loaded only by the dev server and is never in the built file. Values settled with it are copied into one constants file.
- Two additions to the settled toolset were approved: Vite with `vite-plugin-singlefile`, and Vitest.
- Partners receive the single built file. A link to it is added to the "Handoff Brief for Tool Discovery" section of the roadmap page.

### Performance and compatibility

- Budgets on a laptop with integrated graphics at 1366×768: at least 30 frames per second while orbiting; first picture within 3 seconds of opening; built file under 5 MB.
- If frames run slow, depth blur is switched off first.
- Without WebGL the page shows a static picture of the stack, a short explanation and a link to the tool matrix.

### Accessibility

- The outline tree in the left rail is the accessible equivalent of the canvas. It is a keyboard-navigable tree of tiers, clusters and tools that stays in step with the selection.
- Everything the canvas can do is reachable through the outline, the search and the panels.
- Selection changes are announced to assistive technology.
- The panels target WCAG 2.1 AA.

## Testing Decisions

A good test here checks behaviour a partner or the build would notice, through a module's public interface, and does not depend on how the module is written inside. No test reaches into three.js objects.

- **Seams.** Unit tests sit at three modules, using Vitest:
  - **data**: a valid graph loads and indexes; each kind of invalid graph is rejected with a message naming the fault.
  - **layout**: tested as a pure function. Every tool lies inside its cell and every cell inside its plate; no two marks overlap; cell area follows tool count; the same graph always gives the same positions.
  - **state**: lens, selection and filter changes produce the expected set of emphasised, faded and traced tools; the phase scrub is per phase and handles needs that span phases; state survives a round trip through the URL fragment.
- **Validator.** Run as part of the build, and it fails the build on any of:
  - an edge pointing to a missing node, or a duplicate id;
  - a tool with no cluster, or a tier that disagrees with its cluster's tier;
  - a kind, decision class, hosting, value stream or gate value outside the vocabulary file;
  - a need with no serving tool, or a phase string that does not parse;
  - metadata counts that disagree with the actual nodes and edges.
- **Screenshot script.** A Playwright script opens about eight named states by URL fragment (stack at rest, one tier, one cluster, a tool selected, the Designer role lens, one need trace, phase P2, a filtered state) at 1366×768 and 1920×1080. It waits for the "ready" signal, saves a screenshot and fails on any console error. There is no pixel comparison, because headless 3D rendering varies between runs. Playwright MCP is for ad hoc checks during a ticket; the script is the repeatable gate.
- **Critique.** Screenshots are critiqued in this order of authority: style guide, Impeccable, frontend-design, ui-ux-pro-max. The design plugin's accessibility review is required before the last ticket closes.
- **Frame rate.** Headless frame rates are not representative. The frame-rate budget is checked by hand on a partner's machine, as a `ready-for-human` ticket.
- **Definition of done for a ticket.**
  1. Tests at its seam pass.
  2. The build passes, including the validator.
  3. The screenshot script runs with no console errors.
  4. For a ticket that changes anything visible, the critique has run and each finding is fixed or written into the ticket.
  5. The work is committed.
- **Prior art.** The repository has no test suite yet. The nearest prior art is the diagram-design plugin's contrast check, which the map section's new tokens must also pass.

## Out of Scope

- An overlap-group lens, and any second view.
- A dark skin.
- Editing data from the map.
- A presenter or guided-tour mode.
- Embedding the map inside the roadmap page.
- Hosting the map at a URL.
- Needs, roles, value streams or phases as objects in space.
- Side-by-side tool comparison.
- Image export.
- Refreshing stars and last commits from GitHub.
- Pixel-comparison testing of screenshots.

## Further Notes

### Amendments

- 2026-11-18, ticket 15b, on the Architect's decision: "Phones and tablets" left the out-of-scope list; the message below 1,024 pixels was withdrawn; story 56, the line on window sizes and the line on touch say what replaces them.

### Open questions

1. Does the script that first produced the graph JSON still exist? If not, the generator is written from the current files.
2. No reference sites were supplied. The first slice that puts the stack on screen is the visual-direction check, judged by eye.
3. threejs-skills, Impeccable, frontend-design, ui-ux-pro-max and the Playwright MCP server are not installed. Any that cannot be installed for free is dropped, the setup ticket says so, and the order of authority closes over the gap.
4. The data holds at least 14 kind values and 14 gate values, against 11 and 5 in the framework document. The family groupings need sign-off.
5. The contrast check script lives in the diagram-design plugin, not in this repository. The map-section ticket decides how the new rows are checked.

### Facts about the data that shaped the decisions

- 347 of 752 tools have no repository and no stars, which is why size encodes nothing.
- 552 tools are hosted on the Hub, which is why hosting is a filter and not a spatial channel.
- Only 268 tools serve a need, so 484 stay faded in a need trace or phase scrub.
- Cluster size runs from 4 to 57 tools; the cluster distance must stay readable at 57 names.

### Suggested slices

Each ends in something that can be opened and looked at.

| # | Slice | Ends with |
| --- | --- | --- |
| 0 | Setup: git, missing tools, scaffold with Vite, Vitest and the screenshot script | An empty single-file page that builds, opens from `file://` and passes the script |
| 1 | Data: generator, vocabulary file, validator, reconcile kind and gate values | A validated graph JSON regenerated from the CSV |
| 2 | Style guide map section | Tokens the map can read, with contrast checked |
| 3 | Stack at rest: layout function, plates, cells, marks with the decision-class scale, tier labels, constrained camera | The whole stack on screen |
| 4 | Distances: fly to tier and cluster, plate fading, cluster and tool labels, breadcrumb, Escape | Drill-down from the stack to a named tool |
| 5 | Selection: state store, hover, detail card in three forms, URL fragment | A tool selected and shareable by link |
| 6 | Outline and search, with the keyboard map | Every tool reachable without the mouse |
| 7 | Filters and legend | Filtering with a count |
| 8 | Role lens | One role's tools brought forward |
| 9 | Need trace | One need traced across tiers |
| 10 | Phase scrub (depends on 9) | P0 to P4 stepping |
| 11 | Finish: postprocessing, motion and reduced motion, no-WebGL fallback, narrow-viewport message, build stamp | The polished file |
| 12 | Review and delivery: accessibility review, manual frame-rate check, link from the roadmap page | The file sent to the partners |

Slices 1 and 2 can run alongside 0. Slices 6, 7 and 8 are independent of each other once 5 is done.
