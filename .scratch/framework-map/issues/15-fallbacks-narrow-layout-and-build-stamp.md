# 15: Fallbacks, narrow layout and build stamp

**What to build:** The map behaves well at its edges. A partner without WebGL gets a useful page instead of a blank one; a partner with a narrow window gets a clear message; the interface fits a 1280-pixel laptop; and every copy of the file says how current it is.

Because the map ships as one file (ADR 0003), partners can hold an old copy. The build stamp shows the data date from the graph's metadata and a build identifier from the commit.

**Blocked by:** 08

**Status:** ready-for-human

- [x] Without WebGL, the page shows a static picture of the stack, a short explanation and a link to the tool matrix, with no console error
- [x] The static picture is inlined in the built file and the file stays under 5 MB
- [x] Below 1024 pixels wide, a short message replaces the canvas and asks the partner to widen the window
- [x] At 1280 pixels wide, the left rail collapses to icons and the detail card overlays the canvas; nothing is clipped or overlapping at 1280×720
- [x] At 1366×768 and 1920×1080 the full layout is shown
- [x] The left rail shows the data date and a short build identifier
- [x] Two builds from different commits show different build identifiers
- [x] The interface text (messages, empty states, the fallback explanation) is plain and consistent with the glossary
- [x] The screenshot script covers the no-WebGL page, the narrow message and the 1280×720 layout, and runs clean
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-18: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.79 MB of the 5 MB budget. Make the window 1280 pixels wide, then narrower than 1024. To see the fallback page, start Chrome with `--disable-3d-apis` and open the file.

#### What was checked

- 365 unit tests and the generator's 23 pass. 31 are new: the build identifier and the data date, the page layout by window width, the static picture, and the screenshot script's check on panels.
- The screenshot script runs clean: 25 states and 140 screenshots, with reduced motion off and on. Every state is now opened at 1280×720 as well as at 1366×768 and 1920×1080. Three states are new: the fallback page at all three sizes, the narrow message at 1000×720, and the rail opened by keyboard at 1280×720.
- The script has a new check. It fails if two panels overlap or a panel runs out of the window. The panels are the rail, the breadcrumb, the legend, the phase strip, the detail card, the narrow message and the fallback page. It found nothing at any size.
- A headless run drove the built page at 1280×720: 20 checks, all passed. Each icon opens the rail at its part. A press on the canvas, the close button, and the focus going to the detail card each close it. `/` and `3` open it. The window was then taken to 1366, to 1000 and back to 1280: the layout followed, and the labels kept clear of the icons. There was no console error.
- The same run opened the file in Chrome with `--disable-3d-apis`. The fallback page showed 8 plates and 752 marks, made no canvas and logged no console error. The screenshot script reaches the same page by a different route: it takes `getContext` for WebGL away before the page's code runs.
- The static picture is 0.07 MB of the built file. `scripts/publish.mjs` now refuses a build that lacks it.
- **Two builds from different commits.** Every build so far was made from the working tree on `67c51f1`, and shows `67c51f1+`. The note below this one records a build from this ticket's own commit.
- The compact rail, the fallback page and the narrow message have no unit tests of their own. Their arithmetic is in `src/page-layout.ts` and `src/stack-picture.ts`, which have.

#### Decisions for the Architect

1. **Three page layouts, by the window's width.** Full from 1366 pixels, compact from 1024 to 1365, and the narrow message below 1024. The spec names 1280 and 1024; the compact layout fills the room between them. Windows from 1024 to 1279 get the compact layout and are not checked.
2. **In the compact layout the rail is a 56-pixel column of icons**: open, search, lens, needs, filters, outline, and keys at the foot. The need list's icon is there only while the list is. The picture is fitted to the room beside the column.
3. **An icon opens the whole rail over the canvas**, and the canvas beside it is dimmed, as the page is behind the list of keys. The open rail closes with its own button, with a press outside it, or when the focus leaves it. It leaves at once and the icons fade in; it does not fade out. Ticket 14 asks for the rail to "open and close with one panel duration", and its fifth decision settled that a part of the rail leaves at once.
4. **Escape does not close the open rail.** It keeps its meaning: close the detail card, then step out one distance. A partner working in the outline by keyboard would otherwise lose the rail at every step out.
5. **"The detail card overlays the canvas" changed nothing.** The card already lies over the canvas at every size, and the picture keeps clear of it so that the selection is never under the card. With the rail as icons, a 1280-pixel window leaves more room beside an open card than a 1366-pixel window does with the rail open.
6. **The static picture is drawn by the build, as SVG**, from the layout. It is a pure function, `src/stack-picture.ts`, served as `virtual:stack-picture` as the layout is (ADR 0002). It is not a screenshot, so it cannot fall behind the data.
7. **The fallback page also shows the four decision-class steps and the build stamp.** The spec asks for the picture, an explanation and the link. The picture's marks are in the four forms, and need their names.
8. **The fallback page ignores the window's width.** It has no narrow message. Its picture is never scaled, and the page scrolls in a window too small for it.
9. **The build identifier ends in "+" when the build held changes its commit does not**, in `framework-map/` or `tool-discovery/`. The spec asks for "a build identifier from the commit". Without the mark, a build of work in progress would pass for a build of the commit. Ticket 18 asks for a final build from a clean commit: that build has no "+".
10. **A build outside a git checkout still succeeds**, and its stamp reads "no commit". The dev server's reads "dev".
11. **The data date is shown as "17 Nov 2026"**, from `meta.generated`.
12. **In the column of icons the stamp is compact**: the day, the year and the build identifier, with no names and no tracking, because the column is 56 pixels wide. An identifier with a "+" touches the column's edge; a clean one does not.
13. **Unit tests sit at four modules the spec does not name**: `build-stamp`, `page-layout`, `stack-picture` and the script's `panel-faults`. The spec agrees three seams. Each new one is a pure function, as `camera` and `motion` are. Strike any the Architect does not want.
14. **Seven new entries in `GLOSSARY.md`**: page layout, narrow message, fallback page, static picture, build stamp, data date and build identifier. The rail's entry now names the build stamp and the column of icons.
15. **The style guide's map section gains two paragraphs**, "Page layouts" and "Static picture", and the build stamp is added to `map-tag`. No token changed.
16. **The search results now end above the foot of the rail**, so they no longer cover the "Keys" button and the build stamp.

