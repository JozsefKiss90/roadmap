# 16: Accessibility review and fixes

**What to build:** The finished map is reviewed for accessibility with the design plugin, and every finding is fixed or logged. After this ticket a keyboard or screen-reader user can do everything a mouse user can, through the outline, the search and the panels, and the panels meet WCAG 2.1 AA.

The canvas itself cannot be read by a screen reader. The outline tree is its accessible equivalent, so the review checks that equivalence as well as the panels.

**Blocked by:** 14, 15, 15b

**Status:** ready-for-agent

- [x] The design plugin's accessibility review has been run on the built file and its report is attached under Comments
- [x] Every task below can be done with the keyboard alone: find a tool, read its detail card, switch on each lens, pick a role, pick a need, step phases, set and clear a filter, step out, close the card
- [x] The canvas is described to assistive technology and points to the outline as its equivalent
- [x] Selection, lens and filter changes are announced, including the resulting count
- [x] Every control has an accessible name, and focus order follows the visual order
- [x] Focus is never lost or trapped when the detail card or phase strip opens or closes
- [x] All panel text and controls meet the contrast contract and the text floor
- [x] Interactive targets in the panels are at least 24 by 24 pixels
- [x] The reduced-motion fallback from ticket 14 is confirmed in the review
- [x] Each finding is fixed, or written under Comments with the reason it stands
- [ ] The screenshot script still runs clean
- [x] The work is committed

## Comments

### 2026-11-18: reviewed, with fifteen findings fixed and seven left standing

Run `npm run build` in `framework-map/` and open `framework-map.html`. Run `npm run accessibility` to repeat the checks below. The built file is 2.81 MB of the 5 MB budget.

**One box above is not ticked**, and the status stays `ready-for-agent`: the screenshot script did not finish. The machine ran short of memory, as it did in ticket 15b, and the run was stopped at 65 of about 530 screenshots. See "What is left to do".

**No screen reader was run.** The review read what the page gives a screen reader: its roles, names, states and live regions, in Chrome's accessibility tree. What NVDA or VoiceOver says of them is still to be heard by a person. See "What is left to do".

**Ticket 15b, which blocks this one, is not closed.** Its screenshot run and its critique were still open when this ticket began. The screenshot script was started once for this ticket, on its final build, and was stopped before its end; see "What was checked".

#### How the review was made

The design plugin's accessibility review (`/design:accessibility-review`, WCAG 2.1 AA) was run on the built file of commit `15c84b3`, in four passes:

1. Every panel module and the stylesheet were read against the plugin's checklist.
2. The built file was opened in Chrome, driven by Playwright, at 1366×768, 1280×720 and 390×844 with touch, and without WebGL. In each state the accessibility tree was saved, the Tab order was walked, and every piece of text and every control was measured: contrast against the surface under it, size, and the control's width and height.
3. The same was done with the text spacing of WCAG 1.4.12, at 683×384 and 640×360, which are 1366×768 and 1280×720 with the page zoomed to 200%, and at 320 pixels wide.
4. Each task of this ticket was done with the keyboard alone, and the keyboard focus was read after each step.

The passes are now one script, `scripts/accessibility-check.mjs`, so the review can be repeated on any build.

#### Accessibility audit: the framework map

**Standard:** WCAG 2.1 AA, and the 24-pixel target of this ticket | **Date:** 2026-11-18 | **Build reviewed:** `15c84b3`

**Issues found:** 22 | **Critical:** 0 | **Major:** 6 | **Minor:** 16 | **Fixed:** 15 | **Left standing:** 7

No finding stopped a keyboard user from doing a task. The major ones kept a screen-reader user from hearing what a lens or a filter had done, hid the fallback page's tier names, left no way to switch off the single keys, and in one case lost the keyboard focus.

**Perceivable**

