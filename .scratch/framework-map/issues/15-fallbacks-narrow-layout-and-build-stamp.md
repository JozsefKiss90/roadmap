# 15: Fallbacks, narrow layout and build stamp

**What to build:** The map behaves well at its edges. A partner without WebGL gets a useful page instead of a blank one; a partner with a narrow window gets a clear message; the interface fits a 1280-pixel laptop; and every copy of the file says how current it is.

Because the map ships as one file (ADR 0003), partners can hold an old copy. The build stamp shows the data date from the graph's metadata and a build identifier from the commit.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Without WebGL, the page shows a static picture of the stack, a short explanation and a link to the tool matrix, with no console error
- [ ] The static picture is inlined in the built file and the file stays under 5 MB
- [ ] Below 1024 pixels wide, a short message replaces the canvas and asks the partner to widen the window
- [ ] At 1280 pixels wide, the left rail collapses to icons and the detail card overlays the canvas; nothing is clipped or overlapping at 1280×720
- [ ] At 1366×768 and 1920×1080 the full layout is shown
- [ ] The left rail shows the data date and a short build identifier
- [ ] Two builds from different commits show different build identifiers
- [ ] The interface text (messages, empty states, the fallback explanation) is plain and consistent with the glossary
- [ ] The screenshot script covers the no-WebGL page, the narrow message and the 1280×720 layout, and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
