# 11: Role lens

**What to build:** A partner switches on the role lens for the Architect, Designer or Analyst and sees the tools that role uses brought forward across all eight tiers, with everything else faded in place. This answers "what is in my reach".

The role lens means "used by" only; "operated by" stays a filter. One role is shown at a time. Tools shared with other roles look the same as the role's other tools; the detail card lists who else uses them. This ticket also adds the lens switch, since the role lens is the first lens. Only one lens is active at a time, and filters apply on top of it.

**Blocked by:** 08

**Status:** ready-for-human

- [x] A lens switch in the left rail offers no lens and the role lens; later lenses add to it
- [x] With the role lens on, a partner picks one of the three roles
- [x] Tools the chosen role uses keep their decision-class form at full strength; all other tools take the faded state; nothing moves
- [x] The number of tools in reach for the chosen role is shown
- [x] Each tier's count reflects the tools in reach on that plate while the lens is on
- [x] The detail card of a tool lists every role that uses it
- [x] The lens and its role are recorded in the URL fragment and restored from it
- [x] Keys `1` and `2` switch between no lens and the role lens
- [x] If filters from ticket 10 are present, they apply on top of the lens
- [x] State tests cover each role, switching role, switching the lens off, and the URL round trip
- [x] A "Designer role lens" state is in the screenshot script and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.65 MB of the 5 MB budget. Press `2`, then choose Designer under "Lens". The count reads "269 tools in reach", and T3 reads "T3 · 87 of 154 in reach".

#### What was checked

- 264 unit tests and the generator's 23 pass. The new state tests cover each of the three roles, a tool a role operates but does not use, switching role, switching the lens off, the filters on top of the lens, and the URL round trip. New data tests cover the tools in reach, the tools at full strength under a lens and the filters, and a tier's count in reach.
- The screenshot script runs clean on fifteen states at both sizes. The new ones are "designer-role-lens" (the whole stack) and "role-lens-filtered-cluster" (the Designer's lens close in on 4G, with "committed only" on top).
- A headless run drove the lens with the keyboard and the mouse at 1366×768. The numbers in reach were 689 for the Architect, 269 for the Designer and 391 for the Analyst. With the Analyst's lens and "committed only", 158 tools were at full strength. The URL fragment followed every step, a link restored the lens beside a selection and a filter, Escape kept the lens, and a link with a role the graph lacks opened with no lens. There was no console error.
- The detail card already listed every role that uses a tool, in its "Used by" line, since ticket 08. This ticket changed nothing there.
- The lens panel, the legend and the outline's counts have no unit tests. The spec agrees three seams for unit tests. The headless run and the screenshot states check the rest.

#### Decisions for the Architect

1. **The count at the head of the filters now gives the tools at full strength**: in reach and passing the filters. With the Designer's lens and no filter it reads "269 of 752 tools", the same number as the lens. Ticket 10 defined it for the filters alone.
2. **The number in reach and the tiers' counts ignore the filters.** In the second screenshot state, the row for 4G reads 16 while "committed only" leaves 11 of them at full strength. The count at the head of the filters is the only number that takes both in.
3. **The role lens comes back with the role it last showed.** `2`, or "Role" in the switch, starts with the Architect and afterwards returns to the last role. The store remembers it. It is no part of the state or of a link.
4. **The fragment is `#lens=role&role=D`.** `lens=role` alone gives the first role. A role or a lens the graph lacks gives no lens, and the rest of the link holds.
5. **The switch is two rows**: "None | Role", and under it "Architect | Designer | Analyst" while the role lens is on. The one filled segment is the lens that is on. "None" and the chosen role are shown by a ring.
6. **The rail is crowded at 768 pixels of height.** With the role lens on and every filter closed, the outline has about 150 pixels, which is two tier rows of three lines. The filters now take at most 40% of the rail's height, where ticket 10 gave them half. One row, "None | Architect | Designer | Analyst", would save 36 pixels until the later lenses arrive.
7. **A tier's count on the canvas reads "T3 · 87 of 154 in reach"** while the lens is on. The outline's tier and cluster rows show the number in reach alone, and say "87 of 154 tools in reach" to assistive technology.
8. **A tier with no tool in reach has its name in the colour of a tag** on the canvas, as its row in the outline is dimmed. The ticket asks for the count only.
9. **The legend's faded square is named for what fades**: "Out of reach" for a lens, "Filtered out" for the filters, "Out of reach or filtered out" for both. A rule sets it apart from the four steps. The later lenses may need one shorter word.
10. **A dimmed row of the outline is named for what leaves it out**: "out of reach" where none of its tools is in reach, and otherwise "filtered out".
11. **The count at the head of the filters is the one live region for a change of lens.** It says, for example, "269 of 752 tools are in reach of the Designer, no filter chosen". The number beside "Lens" is shown only.
12. **`1` and `2` work while a checkbox or a segment has the focus.** If `1` closes the row of roles while it holds the focus, the focus goes to the lens switch.
13. **The lens change is a cut.** Ticket 14 gives it the 250 ms fade.
14. **"Reach" and "Emphasised" are new entries in `GLOSSARY.md`.** The guide's "Map tokens" and "Map type" tables name the new uses.

#### The critique

A separate agent critiqued the new screenshots against the style guide, the Impeccable skill's heuristics and general ones. It did not run Impeccable's detector.

Fixed:

- A tier's count gave the number in reach with no total. It reads "87 of 154 in reach".
- "None" was a filled block at rest, the heaviest thing in the rail, and with the lens on two filled segments stood one over the other. Only the lens that is on is filled now.
- The legend's faded square stood among the four steps as a fifth decision class. A rule sets it apart.
- A tier with nothing in reach kept its name at full strength on the canvas while its row in the outline was dimmed.
- A dimmed row was named "out of reach or filtered out" whenever both were on, whichever applied to it.
- Where the system sets the colours, the focus outline of a chosen segment kept the map's blue.
- The segments gave no sign of their keys. Each has hover text: "Role (key 2)".

Left:

- **The outline has little room at 768 pixels of height.** It is decision 6.
- **An optional mark in reach is hard to tell from a faded mark at 1366×768.** Both are a pale square with a thin outline, about 10 by 5 pixels. The guide's second exception lets a faded mark sit below 3:1. At 1920×1080 the two read apart.
- **The outline's counts show no total.** The rail has no room for "14/33" beside a three-line name.

#### After code review

Fixed: a segment's padding was 3 pixels, off the 4-pixel grid; the focus fell to the page when `1` closed the row of roles; two live regions spoke on every change of lens; the per-role state test could not tell the Architect from the Designer; the outline handed `fadedName` values its parameters did not name; a row with no tools would have been named "out of reach" with no lens on; `emphasised` and the wider sense of "reach" were not in the glossary; three variables had stale names.

Left:

- **The store remembers the last role outside the state.** It is decision 3. The head of `src/state.ts` now says so.
- **Four modules ask the same question**, "did the filters or the lens change", each in its own subscriber. Each later lens touches them all.
- **`toolCountOf` takes an optional lens**, and so gives two counts from one method.
- **`src/data.ts` keeps two one-answer caches**, for the tools in reach and the tools at full strength.
- **The outline's `item` takes nine values.** Ticket 10 left it at eight.
- **A role is a `string` in `RoleLens`**, and "none" in the switch is no part of the `Lens` type.