| # | Issue | WCAG criterion | Severity | Outcome |
| --- | --- | --- | --- | --- |
| 1 | The canvas was described as an image, and nothing told a screen-reader user that the outline holds the same tiers, clusters and tools | 1.1.1 Non-text content | Major | Fixed. The description now says the picture cannot be read and names the outline, and `aria-details` points to it, or to the icon that opens it while the rail stands as icons |
| 2 | On the fallback page the static picture was one image, `role="img"`. An image hides what it holds, so each tier's count and name, which ticket 15b made text of the page, were hidden from a screen reader | 1.3.1 Info and relationships | Major | Fixed. The picture is a named group; the drawings of the plates are hidden one by one |
| 3 | With the text spacing a partner may set, the role names in the lens switch were cut ("Analys"), and the counts of a phase step ran out of the step ("122 tool") | 1.4.12 Text spacing | Minor | Fixed. The switch's height is a least height, and the two counts break between them |
| 4 | A tier's or a cluster's row in the outline that the filters leave empty differs from the others by colour alone: `soft` against `ink`, 2.69 to 1 | 1.4.1 Use of colour | Minor | Stands. See "Left standing", 1 |
| 5 | The hover label cannot be dismissed without moving the pointer, and the pointer cannot be moved onto it | 1.4.13 Content on hover | Minor | Stands. See "Left standing", 2 |
| 6 | A window 320 pixels wide, which is 1280 pixels at 400% zoom, is under the smallest supported size | 1.4.10 Reflow | Minor | Stands. See "Left standing", 3 |
| 7 | The names on the canvas are drawn, not text of the page: text spacing and a screen reader do not reach them | 1.4.5 Images of text | Minor | Stands. See "Left standing", 4 |

**Operable**

| # | Issue | WCAG criterion | Severity | Outcome |
| --- | --- | --- | --- | --- |
| 8 | `/`, `?` and `1` to `4` act anywhere with no other key held, and could not be switched off. A partner who speaks to the computer can set them off without meaning to | 2.1.4 Character key shortcuts, level A | Major | Fixed. The list of keys has a switch for them |
| 9 | The chevron of an outline row, which opens and closes the row apart from choosing it, was 16 by 16 pixels | 24-pixel target | Minor | Fixed: 24 by 24 |
| 10 | A link in the detail card was 20 pixels high | 24-pixel target | Minor | Fixed: 24 |
| 11 | A name in the detail card that selects what it names was 20 pixels high where it fits one line | 24-pixel target | Minor | Fixed: 24 |
| 12 | The search input was 20 pixels high inside its 36-pixel field. A click in the field above or below it did not land | 24-pixel target | Minor | Fixed: the input is as tall as its field |
| 13 | In a window under 1,024 pixels with a mouse, the tier's crumb gave way to 16 pixels wide, and its ellipsis lay over the separator | 24-pixel target | Minor | Fixed: a crumb keeps 24 pixels |
| 14 | Escape does not close the rail where it lies open over the canvas | No criterion; a common expectation | Minor | Stands. See "Left standing", 5 |
| 15 | Orbiting and changing the camera's distance are for the pointer alone | 2.1.1 Keyboard | Minor | Stands. See "Left standing", 6 |
| 16 | With the focus on a row of the outline or on a filter, the key `3` brought back the last need trace, the outline and the filters folded, and the focus went with what they held | 2.4.3 Focus order | Major | Fixed. The focus goes to the heading of the part that folded. The code review found it |

**Understandable**

| # | Issue | WCAG criterion | Severity | Outcome |
| --- | --- | --- | --- | --- |
| 17 | The repository link and "Open the tool matrix" open a new tab, and only the arrow said so | 3.2.5 Change on request, level AAA | Minor | Fixed. Both say "(opens in a new tab)" to assistive technology |

**Robust**

| # | Issue | WCAG criterion | Severity | Outcome |
| --- | --- | --- | --- | --- |
| 18 | A change of lens or of filters was announced by the count at the head of the filters. That count is not drawn while the rail stands as icons, so below 1,366 pixels the change was not announced at all | 4.1.3 Status messages | Major | Fixed. The one live region of `src/announcer.ts` says it, in every page layout |
| 19 | Where it was announced, the announcement gave the count and not the lens. "Lens off" and "the need trace waits for a need" changed no count, so nothing was said | 4.1.3 Status messages | Major | Fixed. A lens that comes on or goes off is named |
| 20 | A need traced with nothing selected, as from the key `3` or a link, was not announced | 4.1.3 Status messages | Minor | Fixed |
| 21 | The message shown when the map cannot be drawn was not announced | 4.1.3 Status messages | Minor | Fixed: `role="alert"` |
| 22 | No screen reader has read the page | 4.1.2 Name, role, value | Minor | Stands. See "What is left to do" |

