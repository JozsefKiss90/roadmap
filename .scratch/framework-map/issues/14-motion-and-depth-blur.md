# 14: Motion and depth blur

**What to build:** Every change on the map moves the same short, calm way, and a partner with reduced motion switched on sees cuts instead. A slight depth blur quiets the plates behind the focused one. This is the pass that gives the map its finished feel.

Durations: camera flights 700 ms, run by the renderer's own camera transition; lens and filter fades 250 ms; panels 200 ms; phase steps 300 ms. anime.js drives fades, panels and the phase scrub; it never drives the camera and never a position. The values are tuned with Tweakpane under the dev server and then copied into the constants file.

**Blocked by:** 09, 10, 11, 13

**Status:** ready-for-agent

- [ ] Camera flights between distances, to a selection, and to frame a need trace all take the same settled duration
- [ ] Lens changes, filter changes and plate fading use one fade duration
- [ ] The detail card, the phase strip and the left rail open and close with one panel duration
- [ ] Phase steps use the phase-step duration
- [ ] No mark, cell or plate changes position in any transition
- [ ] Nothing animates when the partner is not interacting
- [ ] With the system's reduced-motion setting on, every duration is zero and the camera cuts
- [ ] Depth blur is applied at the tier and cluster distances only, and is slight enough that every label in the focused plate stays sharp
- [ ] There is no glow and no vignette
- [ ] A single switch turns depth blur off, for use when frames run slow
- [ ] Settled values are in the constants file, and Tweakpane is still absent from the built file
- [ ] The screenshot script runs clean on all named states with reduced motion both on and off
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
