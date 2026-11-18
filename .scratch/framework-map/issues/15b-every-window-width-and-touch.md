# 15b: The map at every window width, and by touch

**What to build:** A partner can use the whole map on a phone, a tablet or a small window, not only on a laptop. From 360 pixels wide upward the map is drawn and every task can be done; the narrow message is gone. On a touch screen the partner drives the canvas with a finger: a tap selects, a drag orbits, a pinch changes the distance.

This ticket overrides the spec in two places, on the Architect's decision of 2026-11-18. The spec lists "Phones and tablets" as out of scope, and asks for a short message in place of the canvas below 1,024 pixels. Both are withdrawn, and the spec is amended to say so. 1280×720 to 1920×1080 stay as ticket 15 left them: this ticket adds page layouts below the compact one and does not redesign the full or the compact layout.

How the panels are arranged in a small window is for the implementer to design, within the style guide's map section, and to record under Comments. The rail, the detail card, the phase strip, the legend and the breadcrumb cannot all stand beside the canvas on a phone, so some must open over it and leave again. The canvas stays the main thing on screen.

**Blocked by:** 15

**Status:** ready-for-agent

Page layouts

- [x] At every window width from 360 pixels upward the map is drawn; no width shows the narrow message, and the narrow message is removed
- [ ] At 360×640, 390×844, 844×390, 768×1024 and 1024×768 no panel is clipped, no two panels overlap, and the page does not scroll sideways
- [ ] Windows from 1,024 to 1,279 pixels wide, which ticket 15 left unchecked, are checked and sound
- [ ] 1280×720, 1366×768 and 1920×1080 look as they did after ticket 15
- [ ] The picture is fitted to the room the panels leave at every size, and a selection is never under an open panel
- [x] Turning a device, or resizing a window across page layouts, keeps the selection, the lens, the filters and the keyboard focus
- [x] A shared link opens to the same selection, lens and filters in every page layout
- [x] All text keeps to the text floor at every size; nothing is made to fit by shrinking it
- [x] Panels keep clear of a phone's notch and home bar
- [x] The search box and its results stay in sight while a phone's on-screen keyboard is up
- [ ] The fallback page fits every size too: the page does not scroll sideways, and the static picture's names keep to the text floor

Touch

- [x] A tap on a tool, a cell or a plate selects it, as a click does
- [x] A drag on the canvas orbits the stack and a pinch changes the distance, within the camera's fixed limits
- [x] A gesture on the canvas does not scroll or zoom the page, and a pinch does not leave the page zoomed
- [x] What a hover shows with a mouse can be reached by touch, and the way it is reached is recorded under Comments
- [x] Every task can be done by touch alone, with no key: find a tool, read its detail card, switch on each lens, pick a role, pick a need, step phases, set and clear a filter, step out, close the card
- [ ] On a touch screen every control is at least 44 by 44 pixels
- [x] Mouse and keyboard work as before on a laptop, including one with a touch screen

Checks and records

- [x] The map opens and can be orbited on a real phone, or on an emulated one if none is to hand; which was used is recorded under Comments
- [x] Reduced motion is honoured in the new page layouts
- [x] The built file stays under 5 MB
- [ ] The screenshot script covers the new sizes and its panel check runs on them, with touch emulated at the phone and tablet sizes, and it runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The spec is amended: "Phones and tablets" leaves the out-of-scope list, and the line on window sizes names the new smallest size
- [x] `GLOSSARY.md` names each new page layout and drops the narrow message; the README and the style guide's map section describe the new page layouts and touch
- [x] The work is committed

## Comments

### 2026-11-18: built, with two checks still to run

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.81 MB of the 5 MB budget. In Chrome's device toolbar choose a phone, or make the window narrower than 1,024 pixels.

**Eight boxes above are not ticked**, and the status stays `ready-for-agent`. The screenshot script did not finish on the final build, and the critique has not run. The machine ran short of memory during the last run, which was stopped at 37 of about 530 screenshots. See "What is left to do".

**No real phone was to hand. Every check on touch is on an emulated one**: Chrome, driven by Playwright, with a touch screen for its main pointer and two device pixels to one.

#### How the panels are arranged in a small window

Two page layouts were added below the compact one. Both have the **bar**: the rail's icons in a row across the top, 52 pixels high. The canvas has everything under it.

| | Narrow | Upright |
| --- | --- | --- |
| Window | 480 to 1,023 pixels wide, and wider than tall: a phone on its side | Under 1,024 pixels wide and at least as tall as wide, and every window under 480 pixels: a phone or a tablet held upright |
| Breadcrumb | In the bar's row, right of the icons | In a 44-pixel row of its own under the bar |
| Detail card | Under the bar at the right, 360 pixels wide or half the window if that is less | At the bottom, as wide as the window, 45% of its height |
| Sizes of the ticket | 844×390 | 360×640, 390×844, 768×1024 |

1024×768 is the compact layout, as ticket 15 left it.

What opens over the canvas and leaves again:

