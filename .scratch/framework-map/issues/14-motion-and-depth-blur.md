# 14: Motion and depth blur

**What to build:** Every change on the map moves the same short, calm way, and a partner with reduced motion switched on sees cuts instead. A slight depth blur quiets the plates behind the focused one. This is the pass that gives the map its finished feel.

Durations: camera flights 700 ms, run by the renderer's own camera transition; lens and filter fades 250 ms; panels 200 ms; phase steps 300 ms. anime.js drives fades, panels and the phase scrub; it never drives the camera and never a position. The values are tuned with Tweakpane under the dev server and then copied into the constants file.

**Blocked by:** 09, 10, 11, 13

**Status:** ready-for-human

- [x] Camera flights between distances, to a selection, and to frame a need trace all take the same settled duration
- [x] Lens changes, filter changes and plate fading use one fade duration
- [x] The detail card, the phase strip and the left rail open and close with one panel duration
- [x] Phase steps use the phase-step duration
- [x] No mark, cell or plate changes position in any transition
- [x] Nothing animates when the partner is not interacting
- [x] With the system's reduced-motion setting on, every duration is zero and the camera cuts
- [x] Depth blur is applied at the tier and cluster distances only, and is slight enough that every label in the focused plate stays sharp
- [x] There is no glow and no vignette
- [x] A single switch turns depth blur off, for use when frames run slow
- [x] Settled values are in the constants file, and Tweakpane is still absent from the built file
- [x] The screenshot script runs clean on all named states with reduced motion both on and off
- [x] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [x] The work is committed

## Comments

### 2026-11-17: built, for the Architect to look at

Run `npm run build` in `framework-map/` and open `framework-map.html`. The built file is 2.70 MB of the 5 MB budget. Go to a tier, press `2` and `4`, step the phase with the arrow keys, and select a tool. Then switch the system's reduced-motion setting on and do the same.

#### What was checked

- 334 unit tests and the generator's 23 pass. Six are new, in `src/motion.test.ts`: the four durations with reduced motion off and on, and which duration a change of lens takes.
- The screenshot script runs clean on 22 states at both sizes, each with reduced motion off and on: 88 screenshots. It now waits for every state to come to rest, and fails if anything is under way with reduced motion on. The 44 pairs are the same pixel for pixel.
- A headless run at 1366×768 drove the built page. A lens change came to rest after about 220 ms, a phase step after about 280 ms, and a card with its flight after about 650 ms. With reduced motion on, each was at rest at once. Nothing was under way after 1.2 seconds with no input. A card opened, closed and opened again inside one panel duration ended open and whole. There was no console error.
- The values were not tuned by eye under the dev server. I set them from screenshots. The "Motion" and "Depth blur" folders are in the tuning panel for the Architect to do that.
- The fades and the depth blur have no unit tests. The spec agrees three seams for unit tests.

#### Decisions for the Architect

1. **anime.js is a new dependency**, `animejs` 4.5.0, as the spec names it. It runs the plate fade, the change of a mark's form, the trace's fade and the panels.
2. **A mark changes form as a mix of two forms on one square.** The mark's shader draws the form it had and the form it takes, and anime.js runs the mix from 0 to 1. No second mark is drawn and nothing moves.
3. **A panel fades and does not slide.** The detail card's 16-pixel slide is gone. The ticket says anime.js never drives a position.
4. **A closing detail card or phase strip stays on the page for the panel duration**, with its content, and takes no click and no focus. The legend and the strip take its room when it has gone.
5. **A part of the rail fades in and leaves at once.** That is the need list, the row of roles, and the filters and the outline when they unfold. The part that opens takes the room of the part that closes, so both cannot be on the page. The ticket asks for the rail to "open and close" with the panel duration; the rail as a whole does not open or close until ticket 15 collapses it.
6. **The depth blur follows the plates, not the depth buffer.** Each whole plate under the focused one is blurred, the more the further under it lies: half the spread on the first plate under, all of it from the second. The focused plate is tilted, so a blur by depth would soften its near and far edges and the names on it.
7. **The widest spread is 1 pixel.** At 2 pixels the optional marks on the second plate under fell to a contrast of 2.0:1 and nearly vanished.
8. **No plate is blurred while a need is traced**, and a plate that holds the far end of an `implements` line is not blurred. A blurred trace line fell below the 3:1 its token asks for.
9. **The one switch is `depthBlur` in `src/constants.ts`.** It is set at build time. Nothing measures frames and switches it off; ticket 17 checks the frame rate.
10. **The blur draws the scene itself, straight to the screen**, at every distance, and the renderer's own render pass stands aside. Drawn through the composer's buffers the scene would lose its antialiasing, and its see-through colours would change. The page and plate colours are the same at every distance, as measured in the screenshots.
11. **`src/motion.ts` reads the constants itself.** The other modules are handed them. Five panels would otherwise each be handed the constants for one number.
12. **`window.frameworkMap.isMoving()` is in the built file**, beside `labels()`, for the screenshot script.
13. **"Depth blur" is a new entry in `GLOSSARY.md`.**

#### The critique

A separate agent critiqued the screenshots against the style guide's map section, with zoomed crops and measured contrast.

Fixed:

- The trace lines were smeared where they crossed the plates under the focused one, down to 2.1:1. No plate is blurred now while a need is traced.
- The blur was more than slight on the second and third plates under. The widest spread went from 1.5 pixels to 1.

Found sound: every mark, line and name on the focused plate is sharp; nothing is blurred at the stack distance; there is no seam, halo, glow or vignette; the `implements` lines and their far ends are sharp; no panel is part-transparent.

Left:

- **The marks on the plates under the focused one are paler than their tokens.** That is what the blur does. The focused plate carries the meaning at these distances.
- **The faded plates above the focused one stand behind the names.** Ticket 07 settled that.

#### After code review

Fixed: a plate that was fading in hid the blur under it from the start of its fade, and now does so only once it is whole; the panels each asked for the panel duration, and `showPanel`, `fadeIn` and `showRailPart` now read it themselves; the need list and the row of roles each kept their own "drawn once" flag, and `showRailPart` now keeps it; a closing panel was known by its `inert` attribute, and is now kept in a set; three exports had no comment.

Left:

- **A change that starts during another finishes the first at once.** Quick presses of the arrow keys on the phase strip show the marks jump to the phase before, and fade from there. A mark can be a mix of two forms, not three.
- **A trace that goes is a cut**, and so are the selection's outline and `implements` lines. Only a new trace fades in.
- **The outline's dimmed rows, the tier counts and the tool names change at once** with a lens or a filter. They are DOM and text, and the fade is on the marks.
- **`TierParts` has `opacity`, `from`, `to` and `blur`, `blurFrom`, `blurTo`.** One small type would hold both.
- **`src/motion.ts` holds the durations, the fades and the panel helpers.**