**Colour contrast.** Measured in the page, text colour against the surface under it. Nothing fell short.

| Element | Foreground | Background | Ratio | Required | Pass |
| --- | --- | --- | --- | --- | --- |
| Names and body text | `ink` | `paper` | 14.19:1 | 4.5:1 | Yes |
| The same on a lit row | `ink` | `paper-2` | 12.84:1 | 4.5:1 | Yes |
| Tags, counts, notes, the placeholder | `muted` | `paper` | 6.57:1 | 4.5:1 | Yes |
| The same on a lit row | `muted` | `paper-2` | 5.94:1 | 4.5:1 | Yes |
| The selected row's name, the traced need | `accent` | `paper-2` | 5.33:1 | 4.5:1 | Yes |
| A dimmed row of the outline | `soft` | `paper` | 5.27:1 | 4.5:1 | Yes |
| The same under the pointer | `soft` | `paper-2` | 4.77:1 | 4.5:1 | Yes |
| The chosen lens, the "Architect's decision" pill | `paper` | `ink` | 14.19:1 | 4.5:1 | Yes |
| The focus outline | `accent` | `paper` | 5.89:1 | 3:1 | Yes |
| The edge of a field, a checkbox, a control in segments | `soft` | `paper` | 5.27:1 | 3:1 | Yes |

The least text ratio measured in any state was 5.27:1; the two rows on a lit row under the pointer are the style guide's own figures. The smallest text was 11 pixels, in the mono face of counts and tags; no name was under 12. The marks, lines and names of the canvas are held to the style guide's contrast rows, which `npm run contrast` checks: 28 rows, no findings.

**Keyboard**

| Element | Tab order | Enter or Space | Escape | Arrow keys |
| --- | --- | --- | --- | --- |
| Search box | 1 | Enter chooses the result, and the focus goes to the card's name | Clears the search | Up and Down go through the results |
| Lens switch, then the roles | 2, 3 | Space chooses | Steps out | Left and Right switch the lens or the role |
| Need list, while a trace or the scrub is on | After the lens switch | Traces the need and opens its card | Steps out | None |
| "Filters" heading | Next | Folds or opens the filters | Steps out | None |
| "Committed only", "Clear", each filter and its values | Next | Space sets a value; Enter opens a filter | Steps out | None |
| "Outline" heading | Next | Folds or opens the outline | Steps out | None |
| Outline | One stop, at the row it last stood on | Chooses the row | Closes the card, then steps out | Up, Down, Left, Right, Home, End |
| "Keys" button | Next | Opens the list of keys | Closes the list | None |
| Breadcrumb | After the rail | Goes to the stack, the tier or the cluster | Steps out | None |
| Detail card | After the breadcrumb | Follows a row or a link; closes with its button | Closes the card; the focus goes to the outline | The card scrolls |
| Phase strip | Last | Space chooses | Steps out | Left and Right step the phase |
| Rail as icons, below 1,366 pixels | First, in place of the rail | Opens the rail, or the icon's own part | Steps out; it does not close the rail | None |
| List of keys | The focus is kept inside it | Space sets the switch | Closes it; the focus comes back | The list scrolls |

- The focus is drawn at every stop, with the 2-pixel `accent` outline.
- The order is the rail from top to foot, then the breadcrumb, the detail card and the phase strip. It follows the page from left to right and from top to bottom.
- Tab is trapped nowhere but in the list of keys, which is a dialog and gives the focus back.
- The focus is not lost when the detail card or the phase strip closes. It goes to the outline, to the need list or to the lens switch, and where the rail stands as icons, to the icon of that part.
- The focus is not lost when the filters or the outline fold under it. It goes to their heading.

**Screen reader.** Read from the accessibility tree, not heard.

| Element | Announced as | Issue |
| --- | --- | --- |
| Canvas | Image, "The eight tiers of the Hermes OS tool framework as a stack of plates… The outline lists the same tiers, clusters and tools, and stays in step with it." | None now |
| Search box | Combobox, "Search tools, clusters and needs", with a list of options in groups; "Found 12 tools, 1 cluster." | None |
| Lens switch | Radio group "Lens": None, Role, Need, Phase | None |
| A filter | Button "Hosting, 1 chosen", expanded; checkboxes "Hub 552 tools" | None |
| Outline | Tree "Tiers, clusters and tools"; a row is "4A, Engineering graph and code intelligence, 0 of 9 tools in reach, out of reach", level 2 | None |
| Detail card | Complementary, "Tool: Serena", with a level-2 heading and level-3 headings for its parts | None |
| Phase strip | Radio group "Roadmap phase": "P2 10 needs · 92 tools" | None |
| Legend | Region "Legend: the decision-class steps", a list | None |
| A change | See the README, "Accessibility", for each sentence | None now |

