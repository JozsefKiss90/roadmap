# 12: Need trace

**What to build:** The Architect picks one of the 33 needs and sees what it pulls in across the stack: the tools that serve it highlighted, the best fits marked more strongly, the need's home cluster outlined, and lines from the home cell to each serving tool. The camera frames them all and the detail card shows the need.

Needs are not objects in space. They are picked from a list in the left rail, grouped by phase. This is the one place the map uses `accent` on many marks at once, as the style guide's map section allows.

**Blocked by:** 08

**Status:** ready-for-human

- [x] The lens switch offers the need trace; when it is active, the left rail lists the 33 needs grouped by phase
- [x] A need that spans several phases is listed under each of them
- [x] Choosing a need gives its serving tools the `accent` fill and gives best-fit tools a heavier ring
- [x] The need's home cell is outlined in `accent`
- [x] Lines run from the home cell to each serving tool, and are removed when the need changes or the lens is switched off
- [x] All other tools take the faded state; nothing moves
- [x] The camera frames every tool in the trace, across however many tiers it spans
- [x] The detail card shows the need form: verdict, phase, lead role, approach, gap and best-fit tools
- [x] Clicking a traced tool opens its detail card without leaving the trace; the need is one click away from that card
- [x] Opening a need from a tool's detail card starts the need trace for it
- [x] The lens and the chosen need are recorded in the URL fragment and restored from it
- [x] Key `3` switches to the need trace
- [x] State tests cover the traced set and best-fit set for a need, a need with a single tool, changing need, and the URL round trip
- [x] A "one need trace" state is in the screenshot script and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.66 MB of the 5 MB budget. Press `3`, then choose a need in the rail. N15 has the widest trace: 15 tools on five tiers, seven of them best fits.

#### What was checked

- 297 unit tests and the generator's 23 pass. The new state tests cover the traced set and the best-fit set for a need, a need that a single tool serves, changing need, the trace with no need chosen, the filters on top, a traced tool selected, and the URL round trip. New data tests cover the tools that serve a need, the traced and best-fit sets, the tools in reach under a trace, and the needs under each phase.
- The screenshot script runs clean on seventeen states at both sizes. The new ones are "one-need-trace" (N15, the whole stack), "need-trace-unchosen" (as key `3` leaves it) and "need-trace-tool-selected" (a traced tool of N01, close in). "need-selected" is gone: a selected need is now a traced need.
- A headless run drove the trace with the keyboard and the mouse at 1366×768: `3`, Enter on a need, a best-fit row of the card, the row back to the need, Escape, the need's row again, `2`, `3` and `1`, and a click on a traced mark at the stack distance. The URL fragment followed every step and there was no console error. That run was made before the code review. The fixes after it are covered by the state tests and the screenshot states, and were not driven again by hand.
- The need list, the trace drawing, the legend and the detail card's row have no unit tests. The spec agrees three seams for unit tests.

#### Decisions for the Architect

