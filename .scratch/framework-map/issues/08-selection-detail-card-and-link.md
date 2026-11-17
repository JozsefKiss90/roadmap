# 08: Selection, detail card and shareable link

**What to build:** A partner can hover a mark to see its name, select a tool, cluster or need, and read everything about it in the detail card docked on the right. Copying the address reopens the same selection for another partner who holds the same file.

The detail card is 360 pixels wide and has three forms:

- **Tool:** name, kind, capability, decision class and whether the decision is the Architect's or "Proposed here", used by, operated by, hosting, value stream, gate, the needs it serves, overlap group members, repository link, stars, last commit, licence, verification, note, and a link to the tool matrix.
- **Cluster:** tier, cluster attributes, and its tools as a list.
- **Need:** verdict, phase, lead role, approach, gap, best-fit tools.

Selecting an internal skill or subagent that implements a higher cluster draws a line to that cluster's cell; selecting such a cluster draws lines to the tools that implement it. Panels and scene never call each other; both go through the state store.

**Blocked by:** 07

**Status:** ready-for-human

- [x] Hovering a mark shows the tool's name and cluster, and an `ink` ring on the mark
- [x] Clicking a mark selects the tool, gives it the `accent` fill, flies to it and opens the tool form of the detail card
- [x] The tool form shows every field listed above, and omits a field cleanly when the tool has no value for it (for example no repository)
- [x] A tool whose decision source is "Proposed here" is visibly distinguished from one decided by the Architect
- [x] Clicking a tool in a cluster's list, or an overlap group member, selects that tool
- [x] Selecting a cluster opens the cluster form; a need reached from a tool's card opens the need form
- [x] `implements` lines appear for a selected internal skill and for a selected target cluster, and disappear when the selection changes
- [x] The detail card is absent when nothing is selected, and Escape closes it before it steps out a distance
- [x] The URL fragment records the selection and the focused tier or cluster, and updates as they change
- [x] Opening the file with a fragment restores that state; an unknown id in the fragment falls back to the stack at rest without an error
- [x] State tests cover selection changes and a round trip through the URL fragment
- [x] The panels use plain DOM and Lucide icons, built with frontend-design, and meet the style guide
- [x] A "tool selected" state is in the screenshot script and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.60 MB of the 5 MB budget. Try `#cluster=4A&select=tool:serena`.

#### What was checked

- 197 unit tests and the generator's 23 pass. New tests cover selecting a tool, a cluster and a need, dropping the selection, the order of Escape, and the round trip through the URL fragment. Others cover the lookups the detail card reads and the mark under a ray.
- The screenshot script runs clean on seven states at both sizes. The new ones are "tool-selected", "internal-skill-selected", "cluster-selected" and "need-selected". It now also fails if a label runs under the open detail card.
- A headless run hovered a mark at the stack and cluster distances, clicked a mark, a cell, a cluster name, a tool name and rows of the detail card, pressed Escape three times and used the close button. It then opened fragments with unknown ids. The address followed every step, and there was no console error.

#### Decisions for the Architect

1. **The fragment holds the selection as `select=<id>`**, beside `tier=` or `cluster=`. An unknown id anywhere in it opens the stack at rest.
2. **Selecting a tool or a cluster goes to that cluster.** Selecting a need leaves the map where it is, because a need has no place in the stack. Ticket 12 frames its trace.
3. **Going somewhere else drops the selection.** The breadcrumb, a click on another plate and a step out all close the detail card.
4. **A click on a cell or a cluster name now selects the cluster**, so the cluster form opens on every drill-down. Escape closes it and stays at the cluster distance. The breadcrumb still goes to a cluster without selecting it.
5. **A mark takes clicks only on the focused plate.** From the stack, a click still goes to the tier, as ticket 07 decided. Hover names the tool at every distance, so at the stack distance the hover label names a tool that the click does not select.
6. **On the focused plate, a mark selects its tool and the rest of the cell selects its cluster.** At the tier distance most of a cell is marks, so the cluster name is the easier target.
7. **A tool name in the list above a cell also selects its tool.** The ticket did not ask for this.
8. **The camera keeps clear of the open detail card** at the tier and cluster distances. Opening or closing the card flies the camera, which resets the partner's angle. At the stack distance the card covers the right of the stack.
9. **A new token, `map-selected-cell`** (2px `accent` outline), is in the style guide with a contrast row. It outlines a selected cluster's cell. The critique found that a selected cluster showed nothing in the scene. The guide's "Map type" table also gains `map-card-name` and `map-card-body`.
10. **"Hermes catalogue" as a decision source is shown as "Architect's decision".** "Proposed here" is an outlined pill, and the Architect's is a filled one. The data has only these two sources.
11. **The card shows more than the ticket lists.** The tool form adds the tool's cluster and tier, the clusters it implements, the decision step beside the decision class, the overlap group's name and a "Best fit" tag on a need. The cluster form adds "Implemented by". The need form adds the need's domain.
12. **Hosting "n/a" is left out as no value. Gate "None" is shown**, because it is a value of the vocabulary file.
13. **The link to the tool matrix leads to `Hermes OS tool matrix.xlsx` beside the map's file** (`toolMatrixHref` in `src/constants.ts`). It is dead for a partner who holds the map alone. Ticket 18 checks the link.
14. **The detail card appears without a transition.** The guide gives panels 200 ms; ticket 14 owns motion.
15. **"Hover label" and "Overlap group" are new entries in `GLOSSARY.md`.**

