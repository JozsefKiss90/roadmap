# 05: Style guide map section

**What to build:** The style guide gains a "Map" section that defines everything the map needs and the guide does not yet cover, so every later ticket takes colour and type from the guide instead of inventing it. No existing token changes and the `Font source: web` line stays (ADR 0001), so the roadmap page and the six diagrams are untouched.

The map reads these values as named tokens in the light skin only.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The section defines the plate (`paper-2` fill, `rule-solid` edge) and the cell (`rule` hairline)
- [ ] The section defines the decision-class scale in four steps that differ by form, not by opacity alone: committed (solid `ink` fill), planned (`paper` fill, `ink` outline), optional (`paper` fill, thin `soft` outline), guarded (dashed `muted` outline)
- [ ] The section defines the states: hover (`ink` ring), selected or traced (`accent` fill), keyboard focus (2-pixel `accent` outline with a gap), faded (`ink` at about 12%)
- [ ] The section states the two exceptions to the guide: `accent` may mark many tools during a need trace or phase scrub, and faded marks sit below 3:1 because the marks inside the set carry the meaning
- [ ] The section sets the on-screen text floor: 12 pixels for names, 11 for tags
- [ ] The section sets the type roles: tier names in Instrument Serif, cluster and tool names in Geist, counts and tags in Geist Mono uppercase
- [ ] The section states that the map bundles its fonts locally and that the guide's own font source is unchanged
- [ ] The section records the motion durations and the postprocessing limits from the spec (antialiasing always, slight depth blur, no glow, no vignette)
- [ ] Every new token that carries meaning is added to the contrast contract and passes it against the surface it sits on, including marks on a `paper-2` plate; the measured ratios are written under Comments
- [ ] How the new rows are checked is decided and recorded, given that the existing contrast script lives in the diagram-design plugin and not in this repository
- [ ] No existing token value in the guide has changed
- [ ] The Architect has signed off the section
- [ ] The work is committed

## Comments
