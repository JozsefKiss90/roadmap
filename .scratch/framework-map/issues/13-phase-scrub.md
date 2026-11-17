# 13: Phase scrub

**What to build:** The Architect steps through roadmap phases P0 to P4 on a strip at the bottom of the map and sees, for each phase, the needs scheduled in it and the tools that serve them. This answers "what does each phase call for".

Each step shows that phase only; it is not cumulative. A need that spans phases (such as `P2-P3`, `P0-P4` or `P1, P3`) appears in each of them. Tools that serve no need stay faded throughout. The scrub moves by hand only, with no auto-play. It reuses the need trace's highlighting for a set of needs, without the per-need lines.

**Blocked by:** 12

**Status:** ready-for-human

- [x] The lens switch offers the phase scrub; when it is active, a phase strip appears at the bottom with five steps, and it is absent otherwise
- [x] Each step shows the count of needs and of tools for that phase
- [x] Choosing a phase highlights the tools serving the needs scheduled in that phase and fades the rest; nothing moves
- [x] A need spanning several phases is included in each phase it covers
- [x] The left rail lists the needs of the chosen phase, and choosing one opens its need trace
- [x] Left and right arrow keys step the phase while the strip has focus; key `4` switches to the phase scrub
- [x] The strip never advances on its own
- [x] The lens and the chosen phase are recorded in the URL fragment and restored from it
- [x] State tests cover the tool set for each phase, a need in a range, a need in two separate phases, and the URL round trip
- [x] A "phase P2" state is in the screenshot script and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.67 MB of the 5 MB budget. Press `4`, then the left and right arrow keys. P3 is the widest phase: 16 needs and 159 tools.

#### What was checked

- 328 unit tests and the generator's 23 pass. The new state tests cover the tool set for each of the five phases, a need in a range (`P1-P3`), a need in two separate phases (`P0, P4`), a tool that serves no need, the filters on top, a need chosen from the phase, a tool selected at the stack, and the URL round trip. New data tests cover the five steps, the needs of each phase, the tools in reach and their count for each phase, and the traced set.
- The screenshot script runs clean on 22 states at both sizes. The new ones are "phase-p2", "phase-p3-by-keyboard" (key `4` and three presses of the right arrow), "phase-tool-selected-stack" and "phase-p2-tier".
- A headless run at 1366×768 drove the built page: `3`, `4`, the arrow keys both ways, 1.5 seconds with no input, a need chosen from the rail with Enter, Escape, `4` again, a click on a step, the right arrow from P4, and `1`. The URL fragment followed every step, the phase stayed where it was while nothing was pressed, and there was no console error.
- The phase strip, the need list and the legend have no unit tests. The spec agrees three seams for unit tests.

#### Decisions for the Architect

1. **The phase scrub is a lens with a phase, as the role lens is a lens with a role.** The fragment is `#lens=phase&phase=P2`. `lens=phase` alone is P0. The scrub always has a phase: it starts at P0 and comes back at the phase it last showed.
2. **The tools of a phase take the traced fill and nothing else.** There are no best-fit rings, no home cells and no lines. The ticket leaves out the lines; I left out the rings and the home cells too, because each belongs to one need and a phase has up to 16. The legend shows "Traced" and not "Best fit".
3. **The strip stands above the legend, not beside it.** At 1366 pixels of width the legend takes most of the bottom row. The picture keeps clear of the strip, so switching the scrub on or off moves the camera once, by 60 pixels of room. Stepping the phase moves nothing. The ticket says "nothing moves", which I read as the marks and as the steps.
4. **The steps are radio buttons.** So the up and down arrows step the phase as well, and the right arrow from P4 goes to P0. The spec asks for left and right.
5. **`4` puts the keyboard focus on the strip**, so the arrow keys work at once. `2` and `3` leave the focus where it is, but for `3` with no need chosen.
6. **The need list is the need trace's list, cut down to the one phase.** The line beside "Needs" reads "Trace a need of P2". Choosing a need changes the lens to the need trace, so the strip goes; `4` comes back to the phase.
7. **A tool of the phase selected at the stack distance leaves the map there**, as a traced tool does. Stepping to another phase closes its card, even where the tool is in that phase too. The selection takes the `ink` ring, `map-trace-selected`.
8. **The counts on the strip are of the whole phase**, whatever the filters. The number beside "Lens" is the same figure, and the count at the head of the filters is the filtered one.
9. **The chosen step takes `paper-2` and the 2px `ink` ring**, as a chosen role does, so the one filled segment is still the lens that is on. The counts are set in `map-card-note`, not in `map-count`: five steps of uppercase mono do not fit beside an open card at 1366 pixels. The style guide has a line for both.
10. **"Phase strip" is a new entry in `GLOSSARY.md`**, and "Traced" and "Need list" now cover the phase scrub.
11. **The step is a cut.** Ticket 14 gives it the guide's 300 ms, as it gives the lens fades theirs.

#### The critique

A separate agent critiqued the eight new screenshots against the style guide's map section and general heuristics.

Fixed:

- The rail did not say whose needs it listed. The line beside "Needs" now reads "Trace a need of P2".
- The stack stood under the strip in "phase-p3-by-keyboard". The screenshot was taken while the camera was still flying clear of the strip. The state now opens with the scrub on, and `4` only goes to the strip.
- Beside an open card at 1366 pixels the strip touched the legend's second row. The strip stands 24 pixels higher beside a card, and the picture keeps clear of that too.

Left:

- **The need list is cut off at 768 pixels of height with no sign that it scrolls.** It is the need trace's list and behaves as it does there.
- **Only a need that spans phases has its phases at the end of its row.** Ticket 12 settled that.
- **The focus outline goes round the whole strip, not round one step.** The lens switch does the same. The focused step is always the chosen one, because the steps are radio buttons.
- **The counts are not in `map-count`.** It is decision 9.
- **The strip's count is of the whole stack while one tier is in the picture.** The tier's own count is on the canvas.

#### After code review

Fixed: the line "No need is scheduled in this phase." showed under the need trace before the scrub had been used; a need chosen from P3 or P4 could be scrolled out of the list as the list opened to all phases; the README's table of keys had no row for `4`; the README and the style guide still said the traced mark and the `ink` ring belong to the need trace alone; the strip's height beside a card was written twice, and is now one constant; the test for the phase a lens shows was written out in nine places and is now `scrubbedPhaseOf`; five names were unclear.

Left:

- **`needsIn(phase)` stands beside `needsByPhase`.** The first gives all five phases, the second only those with needs, for the need list.
- **Four panels each hand the focus on when they close**, with the same few lines.
- **There are seven small functions that choose "tool" or "tools".**
- **A new lens is added in several places of `src/state.ts`**: the lens type, the comparison, the fragment both ways and the store's memory.
- **"Step" names a decision-class step and a step of the phase strip.**
