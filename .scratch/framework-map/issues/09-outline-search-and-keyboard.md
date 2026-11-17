# 09: Outline, search and keyboard

**What to build:** A partner can reach every tool without the mouse. The left rail holds an outline of tiers, clusters and tools that stays in step with the selection, and a search box finds any tool, cluster or need by a remembered word and flies to it.

The outline is the accessible equivalent of the canvas: everything the canvas can do must be reachable through the outline, the search and the panels. Search uses MiniSearch over tool names and capabilities, cluster names and need names.

**Blocked by:** 08

**Status:** ready-for-human

- [x] The left rail (240 pixels) shows an outline tree of 8 tiers, 55 clusters and 752 tools, with clusters collapsed by default
- [x] Selecting a row in the outline selects it on the map and flies to it; selecting on the map expands and highlights the matching row
- [x] The outline is exposed to assistive technology as a tree; arrow keys move within it and Enter selects
- [x] Selection changes are announced to assistive technology
- [x] Typing in the search box lists results grouped as tools, clusters and needs
- [x] Search matches on tool capability text as well as names, and tolerates a small typo
- [x] Choosing a result flies to it and opens its detail card
- [x] `/` focuses the search box; `?` shows the list of keys
- [x] Keyboard focus is always visible, using the focus outline from the style guide
- [x] A partner can go from opening the file to reading a chosen tool's detail card using the keyboard alone
- [x] Search tests cover a name match, a capability match and a no-result query
- [x] The critique has run on new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.64 MB of the 5 MB budget. Press `/`, type `retreival language servers` (with the typo) and press Enter.

#### What was checked

- 210 unit tests and the generator's 23 pass. Eight new tests cover the search: a name match, a capability match, the three groups, a typo, a word's first letters, a query of two words, the order of name and capability matches, and a query that finds nothing. Others cover the cap on a tool name's width and a label under the rail.
- The screenshot script runs clean on eleven states at both sizes. The new ones are "search-results", "search-no-result", "outline-keyboard-focus" and "key-list". A state can now list keys to press and text to type. The script also fails if a label runs under the rail.
- A headless run used the keyboard alone at 1366×768. It searched with a typo, chose the result and read the detail card's name with the focus on it. It then walked the outline to a tool with the arrow keys and selected it, opened and closed the list of keys, and closed the card with Escape. The focus outline was drawn at every step, the announcement followed every selection, and there was no console error.
- The outline and the keys have no unit tests. The spec agrees three seams for unit tests, and the ticket adds the search. The headless run and the screenshot states check the rest.

#### Decisions for the Architect

1. **The plates stand further apart.** `plateSpacing` in `src/layout.ts` went from 5 to 6.5. The rail leaves the stack 814 pixels of a 1366-pixel window, where it had 1,030, and at that size the two-line tier names ran into each other. This changes the picture at every distance.
2. **A long tool name is cut short with an ellipsis** in the list above a cell, where the list would not fit between the rail and the open detail card. Only 1A needs it, with a tool selected, below about 1,480 pixels of width. The outline, the hover label and the detail card give the name in full.
3. **The title is in the rail**, on two lines at its tuned size of 28 pixels.
4. **Tiers start open and clusters closed.** The outline opens with 63 rows. A cluster's tool rows are made when it is first opened.
5. **A tier row goes to its tier and selects nothing**, as a click on a plate does. A cluster or tool row selects it.
6. **The focused cluster's row is opened**, selected or not, because its tools are named on the canvas. With nothing selected, the row for the focused tier or cluster is marked as the place, in a heavier weight and not in the accent.
7. **Enter in the outline leaves the focus in the outline**, so the arrow keys go on. Choosing a search result puts the focus on the detail card's name. The announcement says that the detail card is open.
8. **When Escape closes a detail card that holds the focus, the focus goes to the outline**, at the row for where the map is.
9. **The search does more than the ticket lists.** A word matches from its first letters. Every word of the query must match. A match on a name ranks above a match on a capability. A typo is one wrong letter in five.
10. **The results open over the canvas, 400 pixels wide**, so a tool's capability fits on a line under its name. A group lists its best 20 tools, or 8 clusters or needs, and the heading gives the number found.
11. **Choosing a need opens its detail card and leaves the map where it is**, as ticket 08 decided for a need. Ticket 12 frames its trace.
12. **The announcer also says where the map has gone** when nothing is selected, and the search says how many results it found.
13. **A "Keys" button stands at the foot of the rail**, for a partner who does not know `?`. The outline also takes Home, End and Space.
14. **One CSS rule draws the focus outline** on whatever holds the keyboard focus. The detail card's name shows it when the focus arrives by keyboard.
15. **The breadcrumb is centred on the canvas**, the room right of the rail.
16. **The cluster form of the detail card lists its tools in the order of the cell's grid**, the layout's own function. It used a second copy of that order.
17. **"Rail" and "Outline" are new entries in `GLOSSARY.md`.** The guide's "Map type" table gains `map-rail-row` and `map-key`.

#### The critique

A separate agent critiqued the new screenshots against the style guide and general heuristics. It did not read the Impeccable skill.

Fixed:

- The row the outline follows the map to stood on the last line of the tree, with the rows under it out of view. A tier or cluster now goes to the top, and a tool out of view to the middle.
- Rows were cut mid-letter under the "Outline" heading. A rule under the heading is now the edge they scroll under.
- The results listed 8 of 12 tools with no way to reach the rest.
- Rows of the outline, the results and the "Keys" button were off the 4-pixel grid, and a tool's square stood 2 pixels off the cluster tag above it.
- The breadcrumb was centred on the window, not on the canvas.
- The selected row's bar bent round the row's corners.
- The results had a soft shadow, which the guide has no token for.
- The "nothing matches" message was 400 pixels wide and covered the top of the outline.
- Nothing marked the focused tier or cluster in the outline.
- The key column of the list of keys was wider than its keys.

Not fixed:

- **A cluster's code stands at the right of a tool's result and at the left of a cluster's own.** The left is what the result is, and the right is where it is.

#### After code review

Fixed: the list of keys' backdrop had a colour that was not read from a token; a click on the dialog's own border closed it; the search said its list was open when it had found nothing; the list of tool names could keep a room that changed while it was being typeset; a cut name could split a character; the guide's tables did not name the outline's use of `map-text-selected` or the type of the keys.

Left:

- **Once names are cut, dragging the window's edge sets the list again at each step**, and it is not on show until it is typeset. Only 1A with a tool selected is affected.
- **`insetLeftPx` (512) holds the rail's 240 pixels.** A change to `railPx` needs the same change there.
- **Names in the code use "item", "group" and "entry"**, which the glossary asks to avoid for a tool and a cluster. Here they name tree rows, sets of results and index records.
- **The Lucide icon is set up the same way in four panels**, and the tool, cluster and need cases are told apart in three.
