# 05: Style guide map section

**What to build:** The style guide gains a "Map" section that defines everything the map needs and the guide does not yet cover, so every later ticket takes colour and type from the guide instead of inventing it. No existing token changes and the `Font source: web` line stays (ADR 0001), so the roadmap page and the six diagrams are untouched.

The map reads these values as named tokens in the light skin only.

**Blocked by:** 01

**Status:** ready-for-human

- [x] The section defines the plate (`paper-2` fill, `rule-solid` edge) and the cell (`rule` hairline)
- [x] The section defines the decision-class scale in four steps that differ by form, not by opacity alone: committed (solid `ink` fill), planned (`paper` fill, `ink` outline), optional (`paper` fill, thin `soft` outline), guarded (dashed `muted` outline)
- [x] The section defines the states: hover (`ink` ring), selected or traced (`accent` fill), keyboard focus (2-pixel `accent` outline with a gap), faded (`ink` at about 12%)
- [x] The section states the two exceptions to the guide: `accent` may mark many tools during a need trace or phase scrub, and faded marks sit below 3:1 because the marks inside the set carry the meaning
- [x] The section sets the on-screen text floor: 12 pixels for names, 11 for tags
- [x] The section sets the type roles: tier names in Instrument Serif, cluster and tool names in Geist, counts and tags in Geist Mono uppercase
- [x] The section states that the map bundles its fonts locally and that the guide's own font source is unchanged
- [x] The section records the motion durations and the postprocessing limits from the spec (antialiasing always, slight depth blur, no glow, no vignette)
- [x] Every new token that carries meaning is added to the contrast contract and passes it against the surface it sits on, including marks on a `paper-2` plate; the measured ratios are written under Comments
- [x] How the new rows are checked is decided and recorded, given that the existing contrast script lives in the diagram-design plugin and not in this repository
- [x] No existing token value in the guide has changed
- [ ] The Architect has signed off the section
- [x] The work is committed

## Comments

### 2026-11-17: built, waiting for the Architect's sign-off

The "Map" section is in `references/style-guide.md`, before "Customizing the skin". The diff of the guide only adds lines. One added line sits in the contrast contract and points to the map rows.

#### How the new rows are checked

The Architect chose a check inside this repository, in the map's own test suite.

- **The table.** The guide's "Map contrast rows" table has one row per map token and surface. Each row gives the colour, the surface, the use, the minimum and the measured ratio.
- **The check.** `framework-map/scripts/contrast.ts` measures every row in the light skin. It uses the same WCAG 2.x arithmetic as the plugin's script and blends translucent colours first.
- **The command.** In `framework-map/`, `npm run contrast` prints the ratios and exits with 1 on a finding. `npm run build` runs it, and `npm test` runs the same check on the real guide.
- **What fails.** A row below its minimum fails. So does a Minimum or Measured cell that disagrees with the measurement, a colour or surface that is not a semantic role, and a map token with no row.
- **What it does not check.** It does not check that the scene uses these tokens. It does not check the dark skin, which the map does not have.
- **The plugin's script** still checks the Semantic roles table. It passes on the edited guide, with the same 20 ratios as before.

#### Measured ratios

All are in the light skin. A mark sits on its plate, so marks are measured on `paper-2`.