**Reduced motion.** The fallback of ticket 14 is confirmed. With the setting on, nothing was under way one frame after any key: no flight, no fade, no panel. The stylesheet has no transition and no animation at all, so nothing can move outside the motion module.

#### Left standing

1. **A tier's or a cluster's row that the filters leave empty is dimmed by colour alone.** A tool's row has its square too, which fades from solid to pale. Under a lens the row's count goes to 0. A screen reader hears "filtered out". What is missing is a sign that is not colour for a tier or a cluster under the filters alone. The style guide's "Faded" state sets the row's text in `soft`, and the count of a row means "in reach", by ticket 11. A fix changes one of the two, which is the Architect's to decide.
2. **The hover label** is part of the picture, and is hidden from assistive technology. A click on the mark opens the detail card, which gives the name and stays. The outline gives it too. A label that stayed until Escape would lie over the marks beside it.
3. **320 pixels wide.** The spec's smallest size is 360×640. At 320 the map still opens in the upright layout, no panel runs out of the window and the page does not scroll sideways. It is not checked by any script. WCAG excepts content that needs two dimensions, as a map does.
4. **The names on the canvas are drawn by WebGL.** The outline, the detail card and the search give every name as text.
5. **Escape does not close the open rail.** An earlier ticket decided it, and the README records it: "Escape keeps its own meaning and does not close it." The rail closes with its button, which is the first stop inside it, and when the focus leaves it. So the focus is not trapped. A keyboard user who opens the outline in a small window, chooses a tool and presses Escape closes the card behind the rail, and the rail stays. The review would have Escape close the rail first. It is left because it changes a decision, the list of keys and the spec's line on Escape.
6. **The camera has no keys.** The spec says so: "There are no camera keys." Nothing can be reached only by orbiting: the breadcrumb, the outline and the search go to every distance, tier, cluster and tool.
7. **No screen reader has read the page.** See below.

#### What is left to do

1. **Run `npm run screenshots` on the final build**, with the machine's memory free, and tick the box. It is the same run ticket 15b waits on. It now counts the chevron of an outline row as a control, at 44 pixels on a touch screen.
2. **Read the map with NVDA on Windows, or VoiceOver on a Mac**, in Chrome or Edge. Listen for three things the tree cannot show: whether the tree's rows are read with their level and their count, whether a change of lens is heard once and not twice, and whether `aria-details` on the canvas is offered.
3. Ticket 15b's critique of its screenshots, and its real-phone check, are still open there.

#### What was checked, and on which build

On the final build:

- 457 unit tests and the generator's 23 pass, and the type check is clean. 34 unit tests are new: what the map says of each change, the switch for the single keys, and the script's check on text.
- `npm run accessibility` passes every one of its checks. It is new. At 1366×768 it does every task of this ticket with the keyboard alone: it finds a tool with the search, reads its card, closes it, switches on each lens with its key and again from the lens switch, picks a role and a need, steps the phases, sets and clears a filter, goes through the outline, steps out, and closes the card with its button. After each step it reads the live region and the keyboard focus. It walks the Tab order with every panel open. In twenty-three states it checks every control's name, the contrast and the size of every piece of text, and the 24 pixels of every control. It repeats the tasks at 1280×720, 683×384 and 390×844, where the rail stands as icons. It checks a part of the rail that folds under the focus, the 44 pixels of every control on a touch screen with the outline on show, reduced motion, wider text spacing, the switch for the single keys and the fallback page.
- `npm run touch` passes every one of its checks, as before.
- The screenshot script did not finish. It was started once on the final build and stopped at 65 of about 530 screenshots, when the machine ran short of memory. It had saved the stack at rest, one tier and one cluster at all ten sizes, with reduced motion off and on, and a selected tool at the two phone sizes, and had found no fault: no console error, no panel or label out of place, no control under 44 pixels on touch. The accessibility script and the touch check, which did finish, check the page is no wider than its window and that nothing moves with reduced motion on, at the sizes they open.

