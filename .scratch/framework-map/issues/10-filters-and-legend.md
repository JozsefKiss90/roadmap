# 10: Filters and legend

**What to build:** A partner can narrow the map to what they care about and see how much is left. Seven filters sit in the left rail: decision class, kind family, used by, operated by, hosting, value stream and gate family. Tools that do not match fade but stay in place, and a count such as "214 of 752" shows the result. A legend explains the four decision-class steps.

Values within one filter combine as "or"; different filters combine as "and". The kind and gate families are the groupings signed off in ticket 03 and live in one display table.

**Blocked by:** 08

**Status:** ready-for-human

- [x] The seven filters are in the left rail, each listing its values with the number of tools for each
- [x] Choosing two values in one filter shows tools matching either; choosing values in two filters shows tools matching both
- [x] Tools outside the filter fade to the faded state and never move or disappear
- [x] A count shows matching tools out of 752 and updates with every change
- [x] A "committed only" control selects Core v1, Core later and Build (327 tools) in one click, and is off by default
- [x] One control clears all filters
- [x] Filtered-out tools are also dimmed in the outline
- [x] The filters are recorded in the URL fragment and restored from it
- [x] A legend at the bottom left shows the four decision-class steps with their names
- [x] State tests cover "or" within a filter, "and" across filters, clearing, and the URL round trip
- [x] A "filtered" state is in the screenshot script and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.65 MB of the 5 MB budget. Open "Used by" in the rail, tick Designer and Analyst, then open "Hosting" and tick Hub. The count reads "276 of 752 tools".

#### What was checked

- 238 unit tests and the generator's 23 pass. The new state tests cover "or" within a filter, "and" across filters, a tool that several roles use, clearing, and the URL round trip with values that hold a space, a slash and a comma. New data tests cover each filter's list of values, a tool's values, the counts and the tools that pass. One test holds "committed only" to 327 of the 752 tools in the real graph.
- The screenshot script runs clean on thirteen states at both sizes. The new ones are "filtered" (two filters, the whole stack) and "filtered-cluster" ("committed only", close in).
- A headless run drove the filters with the mouse and the keyboard at 1366×768. The counts were 327 for "committed only", 269 for Designer, 437 with Analyst added and 276 with Hub added. The URL fragment followed every step, a link restored the filters beside a selection, Escape kept them, and "Clear" by keyboard left the focus on "Committed only". There was no console error.
- The filter panel, the legend and the outline's dimming have no unit tests. The spec agrees three seams for unit tests. The headless run and the screenshot states check the rest.

#### Decisions for the Architect

1. **"Committed only" and the legend's "Committed" are different sets.** The control chooses Core v1, Core later and Build, as this ticket says. The legend's step is Core v1, Adapter and Skill / rule, as the spec's "Encodings" says. A partner who ticks "Committed only" sees Adapter and Skill / rule fade, and sees planned marks stay. The control's hover text lists its three classes. A different name for one of the two would end the clash.
2. **Every filter starts closed.** The rail shows the seven names, and a filter lists its values and their numbers once it is opened. A filter with a value chosen starts open. With all seven open the list is 51 rows, which the rail cannot hold beside the outline.
3. **The filters take at most half the rail's height**, and scroll inside it. At 768 pixels of height, with a long filter open, the outline shows about five rows.
4. **The number beside a value is the number of all tools with that value.** It does not change as other filters are chosen. The count at the head gives the result.
5. **The decision-class filter lists the ten classes**, from the committed step to the guarded one, each with the square of its step. It does not list the four steps.
6. **The stack at rest stands 32 pixels higher.** `insetBottomPx` in `src/constants.ts` went from 32 to 64, to keep the lowest plate clear of the legend at 1920×1080. This changes the picture at rest in every state.
7. **The legend stands on a panel of its own**, with a border, because a plate runs under it at the tier and cluster distances. While a filter is on it gains a fifth square, "Filtered out".
8. **A cluster or tier row of the outline is dimmed too**, when the filters leave none of its tools in. A dimmed row can still be chosen, and says "filtered out" to assistive technology.
9. **A filtered-out tool's name in the list above a cell takes the colour of a tag.** The ticket asks for the mark and the outline only.
10. **A faded mark can still be hovered, clicked and selected.** A selected mark keeps the selected fill.
11. **"Clear" is there only while a filter is on.**
12. **The fragment has one part for each chosen value**, as `#used=D&used=M&hosting=Hub`. A kind family has a comma in its name, so a list in one part would not read back. A value a filter does not list is dropped from a link.
13. **The filter change is a cut.** Ticket 14 gives it the 250 ms fade.
14. **`/` and `?` now work while a checkbox has the focus.**
15. **"Filter" and "Legend" are new entries in `GLOSSARY.md`.** The guide's "Map states" and "Map type" tables name the new uses. `map-faded` is now a token in `src/tokens.ts`.

#### The critique

A separate agent critiqued the new screenshots against the style guide, the Impeccable skill's heuristics and general ones. It did not run Impeccable's detector.

Fixed:

- A decision class's square stood beside its checkbox and looked like a second one. The square now stands at the right, before the number.
- The checkbox was 14 pixels, off the 4-pixel grid. It is 16, and "Committed only" starts on the line of the filter names.
- Nothing showed that the list of filters scrolls. It has a thin scroll bar, and a rule above and below.
- The legend did not explain a faded mark. It shows "Filtered out" while a filter is on.
- The legend stood off the line of the "Keys" button.
- The count had no noun. It reads "276 of 752 tools".
- "Filters" had no rule where "Outline" has one.
- "Clear" read as a label. It is underlined, as the detail card's links are.
- The number of values chosen was a filled badge, a third dark square in the row. It is a plain number.

#### After code review

Fixed: the focus outline of a checkbox row had no gap; nothing held "committed only" to 327 tools or to classes the vocabulary file has; a value's number had no unit for assistive technology; only hover text said what "Committed only" chooses; the checkbox showed its state by colour alone where the system sets the colours; the legend and the first filter had the same name for assistive technology; the glossary's "Legend" entry used a word it asks to avoid.

Left:

- **`src/data.ts` imports `passes` from `src/state.ts`.** The index answers which tools pass, so the scene, the outline, the labels and the filters share one answer. The rule for passing is the state's.
- **`Filters` and `Facets` are the same shape**: what is chosen, and what a tool has. The type checker cannot tell one from the other.
- **The legend says "Filtered out" where the guide's state is "Faded".** Ticket 11 fades tools for a lens too, and may need another word there.
- **A filter's opening row repeats the outline's**: a chevron and `aria-expanded`. The outline's `item` now takes eight values.
- **`markMaterial` and `dressSwatch` take a flag** for the faded state.