| Token | Colour | On | Use | Minimum | Measured |
| --- | --- | --- | --- | --- | --- |
| `map-plate-fill` | `paper-2` | `paper` | decorative | none | 1.11:1 |
| `map-plate-edge` | `rule-solid` | `paper` | decorative | none | 1.63:1 |
| `map-cell-line` | `rule` | `paper-2` | decorative | none | 1.26:1 |
| `map-mark-committed` | `ink` | `paper-2` | non-text | 3:1 | 12.84:1 |
| `map-mark-planned` | `ink` | `paper-2` | non-text | 3:1 | 12.84:1 |
| `map-mark-planned` | `ink` | `paper` | non-text | 3:1 | 14.19:1 |
| `map-mark-optional` | `soft` | `paper-2` | non-text | 3:1 | 4.77:1 |
| `map-mark-optional` | `soft` | `paper` | non-text | 3:1 | 5.27:1 |
| `map-mark-guarded` | `muted` | `paper-2` | non-text | 3:1 | 5.94:1 |
| `map-hover-ring` | `ink` | `paper-2` | non-text | 3:1 | 12.84:1 |
| `map-selected-fill` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-bestfit-ring` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-home-cell` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-trace-line` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-trace-line` | `accent` | `paper` | non-text | 3:1 | 5.89:1 |
| `map-focus-outline` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-focus-outline` | `accent` | `paper` | non-text | 3:1 | 5.89:1 |
| `map-faded` | `ink @ 0.12` | `paper-2` | exception | none | 1.26:1 |
| `map-text-name` | `ink` | `paper` | text | 4.5:1 | 14.19:1 |
| `map-text-name` | `ink` | `paper-2` | text | 4.5:1 | 12.84:1 |
| `map-text-tag` | `muted` | `paper` | text | 4.5:1 | 6.57:1 |
| `map-text-tag` | `muted` | `paper-2` | text | 4.5:1 | 5.94:1 |

The four ratios on `paper` for `ink`, `soft`, `muted` and `accent` agree with the plugin's script.

#### For the Architect to sign off

These go beyond what the ticket lists, or fill in something it left open.

1. **Three trace tokens are added.** They are `map-bestfit-ring`, `map-home-cell` and `map-trace-line`, all in `accent`. The spec describes them under the need trace, and ticket 12 would otherwise have to invent them.
2. **Two text tokens are added.** Names are `ink` and counts and tags are `muted`.
3. **Outline widths are set.** Planned is 2 pixels, and optional and guarded are 1 pixel. The hover ring is 1 pixel and sits 2 pixels clear of the mark. Ticket 06 may tune these by eye if planned stays heavier than optional.
4. **A guarded mark has no fill.** The spec gives only its outline. With no fill it also differs from an optional mark by form.
5. **A selected or traced mark loses its decision-class form.** The spec gives it an `accent` fill, so the four steps look alike. The detail card states the decision class.
6. **Type sizes above the floor are first values.** Tier names are 20 pixels, cluster names 13, tool names 12, and counts and tags 11.
7. **The plate and the cell line are classed as decorative.** They sit at 1.11:1, 1.63:1 and 1.26:1. Plate height and the tier and cluster names carry the meaning.

#### One thing for ticket 16

A selected mark is `accent`, and a committed mark beside it is `ink`. The two differ by 2.41:1, which is below 3:1. The contract measures a mark against its plate, where both pass. The guide says selection is never shown by the mark alone. The accessibility review should confirm that holds on screen.

#### How it was built

The tdd skill was called, and the Architect agreed one seam: `checkMapContrast`, which takes the guide's text and returns the measured rows and the findings. The first test was written and seen to fail, then the finding tests were seen to fail before the rules were written. Three of my expected ratios were wrong by 0.03 and were corrected against known greys.

### 2026-11-17: after review

The code-review skill ran a standards review and a spec review of the uncommitted work. The spec review recomputed every ratio in Python and they all match. It confirmed the guide's diff removes no line and `Font source: web` stays.

Fixed in the check, each with a test written first:

- **A row could be measured with the wrong colour.** A row's colour must now be one the token's row in "Map tokens" names.
- **A table with other columns, or with no rule under its header, was read wrongly.** Both are now findings.
- **An opacity such as "0x1" was accepted.** Only a plain number from 0 to 1 passes now.
- **`decorative` was an open way out.** A test now names the only three tokens that may be decorative.

Fixed in the guide:

- **The faded state was unclear.** It now says a `paper` fill stays `paper`, so a faded planned mark does not look like a faded committed one.
- **The reason the cell line is decorative was wrong.** Cluster names appear only from the tier distance. The guide now says the grouping of the marks carries the cluster at the stack distance.

Two more points for the Architect, added to the seven above:

8. **The cell line is 1.26:1, and at the stack distance it is the only drawn edge of a cell.** The ticket fixes it as the `rule` hairline. If the grouping of the marks does not show the cells clearly in ticket 06, the line needs a stronger token.
9. **A `paper` fill is 1.11:1 on a plate.** So planned and optional marks read by their outlines, and optional and guarded differ by the dash and by `soft` against `muted`. Ticket 06 should check by eye that the four steps can be told apart at mark size.

Left as they are:

- **The check accepts one row per token.** It cannot know which surfaces a token sits on. The guide says so.
- **A blank line inside a table ends it**, as it does in rendered Markdown. A token cut off that way is reported as having no row; a second-surface row would not be.
- **The check lives in `scripts/`, and the validator in `src/`.** The validator ships inside the map and the contrast check does not.
- **Findings are sentences, not typed faults** as the validator's are. Nothing reads them but a person.
- **The Map section writes "colour"** and the older parts of the guide write "color". The project's own documents use British spelling.
- **The status is `ready-for-human`** until the Architect signs off the section.
