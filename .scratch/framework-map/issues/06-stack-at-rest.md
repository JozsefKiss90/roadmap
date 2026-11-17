# 06: Stack at rest

**What to build:** A partner opens the map and sees the whole framework: eight plates stacked by tier, 55 cells sized by tool count, and all 752 marks in fixed places, each mark drawn in its decision-class step. Each tier shows its name and tool count. The partner can orbit around the stack and zoom within limits. Nothing is clickable yet.

This is the first time the map is on screen and no reference sites were supplied, so this ticket is the visual-direction check. The look must be simple, minimal and polished, and must not read as a graph-visualisation demo.

Positions come from one pure layout function, run at build time; 3d-force-graph renders with every node pinned and no simulation (ADR 0002). The `sector` value in the data gives only the order of clusters on a plate. No edges are drawn.

**Blocked by:** 02, 03, 05

**Status:** ready-for-human

- [x] The data module loads and indexes the inlined graph and refuses a graph the validator would reject
- [x] The layout function returns a position and size for every plate, cell and mark, and stores nothing in the graph data
- [x] Layout tests pass: every mark lies inside its cell and every cell inside its plate; no two marks overlap; a cell with more tools is not smaller than one with fewer; the same graph gives the same positions on every run
- [x] The largest cluster (57 tools) and the smallest (4) both lay out without overlap or empty-looking cells
- [x] All eight plates, 55 cells and 752 marks are drawn, using only tokens from the style guide's map section
- [x] Each mark shows its decision-class step; the ten raw values map to four steps as the spec lists
- [x] Each tier shows its name (troika-three-text) and its tool count (three-spritetext), both at or above the text floor at 1366×768
- [x] The camera orbits around the vertical axis, with fixed limits on tilt and zoom and a narrow perspective lens; it cannot go under or inside the plates
- [x] Antialiasing is on; there is no glow and no vignette
- [x] Nothing moves when the partner is not interacting
- [x] The "stack at rest" state is in the screenshot script and runs clean at both sizes
- [x] The screenshots have been critiqued in the order of authority, and each finding is fixed or written under Comments
- [ ] The Architect has looked at the result and accepted the visual direction
- [x] The work is committed

## Comments

### 2026-11-17: built, waiting for the Architect to look

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.53 MB of the 5 MB budget. One box is open: the Architect has not yet looked at the result.

#### What is on screen

- **Plates.** Eight plates, one above the other, T7 on top. They share their left edge and their depth. A plate's length follows its tier's tool count.
- **Cells.** Each cell is a block of columns, four marks deep. Every cell uses the same grid, so a cell's area follows its tool count.
- **Marks.** 752 flat squares, all the same size. Each is drawn in its decision-class step, with outline widths in screen pixels.
- **Labels.** A column to the left of the stack. Each tier has its name in Instrument Serif at 20 pixels (troika-three-text) and a count such as "T3 · 154 TOOLS" in Geist Mono at 11 pixels (three-spritetext). Both keep their size on screen.
- **Camera.** It orbits the vertical axis through the middle of the stack. The field of view is 3 degrees. Tilt is held between 46 and 72 degrees from straight down, and zoom between 0.4 and 1.1 times the range at rest. Panning is off.

#### What was checked, and how

| Criterion | Evidence |
| --- | --- |
| Data module loads, indexes and refuses | `src/data.test.ts`, 6 tests. `readGraph` runs the build's validator and throws `GraphRejected` with the faults |
| Layout returns a place for everything and stores nothing | `src/layout.test.ts`, 14 tests, on a made-up graph and on the real one (8, 55, 752). One test compares the graph before and after |
| Marks in cells, cells in plates, no overlap, larger cluster never smaller, same result each run | The same tests. One also reverses the graph's node list and expects the same layout |
| 57 and 4 tools | Checked on the real graph: no overlap, and no cell under 60% full |
| Only map tokens | `src/tokens.ts` holds the tokens; `src/tokens.test.ts` fails if a role or a token disagrees with the style guide |
| Ten values to four steps | `src/display.test.ts` holds the spec's list |
| Text floor at 1366×768 | Measured in the screenshot: names 20 pixels, counts 11 |
| Camera limits | A headless run dragged and zoomed to every limit. The camera never got under or inside a plate |
| Antialiasing, no glow, no vignette | The renderer's antialiasing is on, and no postprocessing pass is added |
| Nothing moves | Screenshots taken 1.5 seconds apart are identical, before and after interaction. Damping is off |
| Screenshot script | "stack-at-rest" runs clean at both sizes: no console error, no network request |
| Whole suite | 112 unit tests and the generator's 23 pass; the build passes |

#### Decisions for the Architect

These were made here and are the visual direction to accept or change.

