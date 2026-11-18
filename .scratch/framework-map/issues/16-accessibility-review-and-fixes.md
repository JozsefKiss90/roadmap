# 16: Accessibility review and fixes

**What to build:** The finished map is reviewed for accessibility with the design plugin, and every finding is fixed or logged. After this ticket a keyboard or screen-reader user can do everything a mouse user can, through the outline, the search and the panels, and the panels meet WCAG 2.1 AA.

The canvas itself cannot be read by a screen reader. The outline tree is its accessible equivalent, so the review checks that equivalence as well as the panels.

**Blocked by:** 14, 15, 15b

**Status:** ready-for-agent

- [ ] The design plugin's accessibility review has been run on the built file and its report is attached under Comments
- [ ] Every task below can be done with the keyboard alone: find a tool, read its detail card, switch on each lens, pick a role, pick a need, step phases, set and clear a filter, step out, close the card
- [ ] The canvas is described to assistive technology and points to the outline as its equivalent
- [ ] Selection, lens and filter changes are announced, including the resulting count
- [ ] Every control has an accessible name, and focus order follows the visual order
- [ ] Focus is never lost or trapped when the detail card or phase strip opens or closes
- [ ] All panel text and controls meet the contrast contract and the text floor
- [ ] Interactive targets in the panels are at least 24 by 24 pixels
- [ ] The reduced-motion fallback from ticket 14 is confirmed in the review
- [ ] Each finding is fixed, or written under Comments with the reason it stands
- [ ] The screenshot script still runs clean
- [ ] The work is committed

## Comments
