# 13: Phase scrub

**What to build:** The Architect steps through roadmap phases P0 to P4 on a strip at the bottom of the map and sees, for each phase, the needs scheduled in it and the tools that serve them. This answers "what does each phase call for".

Each step shows that phase only; it is not cumulative. A need that spans phases (such as `P2-P3`, `P0-P4` or `P1, P3`) appears in each of them. Tools that serve no need stay faded throughout. The scrub moves by hand only, with no auto-play. It reuses the need trace's highlighting for a set of needs, without the per-need lines.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] The lens switch offers the phase scrub; when it is active, a phase strip appears at the bottom with five steps, and it is absent otherwise
- [ ] Each step shows the count of needs and of tools for that phase
- [ ] Choosing a phase highlights the tools serving the needs scheduled in that phase and fades the rest; nothing moves
- [ ] A need spanning several phases is included in each phase it covers
- [ ] The left rail lists the needs of the chosen phase, and choosing one opens its need trace
- [ ] Left and right arrow keys step the phase while the strip has focus; key `4` switches to the phase scrub
- [ ] The strip never advances on its own
- [ ] The lens and the chosen phase are recorded in the URL fragment and restored from it
- [ ] State tests cover the tool set for each phase, a need in a range, a need in two separate phases, and the URL round trip
- [ ] A "phase P2" state is in the screenshot script and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
