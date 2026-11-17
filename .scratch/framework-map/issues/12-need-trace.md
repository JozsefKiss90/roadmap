# 12: Need trace

**What to build:** The Architect picks one of the 33 needs and sees what it pulls in across the stack: the tools that serve it highlighted, the best fits marked more strongly, the need's home cluster outlined, and lines from the home cell to each serving tool. The camera frames them all and the detail card shows the need.

Needs are not objects in space. They are picked from a list in the left rail, grouped by phase. This is the one place the map uses `accent` on many marks at once, as the style guide's map section allows.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The lens switch offers the need trace; when it is active, the left rail lists the 33 needs grouped by phase
- [ ] A need that spans several phases is listed under each of them
- [ ] Choosing a need gives its serving tools the `accent` fill and gives best-fit tools a heavier ring
- [ ] The need's home cell is outlined in `accent`
- [ ] Lines run from the home cell to each serving tool, and are removed when the need changes or the lens is switched off
- [ ] All other tools take the faded state; nothing moves
- [ ] The camera frames every tool in the trace, across however many tiers it spans
- [ ] The detail card shows the need form: verdict, phase, lead role, approach, gap and best-fit tools
- [ ] Clicking a traced tool opens its detail card without leaving the trace; the need is one click away from that card
- [ ] Opening a need from a tool's detail card starts the need trace for it
- [ ] The lens and the chosen need are recorded in the URL fragment and restored from it
- [ ] Key `3` switches to the need trace
- [ ] State tests cover the traced set and best-fit set for a need, a need with a single tool, changing need, and the URL round trip
- [ ] A "one need trace" state is in the screenshot script and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
