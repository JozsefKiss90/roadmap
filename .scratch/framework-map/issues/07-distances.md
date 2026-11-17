# 07: Distances

**What to build:** A partner can drill from the whole stack down to a named tool. Clicking a tier flies to it and shows its cluster names; clicking a cluster flies to it and shows its tool names. A breadcrumb says where they are, and Escape steps back out one distance.

There are three distances: stack, tier and cluster. When a tier is focused, the plates above it fade and the camera tilts toward top-down; plates never move apart. The current distance and the focused tier or cluster live in the state store, which this ticket starts.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] The state store holds the distance and the focused tier or cluster, and the scene and labels draw from it
- [ ] Clicking a plate or its tier name flies the camera to the tier distance for that tier
- [ ] At the tier distance the plates above the focused one fade to near-transparent and no plate changes position
- [ ] At the tier distance the cluster names of that tier are shown; tool marks stay unlabelled
- [ ] Clicking a cell or its cluster name flies to the cluster distance
- [ ] At the cluster distance the tool names of that cluster only are shown, each with its kind family icon and, where gated, a gate badge
- [ ] The 57-tool cluster is readable at the cluster distance at 1366×768, with no overlapping names
- [ ] No more than about 60 labels are on screen at any distance
- [ ] A breadcrumb at the top centre shows stack, tier and cluster, and each part is clickable
- [ ] Escape steps out one distance
- [ ] State tests cover the transitions between the three distances, including stepping out
- [ ] "One tier" and "one cluster" states are in the screenshot script and run clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