- **A part of the rail**, from its icon: the search box, the lens switch with the need list, the filters, or the outline. One part at a time, 320 pixels wide from the left, with the title above it and the "Keys" button and the build stamp at its foot. The canvas beside it is dimmed. It closes with its button, with a press outside it, when the focus leaves it, and when something is chosen in it that the map goes to.
- **The legend**, from the last icon of the bar. It leaves at the next press outside it.
- **The detail card**, as before, when something is selected.

The phase strip does not lie over the picture: the picture is fitted above it.

What a small window has no room for is left out. Nothing is drawn smaller to fit.

- **At the stack distance each tier's count stands over its plate, and the tier names are left out.** A phone has no room for the column of names. The count begins with the tier's code. The breadcrumb names a tier once it is chosen, and the outline names all eight. The stack stands a little more level there, 64 degrees against 55, so a count has room over its plate.
- **The names of a tier's clusters stand above its plate only where they have room**: on a tablet, and on a phone on its side for a tier of few clusters. Where they have none, a line under the breadcrumb says "Choose a cell to read its cluster."
- **The names of a cluster's tools stand above its cell only where they have room**: nearly always on a tablet, and on a phone held upright for a cluster of up to nineteen tools with no card open. Otherwise the line says "Choose a mark to read its tool.", and the cluster's detail card lists every tool.
- **Beside both a detail card and the phase strip on a 360×640 phone** the stack is about 125 pixels high, and the counts are left out too.

#### Touch

- **A tap** selects as a click does. **A drag** orbits. **A pinch** changes the distance. Both stop at the camera's limits.
- **What a hover shows is reached with a hold.** A finger kept in place for half a second shows the hover label and the ring for the nearest mark under it, 28 pixels clear of the finger. Both stay until the next touch, or until the finger drags on. Letting go selects nothing.
- **A finger goes in one step at a time.** A mark drawn under 10 pixels is too small to tap, and a tap on it lands on its cell. From a tier on a phone a tap selects the cluster; from the cluster a tap selects the tool. So "a tap on a tool selects it, as a click does" holds where the mark is large enough for a finger. A click with a mouse is as exact as it was.
- **A pinch on a panel still zooms the page.** That is left on purpose, for a partner who needs larger text. While the page is zoomed, a gesture on the canvas moves the page, so the canvas cannot hold a partner in the zoomed page. The spec's line on touch says so. Ticket 16 may want to look at it.
- **Controls are 44 pixels where a touch screen is the main pointer**, in every page layout. A laptop with a touch screen has a mouse for its main pointer and keeps the laptop's sizes; its screen still takes the tap, the drag, the pinch and the hold.
- **The marks on the canvas are not controls**, and are not 44 pixels. The outline reaches every tool with rows of the full size.

#### A phone's notch and home bar

The page does not ask the browser to draw under them: its viewport has no `viewport-fit=cover`. So the browser keeps the page clear of the notch, and no panel can be under it. The phase strip stands 16 pixels off the window's foot, clear of the bar a phone on its side draws there for going home. This rests on how browsers treat such a page, and was not seen on a phone.

#### What was checked, and on which build

On the final build:

- 423 unit tests and the generator's 23 pass, and the type check is clean. 58 unit tests are new: the page layout of a window and the room it leaves the picture, what a press is, the mark within reach of a finger, the static picture in rows, and the script's check on controls.
- `npm run touch` passes every one of its checks. It is a new script, `scripts/touch-check.mjs`. On an emulated 390×844 phone it checks that a drag orbits, a pinch changes the distance and stops at the nearest and the farthest, a tap goes from a plate to a cell to a mark, a hold shows a mark's name, and no gesture scrolls or zooms the page. It does every task of the ticket by touch alone. It turns the phone on its side and back: the selection, the lens, the filters and the keyboard focus are kept. It opens one link at 360×640, 844×390, 768×1024, 1024×768, 1280×720 and 1920×1080: the selection, the lens and the filters are the same at each. With reduced motion on, a part of the rail, the legend, the detail card and the camera all change at once. On a 1366×768 laptop with a touch screen the mouse hovers and clicks, Escape steps out, and a finger taps.
- **The on-screen keyboard is a stand-in.** The script tells the page that 400 pixels of the window are in sight, as a keyboard would, and the search box and its results end above that line.
- The screenshot script saved the stack at rest at all ten sizes, and one tier at most of them, with no fault, before it was stopped. At 1280×720, 1366×768 and 1920×1080 those screenshots are the same as ticket 15's, pixel for pixel, but for the build identifier.

On earlier builds of this ticket:

- One whole run of the screenshot script: 29 states and 400 screenshots at eight sizes, with reduced motion off and on. It found two things. The lens switch's segments were 42 pixels high on touch, and are 44 now. The script counted the fallback page as out of the window where it is taller than the window; that page scrolls down by design, and the script now checks its width. It found no panel out of the window, no two panels that overlap, no label out of its room, no selection under a panel, no page wider than its window, and nothing moving with reduced motion on.
- Part-way through that run, the 14 states it had saved at 1280×720, 1366×768 and 1920×1080 were set against ticket 15's. They were the same, pixel for pixel, but for the build identifier and a divider of the phase strip one pixel off, since put right. The fallback page, looked at apart, had the names of its picture one pixel high. That is put right too, and has not been looked at since.
- A second run was stopped at 315 screenshots, to take in the code review. It had found nothing.