1. **Plates are long and shallow, and differ in length.** One mark grid for every cell is what makes cell area follow tool count across the whole map. Equal plates would make a 4-tool cell on T7 larger than a 20-tool cell on T3. The cost is under point 2.
2. **The stack reads best from the front.** At rest no plate hides another. From the side the long plates overlap each other and run off the top and bottom of the window. Orbit still goes all the way round. Limiting the turn to about 35 degrees each way would hide the weak views, but the spec asks for "any side".
3. **A cell fills from its committed tools to its guarded ones, then by name.** Each cell then reads as a small bar of how committed it is. The spec does not ask for this. Its cost: when a tool's decision class changes, the tool and its neighbours move in the next build. The alternative is the tool matrix's own order.
4. **Marks are squares, not circles**, so the stack does not read as a node diagram.
5. **A guarded mark's dashed outline is drawn at its corners only.** A side is about 8 pixels tall on screen, too short for a row of dashes.
6. **The count carries the tier's id**, as in "T3 · 154 TOOLS". The spec asks for the name and the count only.
7. **Labels stand in a column at a fixed place on screen**, level with their plates. They do not move when the camera orbits. From the side a label no longer sits beside the end of its plate.
8. **The plate is a thin slab.** Its side shows as a band 3 pixels tall, in the plate's own tokens. The guide gives the plate a 1-pixel edge and says nothing of a side.
9. **Mark order needs the display table**, so `src/layout.ts` reads `src/display.ts`. The decision-class steps are grouped there; the vocabulary file still lists the ten values flat.

#### The critique

The screenshots were critiqued in the order of authority: the style guide, then Impeccable, then ui-ux-pro-max. frontend-design is not installed. A separate agent did it from the pictures alone. It applied the Impeccable and ui-ux-pro-max guidance by hand and did not run their scoring tools.

Fixed:

- **Planned marks read as committed.** At 12 by 6 pixels a 2-pixel outline left a 2-pixel slit of paper. Marks are now larger (0.72 of the grid pitch, from 0.62) and the camera at rest looks down more steeply (55 degrees, from 58). A planned mark now shows as much paper as ink.
- **Zoomed far out, the four steps merged.** The farthest zoom is now 1.1 times the range at rest.
- **Labels ran into each other** when the camera tilted steeply or zoomed far out. The least tilt is now 46 degrees.
- **The label column leaned** by 11 pixels from top to bottom. Every label now starts at the same place across the screen.
- **Two-line tier names were tight.** Line height is now 24 pixels on 20-pixel type.

Not fixed, for the Architect or a later ticket:

- **The count is not tracked.** The guide asks for 0.08em. three-spritetext cannot space letters. Either the guide drops the tracking for counts, or counts move to troika-three-text and the spec line changes.
- **The label column stands where the left rail will go.** With the 240-pixel rail of tickets 09 and 10, the labels and the T3 plate need about 110 pixels more than a 1366-pixel window has. The stack would have to shrink by about a tenth, or the long tiers wrap. This should be settled before ticket 09.
- **Some cells have a part-empty last column.** A cell of 5 tools has 8 places. It follows from one grid for all cells.
- **Optional and guarded differ little at 1366 wide.** They differ by the gap in the outline and by `soft` against `muted`. They are clear at 1920 and when zoomed in. Ticket 10's legend will help.
- **The plates' left edges lean by 12 pixels** from top to bottom, from the perspective that is left at 3 degrees.
- **At rest the picture is close to a flat table.** The third dimension shows only when the partner orbits.
- **Zoomed in, the labels leave the window.** Ticket 07 owns what is labelled at each distance.
- **The title has no background**, so plates pass under it when zoomed in. The panels of later tickets cover this.

#### After code review

Two reviews ran, one against the repository's standards and one against this ticket and the spec. The spec review found no unmet criterion.

Fixed:

- `vite.config.ts` held a raw NUL character, so git treated the file as binary.
- The camera's names used "lens", "view" and "distance", which the glossary keeps for other things. They are now "field of view", "camera" and "range".
- The labels' rise was measured along the world's vertical, not the screen's.
- A container with no size, or one narrower than the insets, gave a camera range of zero or infinity.
- Outline widths did not follow a change of display pixel ratio.

Left as they are:

- **The layout's spacings are in `src/layout.ts`, not in the constants file or the tuning panel.** The build computes the layout, so the page cannot change it live.
- **troika-three-text fetches a fallback font for a character its font lacks.** The bundled Instrument Serif covers Latin. A tier name outside it would make a network request, and the screenshot script would fail on it.
- **A page that fails to start still signals "ready".** It logs a console error, which fails the screenshot script. This is ticket 02's design.
- **`src/data.test.ts` rejects one kind of fault.** Each kind is tested in `src/validate.test.ts`, and the data module passes every fault on.
- **The tdd skill's loop was not kept strictly.** The data and layout tests were each written as a group before their module, not one at a time. The fill-order test was written after the code.
