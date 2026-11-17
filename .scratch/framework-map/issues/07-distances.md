# 07: Distances

**What to build:** A partner can drill from the whole stack down to a named tool. Clicking a tier flies to it and shows its cluster names; clicking a cluster flies to it and shows its tool names. A breadcrumb says where they are, and Escape steps back out one distance.

There are three distances: stack, tier and cluster. When a tier is focused, the plates above it fade and the camera tilts toward top-down; plates never move apart. The current distance and the focused tier or cluster live in the state store, which this ticket starts.

**Blocked by:** 06

**Status:** ready-for-human

- [x] The state store holds the distance and the focused tier or cluster, and the scene and labels draw from it
- [x] Clicking a plate or its tier name flies the camera to the tier distance for that tier
- [x] At the tier distance the plates above the focused one fade to near-transparent and no plate changes position
- [x] At the tier distance the cluster names of that tier are shown; tool marks stay unlabelled
- [x] Clicking a cell or its cluster name flies to the cluster distance
- [x] At the cluster distance the tool names of that cluster only are shown, each with its kind family icon and, where gated, a gate badge
- [x] The 57-tool cluster is readable at the cluster distance at 1366×768, with no overlapping names
- [x] No more than about 60 labels are on screen at any distance
- [x] A breadcrumb at the top centre shows stack, tier and cluster, and each part is clickable
- [x] Escape steps out one distance
- [x] State tests cover the transitions between the three distances, including stepping out
- [x] "One tier" and "one cluster" states are in the screenshot script and run clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.59 MB of the 5 MB budget.

#### What was checked

- 172 unit tests and the generator's 23 pass. New tests cover the state store, the camera's place for a distance, picking, the label arithmetic and the label check.
- The screenshot script runs clean on "stack-at-rest", "one-tier" (`#tier=T3`) and "one-cluster" (`#cluster=1A`) at both sizes. It now also fails on more than 60 labels, two labels that overlap, or a label out of the window.
- A headless run clicked a plate, a tier name, a cluster name and a cell, pressed Escape and used the breadcrumb. It then opened all 8 tiers and 55 clusters at 1280×720 and 1366×768: the most labels on screen were 57, with no overlap and none out of the window.

#### Decisions for the Architect

1. **From the stack, a click anywhere on a plate goes to its tier.** A cell takes clicks once its plate is focused. A plate is nearly all cells, so otherwise the tier distance could only be reached by the tier's name.
2. **Cluster names stand as a staircase above the plate**, each on a leader line from its cell's back left corner. They do not fit inside or over their cells.
3. **Tool names stand as a list in columns above the cell**, in the order the cell's grid is filled. A bracket ties the list to its cell. A name is not beside its mark.
4. **A new token, `map-label-leader`** (`soft`, 1px), is in the style guide with two contrast rows. It draws the leaders and the bracket.
5. **Close in, the camera turns 30 degrees to either side at most**, and comes no closer than 30 pixels a unit for a tier and 40 for a cluster.
6. **The tier names and counts are hidden at the tier and cluster distances.** The breadcrumb names the tier.
7. **The gate badge is one word for each gate family**: Review, Licence, Guarded, Approval. Kind icons are in `src/display.ts`.
8. **The URL fragment is read and written here** (`#tier=T3`, `#cluster=1A`), because the screenshot states need it. Ticket 08 adds the selection.
9. **The plate fade is a plain 250 ms fade in the scene**, not anime.js. Ticket 14 owns motion. Reduced motion already cuts.
10. **Lucide and `@fontsource/geist` were added** as dev dependencies. Both are in the spec's toolset.

#### The critique

A separate agent critiqued the screenshots against the style guide, then by Impeccable and ui-ux-pro-max heuristics applied by hand.

Fixed: faded plates are fainter (0.04); the last breadcrumb part is never cut short; names stand 12 pixels clear of badges and columns 40 apart; the list stands 30 pixels above its cell; badges in a column start on one line.

Not fixed:

- **1A shows 57 identical "Review" badges.** The critic asks for one line above the list instead. The ticket asks for a badge on each gated tool, so this is the Architect's call.
- **The focused plate or cell is not the strongest thing on screen.** Plates below and neighbouring cells stay at full strength. The spec fades only the plates above; ticket 14's depth blur may be enough.
- **Faded plates still show faintly behind names.**
- **No count is shown at the tier or cluster distance**, and the tier name appears only in the breadcrumb.
- **The tool order looks arbitrary** without a sign that it follows decision step, then name.
- **At 1920×1080 the picture is top-heavy**, with the lower third empty.
- **Badge text looks thinner than other `muted` text.** It is drawn by three-spritetext on a canvas.
- **Kind icons have no key.** Ticket 10's legend could carry one.

#### After code review

Fixed: the camera lost its aim after the first third of a flight; writing the fragment dropped parts the store does not own; a fragment naming a missing tier was left in the address; clicks were taken during a flight; a held Escape stepped all the way out; each tool name had its own material; "view" was used for a camera's place, against the glossary.

Left: a fault while building tool labels would throw from a store subscriber. The build's validator and the display tests rule out the known causes.
