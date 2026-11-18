# Framework map, dark skin: design properties

Status: ready-for-human

The accepted concept is the Design artifact "Framework Map Dark Concept",
version 7 (https://claude.ai/artifact/YMiV6MhQc5Z75HLVhhvr9U). This file turns
that picture into the properties the map is built from. It follows the
structure of the Map section of `references/style-guide.md` and the token
names in `framework-map/src/tokens.ts`, so the skin can be added as the dark
column the guide already provides for, with no new token kinds.

What changes: colours, line colours, the four decision-class colours, the
hover and selection colour, corner radii (none), and the plate's edge
treatment. What stays: the layout, the camera, every width in pixels, the
form scale of the marks (filled, heavy outline, thin outline, dashed), and
every interaction.

## 1. Semantic roles, dark skin

Values the map reads. The first eight are the guide's roles; the last six are
new roles this skin needs. Hex values are what the concept ships with.

| Role | Value | Use on the map |
|---|---|---|
| `paper` | `#0B0B0C` | Page background, rail background, hover label background |
| `paper-2` | `#202024` | Plate of a tier |
| `paper-3` | `#0E0E10` | Underside of a plate (its thickness) |
| `ink` | `#E6E2DA` | Primary text, tier names, active control fill |
| `ink-strong` | `#0B0B0C` | Text on an `ink` or `accent` fill (the active lens segment, a selected row's bar) |
| `muted` | `#9C9890` | Secondary text: section headers, counts in the outline, hex labels, build stamp, search placeholder |
| `soft` | `#9C9890` | Same value as `muted`; kept as a role so existing token references resolve |
| `rule` | `#26262A` | Rail divider, section dividers, legend frame, outline row separators (`#1C1C1F`, see below) |
| `rule-solid` | `#3C3C44` | Control borders: search box, lens segments, key caps, outline tree line |
| `edge` | `#FFFFFF` | Plate edge and cell line. New role: the only white on the screen |
| `accent` | `#4DF0B4` | Hover ring, selection, trace, best fit, home cell, keyboard focus |
| `count` | `#F5C842` | Tier counts beside the plates, tier codes in the outline, the "752 TOOLS" figure |
| `class-committed` | `rgba(0, 238, 27, 0.9)` | Decision class: committed |
| `class-planned` | `rgba(51, 202, 255, 0.9)` | Decision class: planned |
| `class-optional` | `#A49BC4` | Decision class: optional |
| `class-guarded` | `rgba(255, 83, 124, 1)` | Decision class: guarded |

Notes.

- The outline tree's row separators use `#1C1C1F`, one step below `rule`. If
  one value is preferred, use `rule`; the difference is not load bearing.
- `rule` and `rule-solid` are opaque here, not `rgba()` tints of `ink`, so
  the guide's inversion rule does not derive them. They are set by hand.
- The three translucent class colours are composited over `paper-2` before
  any contrast is measured. Composites: committed `#03D91C`, planned
  `#31B9E9` on the plate and `#2FB7E7` on `paper`.

## 2. Map tokens, dark skin

Same token names as the light skin. Widths are in pixels on screen and do
not grow as the camera moves closer.

| Token | Value | Use |
|---|---|---|
| `map-plate-fill` | `paper-2` fill | The plate of a tier |
| `map-plate-side` | `paper-3` fill, 7px deep on screen | The underside of a plate, visible along its front and right edges. New token |
| `map-plate-edge` | `edge`, 1px | Edge of the plate face and of its underside |
| `map-cell-line` | `edge`, 1px | Outline of a cell |
| `map-mark-committed` | Solid `class-committed` fill, no outline | Decision class: committed |
| `map-mark-planned` | No fill, 2px `class-planned` outline | Decision class: planned |
| `map-mark-optional` | No fill, 1px `class-optional` outline | Decision class: optional |
| `map-mark-guarded` | No fill, 1px dashed `class-guarded` outline | Decision class: guarded |
| `map-hover-ring` | 1px `accent` ring, 2px clear of the mark; the mark itself fills `accent` | The mark under the pointer. See states |
| `map-hover-cell` | 1px `accent` outline in place of `map-cell-line` | The cell of the hovered mark. New token |
| `map-selected-fill` | Solid `accent` fill | A selected mark, or a mark in a need trace or phase scrub |
| `map-selected-cell` | 2px `accent` outline | The cell of a selected cluster |
| `map-bestfit-ring` | 2px `accent` ring, 2px clear of the mark | A best-fit tool in a need trace |
| `map-home-cell` | 2px `accent` outline | The home cell of a traced need |
| `map-trace-line` | 1px `accent` line | Trace lines |
| `map-trace-selected` | 2px `ink` ring, 2px clear of the mark | The selection while a need is traced or a phase is shown |
| `map-focus-outline` | 2px `accent` outline, 2px gap | Keyboard focus, panels and canvas |
| `map-faded` | `edge @ 0.12` | A mark outside the active lens or filter |
| `map-text-name` | `ink` | Tier, cluster and tool names |
| `map-text-count` | `count` | Tier count line beside each plate, tier codes in the outline. New token |
| `map-text-selected` | `accent` | Selected names in lists |
| `map-text-tag` | `muted` | Counts in lists, tags, hex labels |
| `map-label-leader` | `accent`, 1px | The leader from the hover label to its mark. Cluster-name leaders keep `muted` |

Planned and optional marks no longer carry a `paper` fill. In the light skin
the fill hid the plate; here the plate shows through every outlined mark, so
the only filled marks at rest are committed ones. That is deliberate: the
fill itself becomes a signal.

## 3. Decision-class scale

Each step has its own colour and its own form. Colour is never the only
signal; the form scale is unchanged from the light skin.

| Step | Colour | Fill | Outline | Measured on plate |
|---|---|---|---|---|
| Committed | `class-committed` `rgba(0, 238, 27, 0.9)` | Yes | None | 8.46:1 |
| Planned | `class-planned` `rgba(51, 202, 255, 0.9)` | None | 2px, solid | 7.15:1 |
| Optional | `class-optional` `#A49BC4` | None | 1px, solid | 6.23:1 |
| Guarded | `class-guarded` `rgba(255, 83, 124, 1)` | None | 1px, dashed | 5.24:1 |

All marks are the same size. The dashed outline keeps the browser or
renderer default dash of about 3px on, 3px off, as the concept shows.

## 4. States

| State | Treatment |
|---|---|
| Hover | The mark fills `accent` and takes `map-hover-ring`. Its cell takes `map-hover-cell`. A label opens beside it (section 7). This differs from the light skin, where the mark did not change: the ring alone was too small to find against the dark plate. |
| Selected or traced | Unchanged in structure: `map-selected-fill`, `map-selected-cell`, `map-text-selected`, `map-bestfit-ring`, `map-home-cell` as in the guide, all in `accent`. A traced need's row and the detail card's head row stand on `paper-2` with a 2px `accent` bar at the left. |
| Selected while traced or scrubbed | `map-trace-selected` in `ink`, as in the guide. |
| Keyboard focus | `map-focus-outline` in `accent`. |
| Faded | The mark keeps its form. Its class colour turns to `map-faded` (`edge @ 0.12`, composite `#3B3B3E`). Measured 1.45:1 on the plate: the guide's faded exception stands. |

A selected or traced mark no longer shows its decision class; the detail
card states it.

## 5. Geometry and surfaces

| Property | Value |
|---|---|
| Corner radius | 0 everywhere: plates, cells, marks, rings, controls, key caps, labels, legend. The existing `kbd` rule's 4px radius goes to 0 |
| Mark | 8px square, 4px gap between marks |
| Cell | Marks on one grid, 6px padding inside a 1px `map-cell-line`; 8px between cells on a plate; cells vertically centred on the plate |
| Plate | 1px `map-plate-edge`; 10px inset before the first cell; face `paper-2`; underside `paper-3` 7px below the face, same outline |
| Shadows, glow, gradients, blur, vignette | None. The depth-blur pass is off in this skin |
| Plate thickness | Drawn as a second parallelogram offset 7px down, not as a lit side |

Plate height, length and spacing, the camera and the projection do not change.

## 6. Type roles

Three roles, as in the light skin, with Instrument Serif kept for the
display face. Minimum text size on the screen is 11px.

| Role | Face | Where | Size and weight | Colour |
|---|---|---|---|---|
| Tier names | Instrument Serif | Beside each plate, set along the plate's long axis; the rail title | 26px / 400 beside plates; 32px / 400 title, line height 1.05 | `ink` |
| Interface text | Inter (or Geist, if the build keeps it; the metrics are close) | Rail labels, lens segments, outline names, legend names, hover label name | 13px / 400; 13px / 600 for the active segment and an opened outline row; 14px for the search field | `ink` on `paper`; `ink-strong` on an `ink` fill |
| Monospaced counts | IBM Plex Mono (or Geist Mono) | Tier count lines, tier codes, counts, section headers, hex labels, build stamp, key caps | 11px / 400, letter spacing 0.10 to 0.12em for headers and count lines, 0.04em for the stamp | `count` for tier counts and codes; `muted` for the rest |

The concept uses Inter and IBM Plex Mono. The map's build already ships
Geist and Geist Mono; either pair satisfies the spec, but do not mix the two.

## 7. Interface surfaces

Rail, 240px wide, `paper`, 1px `rule` at its right edge, 20px side padding,
28px top padding, 22px between blocks.

| Element | Properties |
|---|---|
| Search box | 40px tall, 1px `rule-solid`, 12px left padding; magnifier icon 14px stroke `muted`; placeholder `muted` 14px; a key cap "/" at the right |
| Key cap | 1px `rule-solid`, 1px 6px padding, `muted` mono 11px, no radius |
| Section header row | Mono 11px `muted`, letter spacing 0.10em, figure at the right in `count` (lens) or `muted` (outline) |
| Lens switch | Four equal segments in a 1px `rule-solid` frame, 32px tall, 1px `rule-solid` between segments; active segment fills `ink` with `ink-strong` text at weight 600; inactive segments transparent with `ink` text |
| Filters row | Full width, 1px `rule` above and below, 10px vertical padding, header style at left, figure in `ink` at right |
| Outline tree | Rows 6px vertical padding, `#1C1C1F` separator; tier code in `count` mono 11px in a 20px column; name `ink` 13px, ellipsis on overflow; count `muted` mono 11px at the right; an opened tier's children indent 18px behind a 1px `rule-solid` line, 6px apart |
| Rail foot | 1px `rule` above, 14px padding; "Keys" with a "?" key cap at left; two-line build stamp mono 11px `muted` at right, line height 1.5 |
| Stage title | "Stack" centred over the stage, 13px / 600 `ink`, 34px from the top |
| Hover label | `paper` fill, 1px `accent` border, 8px 10px padding, no radius; line one mono 11px `accent` letter spacing 0.10em (tier, cell, index); line two 13px `ink` (tool name); line three 12px `muted` with the class swatch and the class name. A 1px `accent` leader, 20px, from the label down toward the mark |
| Legend | Bottom left of the stage, 32px in from both edges; 1px `rule` frame; a leading tag "DECISION CLASS" mono 11px / 500 letter spacing 0.12em, `ink-strong` on `ink`; then one 34px-tall item per class with a 12px swatch in that class's form and colour, the name 13px `ink`, and the value mono 11px `muted`; items separated by 1px `rule`, 16px side padding; the hover item last, behind a 1px `rule-solid` separator |
| Surface swatches | Bottom right, mono 11px `muted`, letter spacing 0.06em: background, plate, text, muted, edges, each with a 12px swatch. Optional in the build; useful in a Keys panel |

## 8. Contrast rows

Measured as WCAG 2.x ratios with translucent colours composited over the
surface first. Marks sit on `paper-2`. Minimums are the guide's: 4.5:1 for
text, 3:1 for essential non-text marks, none for decorative rules.

| Token | Colour | Sits on | Use | Minimum | Measured |
|---|---|---|---|---|---|
| `map-plate-fill` | `paper-2` | `paper` | decorative | none | 1.21:1 |
| `map-plate-side` | `paper-3` | `paper` | decorative | none | 1.02:1 |
| `map-plate-edge` | `edge` | `paper` | decorative | none | 19.67:1 |
| `map-cell-line` | `edge` | `paper-2` | decorative | none | 16.24:1 |
| `map-mark-committed` | `class-committed` | `paper-2` | non-text | 3:1 | 8.46:1 |
| `map-mark-planned` | `class-planned` | `paper-2` | non-text | 3:1 | 7.15:1 |
| `map-mark-planned` | `class-planned` | `paper` | non-text | 3:1 | 8.48:1 |
| `map-mark-optional` | `class-optional` | `paper-2` | non-text | 3:1 | 6.23:1 |
| `map-mark-optional` | `class-optional` | `paper` | non-text | 3:1 | 7.55:1 |
| `map-mark-guarded` | `class-guarded` | `paper-2` | non-text | 3:1 | 5.24:1 |
| `map-hover-ring`, `map-selected-fill`, `map-selected-cell`, `map-bestfit-ring`, `map-home-cell`, `map-trace-line`, `map-focus-outline` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-trace-line`, `map-focus-outline` | `accent` | `paper` | non-text | 3:1 | 13.53:1 |
| `map-trace-selected` | `ink` | `paper-2` | non-text | 3:1 | 12.57:1 |
| `map-faded` | `edge @ 0.12` | `paper-2` | exception | none | 1.45:1 |
| `map-text-name` | `ink` | `paper` | text | 4.5:1 | 15.23:1 |
| `map-text-name` | `ink` | `paper-2` | text | 4.5:1 | 12.57:1 |
| `map-text-count` | `count` | `paper` | text | 4.5:1 | 12.39:1 |
| `map-text-selected` | `accent` | `paper` | text | 4.5:1 | 13.53:1 |
| `map-text-selected` | `accent` | `paper-2` | text | 4.5:1 | 11.16:1 |
| `map-text-tag` | `muted` | `paper` | text | 4.5:1 | 6.85:1 |
| `map-text-tag` | `muted` | `paper-2` | text | 4.5:1 | 5.65:1 |
| `ink-strong` on an `ink` fill | `paper` on `ink` | `ink` | text | 4.5:1 | 15.23:1 |
| `ink-strong` on an `accent` fill | `paper` on `accent` | `accent` | text | 4.5:1 | 13.53:1 |
| `rule` | `#26262A` | `paper` | decorative | none | 1.31:1 |
| `rule-solid` | `#3C3C44` | `paper` | decorative | none | 1.80:1 |

Every mark clears 3:1 and every text colour clears 4.5:1. `npm run contrast`
in `framework-map/` should gain a dark column and these rows.

## 9. Known risks, decided as accepted

1. **The hover colour sits close to two classes.** `accent` `#4DF0B4` measures
   1.32:1 against a committed mark and 1.56:1 against a planned one. Hover and
   selection are still told apart by the ring, the cell outline, the label
   and the detail card, so the brief's "never colour alone" rule holds. If
   a trace of many tools reads as a field of committed marks in practice,
   the fallback is a warm accent such as `#F5C842`, which already exists as
   `count`; swapping it changes one role.
2. **`count` is a sixth colour.** It carries the tier count line and tier
   codes only. It must not be used for anything else, or the legend stops
   being complete.
3. **White edges on every cell** raise the plate's visual weight. Keep
   `map-cell-line` at 1px; a heavier line would compete with the planned
   mark's 2px outline.

## 10. Implementation notes

- `framework-map/src/tokens.ts`: give `ROLES` a second column (dark) with the
  values in section 1, add the roles `paper-3`, `edge`, `count` and the four
  `class-*` roles, add the tokens `map-plate-side`, `map-hover-cell` and
  `map-text-count`, and change the four mark tokens to the fills and
  outlines in section 2. `src/tokens.test.ts` compares against the style
  guide, so the guide's Map section needs the dark column first.
- `framework-map/src/styles.css`: add the dark values to `:root`, set
  `border-radius: 0` on `kbd`, the breadcrumb buttons and every control, and
  restyle the rail, lens switch, outline, legend and hover label per
  section 7.
- `framework-map/src/depth-blur.ts`: off in this skin.
- `references/style-guide.md`: add the dark column to the Map tokens table
  and the rows of section 8 to Map contrast rows; record the hover change
  (the mark fills `accent`) under Map states.
- A decision record under `docs/adr/` should state that the map's dark skin
  departs from the guide's inversion rule for `rule`, `rule-solid` and the
  plate edge, and why (edges carry white by the accepted brief).

## Comments

### 2026-11-18, implemented

The map is drawn in the dark skin. `framework-map/src/tokens.ts` holds both skins and names the dark one as the map's; the guide's Map section has the dark roles, a dark column in Map tokens and a second table of contrast rows; `docs/adr/0004` records the departure from the guide.

Where the build differs from this spec, and why:

1. **The dark roles are a table of the map's own in the guide** ("Map roles, dark skin"), not the dark column of Semantic roles. That column is the diagrams' dark skin, and ADR 0001 keeps it as it is.
2. **Two measured ratios differ in the second decimal.** Committed on the plate is 8.49:1 (8.46 here) and planned on `paper` is 8.47:1 (8.48 here). Section 8 blended each see-through colour to a whole hex value first; `npm run contrast` does not round. The guide states what the check measures.
3. **Rows added to section 8**, because the check wants a row for every token: `map-hover-cell`, `map-label-leader` in `accent` and in `muted`, and `map-text-count` on `paper-2` (a tier's code in a selected outline row).
4. **`map-label-leader` names two roles.** `muted` for the cluster-name leaders, as section 2 says they keep, and `accent` for the hover label's leader.
5. **The legend does not print each colour's value.** With the values the legend is about 1,400 pixels wide, and the full layout begins at 1,366 with a 240-pixel rail. The surface swatches, which section 7 calls optional, are not built either.
6. **Outline names take a second line; they are not cut with an ellipsis.** The guide's text-spacing rule says no name of a control is cut, and `npm run accessibility` checks it.
7. **Outline row separators use `rule`**, as the note in section 1 allows.
8. **The outline keeps its chevrons**, and tiers start open, as before: the interactions stay.
9. **The filters' count shows "752 of 752"** and reads out "752 of 752 tools", so that it stands on one line beside the heading at the wider tracking.
10. **Tier names at 26px take a wider column**: `labelColumnPx` 448 and `insetLeftPx` 744 in `src/constants.ts`. The stack is drawn a little smaller for it in the full and the compact layout.
11. **The legend at 32 pixels off the foot is taller than before**, so `insetBottomPx` is 88, and the phase strip stands 16 pixels over the legend whatever its height.
12. **What lies behind an open panel is dimmed with `paper` at 72%**, not `ink` at 24%: a light veil turned the dark canvas grey.
13. **The hover label's first line is tier, cluster and place**, as "T6 · 6A · 06". The cluster's name is no longer on the label; the outline and the detail card give it.
14. **Canvas counts are not tracked.** They are drawn by a library with no letter spacing, as before. The counts of the page are at 0.10em.
15. **A checkbox keeps a `soft` border**, not `rule-solid`: the border is all there is of an empty checkbox, and `rule-solid` measures 1.80:1.

Checked: `npm test` (493 unit tests, 23 generator tests), `npm run build`, `npm run accessibility`, `npm run touch`. The fault checks of `npm run screenshots` were run on all 29 states at every viewport with reduced motion off, without saving pictures: no label, panel, selection or control fault.

Left for a person:

- Run `npm run screenshots` with memory free. It was stopped for low memory in an earlier session, so the whole gate, with reduced motion on and the saved pictures, has not run on this build.
- Look at the map against the concept, above all the tier names at 1,366 by 768, where a name comes within the 4-pixel least gap of the next tier's count.
- Risk 1 of section 9: judge by eye whether a trace of many tools reads as a field of committed marks.
