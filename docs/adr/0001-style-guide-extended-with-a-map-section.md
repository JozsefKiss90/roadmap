---
status: accepted
---

# The style guide is extended with a map section, not changed

`references/style-guide.md` was written for 2D diagrams and has no tokens for plates, cells, marks, map states, a decision-class scale or a minimum on-screen text size. We add a "Map" section that defines these from the existing tokens, and leave every existing token and the `Font source: web` line as they are. This keeps the roadmap page and the six diagrams unchanged and lets the contrast contract grow by rows instead of being re-run on old values.

## Considered Options

- **Update existing tokens.** Rejected: it changes the roadmap page and the six diagrams, and every changed value has to be re-checked against the contrast contract.
- **Replace the guide.** Rejected: nothing the map needs conflicts with the current skin.

## Consequences

- The map section states two deliberate exceptions to the guide: `accent` may mark many tools at once during a need trace or phase scrub, and faded marks sit below 3:1 because the marks inside the set carry the meaning.
- The map bundles Geist, Geist Mono and Instrument Serif locally so it works offline; the diagrams keep loading them from the web. The faces are the same.
- The map's text floor is 12 pixels on screen for names and 11 for tags, above the guide's 7 to 9 pixel diagram sizes.