#### The critique

A separate agent critiqued the screenshots against the style guide's map section, with zoomed crops and measured sizes.

Fixed:

- In the static picture a planned mark was 11 by 9 pixels against 9 by 6 for the others, and two of them ran together. Its outline lay on the mark's edge. Every outline is now drawn inside its mark, at the width of its mark token, and every mark is 9 by 6. A test holds that.
- The open rail cut the tier names and the legend mid-word, and looked like a fault. The canvas beside it is now dimmed.
- The icons of the lens switch and the filters looked the same with a lens on or a filter chosen, and the count of tools is not in the column. Such an icon is now `ink` on `paper-2`, and its name ends in "on".
- The fallback page's picture stood 2 pixels right of the title and the legend. It is on their line now.
- The column of icons showed no build stamp. It has the compact one now.

Found sound: the icons are recognisable, evenly spaced and 40 pixels square; the build stamp is 11-pixel Geist Mono and stands clear of "Keys" at all three sizes; the fallback page fits 1280×720 without scrolling; the narrow message is plain; the detail card, the breadcrumb and the phase strip neither clip nor overlap at 1280; no screenshot uses a word the glossary avoids.

Left:

- **The open rail at 720 pixels high gives the outline about 140 pixels**, and the focus outline of a row at its foot is cut by the rail's foot. The rail's parts share its height as ticket 12 settled. Folding the filters gives the outline room.
- **The legend wraps to a second row beside a detail card** while a need is traced, with one step alone on it. It does the same at 1366. Ticket 13 gave it the second row.
- **The list of keys is taller than a 720-pixel window** and scrolls with no sign that it does. Ticket 16 reviews it.
- **The title is not on screen in the compact layout** until the rail is opened. It stays on the page for assistive technology.
- **The tier counts are soft where the stack stands back** beside a need's card. That is from before this ticket.

#### After code review

Fixed: the code said "mode" and "breakpoint" where the glossary says "page layout" and avoids both; the fallback page named itself a fourth page layout, and is now marked on its own; a rail that turned to icons when the window shrank lost the keyboard focus, and the icons faded in when the page opened; the narrow message hid an open list of keys and left the page dead under it; the link to the tool matrix was made in two places; the fallback page's stylesheet copied the width of the picture's column of names, and now reads it from the picture's own sizes; three exports had no comment, and two comments had come adrift from what they describe; a caller handed the rail both a part's name and the way to focus it.

Left:

- **`hasWebGL` asks for a WebGL 2 context and lets it go.** If the browser gives that one and then refuses the scene's, the page shows "The map could not be drawn" and logs the error. It does not show the fallback page.
- **The link to the tool matrix is relative**, as on the detail card. A partner who holds the map's file alone gets a dead link. Ticket 18 hands the file over.
- **`--rail-width` is now the room the canvas keeps clear for the rail**, 56 pixels in the compact layout. The open rail's width is `--rail-open-width`. The name was kept because six rules place a panel by it.
- **The picture's sizes are in `src/stack-picture.ts`, not in `src/constants.ts`**, as the layout's are in `src/layout.ts`: the build draws the picture before the page runs.
- **`src/build-stamp.ts` holds what the build reads and what the page draws.**
- **The page layout is read from the `<html>` element, not from the store.** It is the window's, not the map's, and is in no shared link.
- **`vite.config.ts` reads the graph once for each of its two modules.**

### 2026-11-18: a build from this ticket's commit

The work is commit `cc18bd0`. A build from that commit, with nothing changed, prints "Build identifier: cc18bd0", and the built file holds that identifier with no "+". The builds before the commit showed `67c51f1+`. So two builds from different commits show different build identifiers.