1. **The need trace can be on with no need chosen.** `3`, or "Need" in the switch, lists the needs and changes nothing on the canvas until one is picked. The fragment is `#lens=need`.
2. **A selected need is always the traced need.** Choosing a need in the need list, in a tool's detail card or in the search starts its trace. Switching the lens off, or to the role lens, closes the need's card. A link such as `#select=N01` opens the trace.
3. **Choosing a need goes to the stack distance, and the camera frames the whole stack**, left of the detail card. It does not close in on the traced tools. The tier labels are set for the whole stack, and a closer view would push them under the rail.
4. **At 1366 pixels of width the tier names are left out beside a need's card.** The stack has 454 pixels there, and the plates come closer than a name is tall. Each tier keeps its count, as "T1 · 11 of 119 in reach". The style guide now says so, under its contrast rows.
5. **A click on a traced mark flies to the tool's cluster.** The trace stays on, and its lines run out of the picture there. The tool's card has a row at its head, "Tracing N01 · …", that goes back to the need. The spec review reads "the camera frames every tool in the trace" as broken in this state. I read it as holding for the need's own view.
6. **A selected tool cannot be told from the other traced marks on the canvas.** The guide gives both the same fill. Its name in the list and its row in the outline show it. The critique suggests an `ink` ring on the selected mark, which needs a line in the guide's "Map states".
7. **A traced tool of the home cluster has no line.** It stands inside the home cell's outline. The ticket asks for a line to each serving tool.
8. **The filters apply on top of the trace.** A traced tool they leave out is faded, with no line and no ring, and a click on it does what a click on any mark does.
9. **`3` keeps the place and the selection**, as `1` and `2` do. It comes back with the need it last showed, with the need's card closed. The store remembers the need, as it remembers the role.
10. **The need list stands between the lens switch and the filters**, where the spec lists it after the outline. While it is on show the filters take at most a quarter of the rail's height. At 768 pixels of height the list shows five needs and the outline two rows.
11. **A need that spans phases is listed under each**, so the five phases hold 49 rows for 33 needs, and a chosen need is marked in each place.
12. **The count beside "Lens" and the tiers' counts say "in reach"** for the trace, as for the role lens.
13. **The legend shows "Traced" and "Best fit"** while a need is traced. Beside an open card it keeps left of the card and takes a second row.
14. **"Traced", "Best fit", "Home cell" and "Need list" are new entries in `GLOSSARY.md`.** `map-bestfit-ring` and `map-home-cell` were in the guide already and are now in `src/tokens.ts`.

#### The critique

A separate agent critiqued the six new screenshots against the style guide, the Impeccable skill's heuristics and general ones. It did not run Impeccable's detector.

Fixed:

- With the names left out, each tier's count stood between two plates. It now stands level with the middle of its own plate.
- "Decision class" broke over two lines where the legend wrapped, and "Out of reach" stood alone on the second row. The heading keeps one line, and "Traced" and "Best fit" go to the second row together.
- The legend named the traced mark "Serves the need". It is "Traced", the glossary's word.

Left:

- **A best-fit ring is hard to tell from a traced mark at the stack distance at 1366×768.** The marks are about 5 pixels there. The need's card lists the best fits, and the rings read cleanly close in and at 1920×1080.
- **The lines of a trace run out of the picture close in.** It is decision 5.
- **The rail is short of room at 768 pixels of height.** It is decision 10. The critique suggests folding the filters and the outline to their headings under the need trace.
- **A need is listed under each phase.** The ticket asks for it. The critique would list it once with its range.
- **The selected tool has no cue of its own among traced marks.** It is decision 6.
- **The trace with no need chosen looks like no lens on the canvas.** The rail says "Choose a need to trace", and the focus goes to the need list.
- **The home cell and a selected cell take the same outline**, as the guide's tokens give them.
- **The need's card names the best-fit tools only.** The other serving tools are reached on the canvas and through the outline, whose rows are dimmed for the rest.
- **Lines to tools on the home cell's own plate lie close together.** They leave the cell from one point.

#### After code review

Fixed: `3` flew to the stack and closed an open tool card once any need had been shown; choosing the traced need again made a new lens, so every cache missed and the marks were dressed again; a faded traced mark took clicks from any distance; the rings could show before they were sized; a tool's card was made again on any change of lens; the guide did not name the left-out tier names, the line beside "Needs" or the row back to the need; the test for a traced need was written out in eight places and is now `tracedNeedOf`; four names were unclear; a tunable sat outside `src/constants.ts`; two classes had no rule.

Left:

- **`src/trace-drawing.ts` repeats parts of `src/selection-drawing.ts` and of the hover ring**: the line material, the outline drawn as a mark, and the ring sized in pixels.
- **`unitsPerPixelAt` is in `src/scene.ts` and in `src/labels.ts`.**
- **`src/labels.ts` now decides when the tier names are left out**, beside placing them.
- **`Traits` is a plain name** for a tool's facets with the needs it serves.
- **Five modules still ask "did the filters or the lens change"**, each in its own subscriber, as ticket 11 left them.
