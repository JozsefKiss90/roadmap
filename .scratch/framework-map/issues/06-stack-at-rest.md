# 06: Stack at rest

**What to build:** A partner opens the map and sees the whole framework: eight plates stacked by tier, 55 cells sized by tool count, and all 752 marks in fixed places, each mark drawn in its decision-class step. Each tier shows its name and tool count. The partner can orbit around the stack and zoom within limits. Nothing is clickable yet.

This is the first time the map is on screen and no reference sites were supplied, so this ticket is the visual-direction check. The look must be simple, minimal and polished, and must not read as a graph-visualisation demo.

Positions come from one pure layout function, run at build time; 3d-force-graph renders with every node pinned and no simulation (ADR 0002). The `sector` value in the data gives only the order of clusters on a plate. No edges are drawn.

**Blocked by:** 02, 03, 05

**Status:** ready-for-agent

- [ ] The data module loads and indexes the inlined graph and refuses a graph the validator would reject
- [ ] The layout function returns a position and size for every plate, cell and mark, and stores nothing in the graph data
- [ ] Layout tests pass: every mark lies inside its cell and every cell inside its plate; no two marks overlap; a cell with more tools is not smaller than one with fewer; the same graph gives the same positions on every run
- [ ] The largest cluster (57 tools) and the smallest (4) both lay out without overlap or empty-looking cells
- [ ] All eight plates, 55 cells and 752 marks are drawn, using only tokens from the style guide's map section
- [ ] Each mark shows its decision-class step; the ten raw values map to four steps as the spec lists
- [ ] Each tier shows its name (troika-three-text) and its tool count (three-spritetext), both at or above the text floor at 1366×768
- [ ] The camera orbits around the vertical axis, with fixed limits on tilt and zoom and a narrow perspective lens; it cannot go under or inside the plates
- [ ] Antialiasing is on; there is no glow and no vignette
- [ ] Nothing moves when the partner is not interacting
- [ ] The "stack at rest" state is in the screenshot script and runs clean at both sizes
- [ ] The screenshots have been critiqued in the order of authority, and each finding is fixed or written under Comments
- [ ] The Architect has looked at the result and accepted the visual direction
- [ ] The work is committed

## Comments
