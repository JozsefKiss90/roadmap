# 15b: The map at every window width, and by touch

**What to build:** A partner can use the whole map on a phone, a tablet or a small window, not only on a laptop. From 360 pixels wide upward the map is drawn and every task can be done; the narrow message is gone. On a touch screen the partner drives the canvas with a finger: a tap selects, a drag orbits, a pinch changes the distance.

This ticket overrides the spec in two places, on the Architect's decision of 2026-11-18. The spec lists "Phones and tablets" as out of scope, and asks for a short message in place of the canvas below 1,024 pixels. Both are withdrawn, and the spec is amended to say so. 1280×720 to 1920×1080 stay as ticket 15 left them: this ticket adds page layouts below the compact one and does not redesign the full or the compact layout.

How the panels are arranged in a small window is for the implementer to design, within the style guide's map section, and to record under Comments. The rail, the detail card, the phase strip, the legend and the breadcrumb cannot all stand beside the canvas on a phone, so some must open over it and leave again. The canvas stays the main thing on screen.

**Blocked by:** 15

**Status:** ready-for-agent

Page layouts

- [ ] At every window width from 360 pixels upward the map is drawn; no width shows the narrow message, and the narrow message is removed
- [ ] At 360×640, 390×844, 844×390, 768×1024 and 1024×768 no panel is clipped, no two panels overlap, and the page does not scroll sideways
- [ ] Windows from 1,024 to 1,279 pixels wide, which ticket 15 left unchecked, are checked and sound
- [ ] 1280×720, 1366×768 and 1920×1080 look as they did after ticket 15
- [ ] The picture is fitted to the room the panels leave at every size, and a selection is never under an open panel
- [ ] Turning a device, or resizing a window across page layouts, keeps the selection, the lens, the filters and the keyboard focus
- [ ] A shared link opens to the same selection, lens and filters in every page layout
- [ ] All text keeps to the text floor at every size; nothing is made to fit by shrinking it
- [ ] Panels keep clear of a phone's notch and home bar
- [ ] The search box and its results stay in sight while a phone's on-screen keyboard is up
- [ ] The fallback page fits every size too: the page does not scroll sideways, and the static picture's names keep to the text floor

Touch

- [ ] A tap on a tool, a cell or a plate selects it, as a click does
- [ ] A drag on the canvas orbits the stack and a pinch changes the distance, within the camera's fixed limits
- [ ] A gesture on the canvas does not scroll or zoom the page, and a pinch does not leave the page zoomed
- [ ] What a hover shows with a mouse can be reached by touch, and the way it is reached is recorded under Comments
- [ ] Every task can be done by touch alone, with no key: find a tool, read its detail card, switch on each lens, pick a role, pick a need, step phases, set and clear a filter, step out, close the card
- [ ] On a touch screen every control is at least 44 by 44 pixels
- [ ] Mouse and keyboard work as before on a laptop, including one with a touch screen

Checks and records

- [ ] The map opens and can be orbited on a real phone, or on an emulated one if none is to hand; which was used is recorded under Comments
- [ ] Reduced motion is honoured in the new page layouts
- [ ] The built file stays under 5 MB
- [ ] The screenshot script covers the new sizes and its panel check runs on them, with touch emulated at the phone and tablet sizes, and it runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The spec is amended: "Phones and tablets" leaves the out-of-scope list, and the line on window sizes names the new smallest size
- [ ] `GLOSSARY.md` names each new page layout and drops the narrow message; the README and the style guide's map section describe the new page layouts and touch
- [ ] The work is committed

## Comments