#### The critique

A separate agent critiqued the new screenshots against the style guide, then by Impeccable and general heuristics applied by hand.

Fixed:

- A selected cluster's cell is outlined.
- An `implements` line meets its cell at the middle of an edge, not on a mark.
- The "Proposed here" pill no longer has the dashed form of the guarded step, and its note names the decision class.
- Section headings are heavier than field labels.
- The tool's attributes have their own heading.
- The tool form names the tool's cluster and tier.
- Rows that select something are underlined at rest.
- The hover label stands above the pointer, clear of the neighbouring marks.
- Sizes and gaps in the new styles are on the 4px grid.

Not fixed:

- **The far end of an `implements` line is hard to see.** Every internal skill is on T1 and most of the clusters they implement are on T2 to T6. From a selected skill, the line rises to a faded plate and usually leaves the picture or runs under the detail card. From a selected cluster, the lines run down to marks that lie under other plates. The detail card lists the same clusters and tools, and each row goes there. Ticket 12 draws `serves` lines across tiers and frames them, and the same framing would serve here.
- **The selected tool's name is not marked in the list above its cell.** The mark and the detail card show the selection. Ticket 09's outline tree will show it too.
- **The hover label repeats the cluster's name at the cluster distance**, where the breadcrumb already gives it. The ticket asks for the name and the cluster.

#### After code review

Fixed: a mark selected by a link kept its accent fill after the detail card was closed; the hover label could slide under the open detail card; writing the fragment changed `%3A` in parts the store does not own; the planned and optional squares lost their `paper` fill on a lit row.

Left:

- **The decision squares in the detail card are styled in CSS**, not read from the mark tokens, so a change to a mark token needs the same change in `src/styles.css`.
- **`src/scene.ts` now also draws the hover ring, the selection and the `implements` lines.** It is a candidate to split before the lenses arrive.
- **Three type styles in the card have no row in "Map type"**: the 12px notes, the heavier section headings and the 600-weight decision class.

### 2026-11-17: decisions accepted

All fifteen decisions above were accepted as built. The items under "Not fixed" and "Left" stay open.

### 2026-11-17: the remaining items

Every item under "Not fixed" and "Left" above has been worked on. This changes decisions 8 and 14.

- **Both ends of an `implements` line are now in the picture.** The camera frames the far ends as well as the focused cell. The far end is outlined in the trace line's colour: a cell for a selected tool, a mark for a selected cluster. The plates between the two ends fade, so a selected cluster on T5 shows its implementing skills on T1.
- **The selected tool's name is in the accent colour** in the list above its cell. A new token, `map-text-selected`, is in the style guide with two contrast rows.
- **The hover label gives the name alone at the cluster distance**, when the tool is in the focused cluster.
- **The decision squares in the detail card are drawn from the mark tokens.**
- **`src/scene.ts` is split.** `src/mark-material.ts` draws a mark, and `src/selection-drawing.ts` draws a selected cell's outline and the `implements` lines.
- **"Map type" has rows for the card's notes and section headings**, and the decision class's weight is in the body row. The card's name no longer has its own letter spacing.
- **The detail card slides in over 200 ms** when it opens. It does not move when its content changes, when the page opens with it, or with reduced motion on. It is a CSS animation, not anime.js.
- **The list of tool names moves across** where centring it on its cell would take it out of the window or under the detail card. This became necessary once the camera framed a line's far end.

A headless run selected all 51 internal skills and all 16 clusters they implement at 1366×768. No label ran out of the window or under the detail card.

Still open:

- **For a skill in 1A, the outlined cluster stands behind the list of names.** All 51 internal skills are in 1A, whose list is 20 rows tall, and most of the clusters they implement are on higher plates, which the camera sees above the cell. The outline and the line can be seen through the list, and the "Implements" row names the cluster. A tilt nearer level for these selections would lift the far cell clear of the list.
- **A cluster one plate below its skill is partly under the focused plate.** 0G is the only case. Its outline is drawn over the plate above it.