#### Decisions for the Architect

1. **The single keys can be switched off, in the list of keys.** WCAG 2.1 asks for it at level A. The browser keeps the switch, in its local storage. That is the first thing the map keeps in the browser. It is no part of a link.
2. **One live region says every change.** The count at the head of the filters is no live region now. It still shows the count, and reads why to a partner who goes to it.
3. **The sentences** are in the README, under "Accessibility". A lens that comes on is named. A step to another role or phase is said by its count alone, because the control that was stepped says its own name.
4. **`scripts/accessibility-check.mjs` and `npm run accessibility` are new**, with unit tests at `src/announcer.ts`, `src/single-keys.ts` and `scripts/text-faults.mjs`. They are pure functions, as ticket 15b's were. Strike any the Architect does not want.
5. **The screenshot script's reader of controls moved** to `scripts/read-controls.mjs`, which both scripts use.
6. **A segment of the lens switch and a step of the phase strip may take a second line**, where a partner sets wider letter spacing or a strip is squeezed. Each of the two counts of a step stays whole.
7. **One new entry in `GLOSSARY.md`**: single keys.
8. **Escape and the open rail.** See "Left standing", 5. The review recommends that Escape close the rail first.
9. **A dimmed tier or cluster row.** See "Left standing", 1.
10. **The icons of the rail are named "Search" and "Keys"**, where they were "Search (key /)" and "Keys (key ?)". The key is in the text shown on hover and in `aria-keyshortcuts` while the single keys are on, and in neither while they are off.
11. **The chevron of an outline row is 44 pixels on a touch screen.** Ticket 15b asked for 44 pixels of every control there. The chevron was 16, and the screenshot script did not count it as a control. It does now.

#### Found on the way

- **Words kept for assistive technology at the foot of a card that scrolls made the page taller than its window**, and the outline's scroll to its row then pulled the whole page up by 181 pixels. It came in with the fix for finding 17 and went out with it: the words now lie inside their link. The accessibility script fails if the page is taller than its window or has scrolled.
- **The outline's one Tab stop is the row it last stood on**, also after the map has gone back to the stack. That is the roving stop of a tree, and is left.

#### After code review

Two reviews ran on the uncommitted work, one against the standards and one against this ticket.

Fixed:

- The focus was lost when a need trace came back under it; see finding 16.
- The announcer compared the filters by the object that held them, not by what they hold. A link read anew makes a new object, so a move with filters on was announced as a count.
- A need chosen from the need list under filters was announced without what the filters leave of its trace.
- Two changes that make the same sentence, as two filters that leave the same number of tools, wrote the same text twice, which a screen reader may say once. Each sentence now goes in as a new element.
- With the single keys off, the icons and the lens switch still named their keys on hover and to assistive technology.
- The canvas pointed to an outline that is not drawn while the rail stands as icons.
- The check on text took 19 pixels in bold for large text at weight 700. The style guide's contrast contract says 600.
- The chevron was called a control and was not 44 pixels on touch; see decision 11.
- "Its detail card is open." was added outside the function the tests reach. It is inside it now.
- The check on text measures the contrast itself, in a function with tests, from the two colours the page gives it.
- The three browser scripts each had their own copy of where the built file is, the wait for the map to rest and the stand-in for no WebGL. They share `scripts/check-page.mjs`.
- The list of keys set an attribute on the `<html>` element. `src/panels.ts` does that now, and the list only shows the switch and sets it.

Left:

- **`reasonsAtFullStrength` is in `src/announcer.ts`, and the filters' panel imports it from there.** Both say why the tools at full strength are the ones they are. `src/display.ts` knows nothing of the graph's index, which the function needs.
- **The single keys are named in four places**: the set in `src/single-keys.ts`, the keys' own handler in `src/panels.ts`, the rows of the list of keys, and the switch's label.
- **`mono` stands for "a count or a tag"** in the check on text. The mono face is what the style guide sets them in.
- **The script works out which colour lies under a piece of text in the page**, and that part has no test. A gradient or a picture behind text would be read wrongly; the map has neither.
- **The single-keys switch and `npm run accessibility` are more than the spec's keyboard line asks.** Both reviews said so. See decisions 1 and 4.