#### What is left to do

1. **Run `npm run screenshots` on the final build**, with the machine's memory free. It takes about 25 minutes and opens ten sizes. The build changed after the last whole run: the phase strip's counts, the stack's tilt under the bar, where the breadcrumb begins, the search box on a phone on its side, and the fallback page's sides.
2. **Run the critique on those screenshots**, and fix each finding or write it here.
3. Then tick the eight boxes that wait on them: the five sizes, 1,024 to 1,279 pixels, the three laptop sizes, the selection under a panel, the fallback page, the 44-pixel controls, the script and the critique.
4. **Open the file on a real phone.** The notch, the home bar, the on-screen keyboard and a hold on a real screen are what the emulation cannot show.

#### Decisions for the Architect

1. **Two new page layouts, narrow and upright, by the window's shape.** A detail card at the bottom of a phone on its side would leave the map no height, and one at the side of a phone held upright no width.
2. **A part of the rail opens alone under the bar.** In the compact layout an icon opens the whole rail; a phone has no height for the parts to share.
3. **The legend opens on request under the bar.** On a phone it would take a quarter of the canvas.
4. **Tier names are left out at the stack distance under the bar**, on a tablet too. Story 3 asks for each tier's name there. The style guide already left the names out where the plates stand close; this ticket leaves them out in two whole page layouts.
5. **Names with no room are left out, and a line under the breadcrumb says what to choose.** The other way was a list in a panel of its own.
6. **The detail card takes 45% of an upright window**, and cannot be made taller. Its text scrolls inside it.
7. **A hold stands in for the hover**, and a finger's tap passes over a mark under 10 pixels. See "Touch".
8. **Page zoom is left on.** See "Touch".
9. **The static picture is now a row for each tier**: its count and name as text of the page, and a drawing of its plate. So a narrow window can draw the plates smaller and leave the names at their size. It was one SVG with the names inside it.
10. **The camera takes its place anew** where a window comes under the bar, leaves it, or is turned under it. Its angle is kept between the full and the compact layout, as before.
11. **Under 480 pixels wide the layout is upright whatever the shape**, and a window as low as 360×300 leaves the picture almost no room beside a card. The ticket names widths, not heights.
12. **`scripts/touch-check.mjs` and `npm run touch` are new**, and so are unit tests at `src/press.ts` and `scripts/control-faults.mjs`. They are pure functions, as ticket 15's were. Strike any the Architect does not want.
13. **The screenshot script now opens ten sizes and takes about 25 minutes**, up from three sizes. It says each failure as it finds it. It also fails on a panel over the selection, a page wider than its window, and a control under 44 pixels on touch.
14. **Four new entries in `GLOSSARY.md`**: bar, narrow layout, upright layout and hold. The narrow message is gone from it.
15. **Spec story 56 is rewritten**, beside the two amendments the ticket asks for, because it asked for the message. The spec also has a line on touch and a list of amendments.

#### Found on the way

- **The screenshot state `outline-keyboard-focus` did not show the outline.** Its two presses of Tab have landed on the lens switch since the lens switch was added, and its arrow keys switched the phase scrub on. Ticket 15's screenshot of it shows the phase strip. It now presses Tab thirteen times, to the outline.

#### After code review

Two reviews ran on the uncommitted work, one against the standards and one against this ticket.

Fixed: a part of the rail that was open closed when a phone was turned, and took the keyboard with it; the focus was lost where a page layout hid the icon that held it; a hold's label could open under the bar, and stayed behind when the finger dragged on; a pointer let go off the canvas stayed counted as down, so the next finger was taken for the second of a pinch; the fallback page's narrower sides never applied; the tier counts were drawn over the plates in the full and the compact layout too; a resize across 1,366 pixels reset the camera's angle; a mouse's click was judged by where the pointer had been, and is judged by where it is let go, as before; a phone on its side under 600 pixels got the upright layout, which left the picture 20 pixels; the script did not count the phase strip as a panel over the selection; sizes stood in the stylesheet and again in the arithmetic, and now come from `src/constants.ts`; the code said "sheet" for a part of the rail; the three places that ask whether names have room each counted for themselves, and now ask one function; the rules for a page drawn under the notch were half made, and were taken out.

Left:

- **`src/page-layout.ts` now answers six questions**: the layout, the panels' room, the names' room, the strip's counts, which panels a state has open, and what is in sight over a keyboard. It could be two modules.
- **The legend, opened by the partner, may lie over a selection.** The script does not count it. It leaves at the next press.
- **Windows from 1,024 to 1,279 pixels are opened at 1024×768 with touch and 1152×720 with a mouse**, and at no other height.
- **A rectangle has three spellings** in the code: `Region`, `LabelRect` and one written out.
