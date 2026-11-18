---
status: accepted
---

# The map's dark skin is its own, not the guide's dark column

The map is now drawn in a dark skin taken from the accepted concept "Framework Map Dark Concept", version 7. The style guide already had a dark column, and an inversion rule that derives the dark hairlines from the light ones. The map's dark skin uses neither. Its roles are a table of the map's own, "Map roles, dark skin", in the guide's Map section. The guide's Semantic roles table is left as it is, as ADR 0001 requires, so the roadmap page and the diagrams do not change.

The skin departs from the guide in these ways, each on purpose.

- **`rule`, `rule-solid` and the plate's edge are set by hand.** The inversion rule would give `rule` as the text colour at 12% and the plate's edge as a faint line. The accepted brief has the edges carry white: every plate and every cell has a 1px `#FFFFFF` line, in a role of its own, `edge`, which is the only white on the screen. `rule` and `rule-solid` are opaque greys, not tints of the text colour, so the rule could not derive them either.
- **The four decision-class steps have colours of their own.** In the light skin the steps differ by form alone, in `ink`, `soft` and `muted`. In the concept each step keeps its form and takes a colour as well, so neither form nor colour is the only signal. A planned or an optional mark also loses its `paper` fill, so the only filled marks at rest are the committed ones.
- **Counts have a colour of their own**, `count`. It carries each tier's count line, a tier's code in the outline and the count beside the lens switch, and nothing else.
- **Hover changes the mark.** The mark under the pointer fills with `accent` and its cell takes an `accent` outline. In the light skin the ring alone showed it; on the dark plate the ring was too small to find.
- **Nothing is rounded and nothing is blurred.** Every corner is square, and the depth blur is switched off.

## Considered Options

- **Use the guide's dark column and the inversion rule.** Rejected: it gives a navy page with ivory hairlines, which is the diagrams' dark skin and not the accepted concept, and it has no colours for the four steps.
- **Change the guide's dark column to the concept's values.** Rejected: ADR 0001 keeps every existing token as it is, and the diagrams are held to the contrast contract with those values.
- **Keep one skin and replace the light values.** Rejected: the light skin's column and its contrast rows cost little to keep, and the guide's Map section was written to hold two skins.

## Consequences

- ADR 0001 names two deliberate exceptions to the guide in the Map section. This skin is a third, and the Map section lists it with them.
- The guide's Map section has a table of dark roles, a dark column in "Map tokens" and a second table of contrast rows. `npm run contrast` measures both skins, each with its own roles.
- `framework-map/src/tokens.ts` holds both skins and names the one the map is drawn in. The stylesheet carries that skin's values alone, and a test fails if the two disagree. Drawing the map in the light skin again means changing both, and giving the scene what to do without the three tokens the light skin lacks.
- `accent` measures 1.32:1 against a committed mark and 1.56:1 against a planned one. This is accepted, because hover and selection are also shown by the ring, the cell's outline, the hover label and the detail card. If a trace of many tools reads as a field of committed marks, `accent` takes the warm value `count` has now, and `count` takes another.
- A white line on every cell raises the plate's visual weight. The line stays at 1px, so it does not compete with the 2px outline of a planned mark.
