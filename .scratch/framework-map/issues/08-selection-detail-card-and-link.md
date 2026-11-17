# 08: Selection, detail card and shareable link

**What to build:** A partner can hover a mark to see its name, select a tool, cluster or need, and read everything about it in the detail card docked on the right. Copying the address reopens the same selection for another partner who holds the same file.

The detail card is 360 pixels wide and has three forms:

- **Tool:** name, kind, capability, decision class and whether the decision is the Architect's or "Proposed here", used by, operated by, hosting, value stream, gate, the needs it serves, overlap group members, repository link, stars, last commit, licence, verification, note, and a link to the tool matrix.
- **Cluster:** tier, cluster attributes, and its tools as a list.
- **Need:** verdict, phase, lead role, approach, gap, best-fit tools.

Selecting an internal skill or subagent that implements a higher cluster draws a line to that cluster's cell; selecting such a cluster draws lines to the tools that implement it. Panels and scene never call each other; both go through the state store.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Hovering a mark shows the tool's name and cluster, and an `ink` ring on the mark
- [ ] Clicking a mark selects the tool, gives it the `accent` fill, flies to it and opens the tool form of the detail card
- [ ] The tool form shows every field listed above, and omits a field cleanly when the tool has no value for it (for example no repository)
- [ ] A tool whose decision source is "Proposed here" is visibly distinguished from one decided by the Architect
- [ ] Clicking a tool in a cluster's list, or an overlap group member, selects that tool
- [ ] Selecting a cluster opens the cluster form; a need reached from a tool's card opens the need form
- [ ] `implements` lines appear for a selected internal skill and for a selected target cluster, and disappear when the selection changes
- [ ] The detail card is absent when nothing is selected, and Escape closes it before it steps out a distance
- [ ] The URL fragment records the selection and the focused tier or cluster, and updates as they change
- [ ] Opening the file with a fragment restores that state; an unknown id in the fragment falls back to the stack at rest without an error
- [ ] State tests cover selection changes and a round trip through the URL fragment
- [ ] The panels use plain DOM and Lucide icons, built with frontend-design, and meet the style guide
- [ ] A "tool selected" state is in the screenshot script and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
