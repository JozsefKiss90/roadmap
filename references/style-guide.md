# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

This skin is **Ivory and cobalt** — warm ivory paper, deep navy ink, one cobalt accent, slate-navy muted. It was set by hand for the AI 2027 roadmap project (manual tokens, no website source). Swap these values (or run [`onboarding.md`](onboarding.md)) and every new diagram inherits the new skin without touching any type-specific logic.

To generate your own from a website URL, see [`onboarding.md`](onboarding.md).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#bf4520`.

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper` | Page background, default node fill | `#f6f1e7` (ivory) | `#14213d` (deep navy) |
| `paper-2` | Diagram container bg, secondary fill | `#ece6d8` | `#1d2c4f` |
| `ink` | Primary text, primary stroke | `#14213d` (deep navy) | `#f6f1e7` (ivory) |
| `ink-strong` | High-contrast text on accent fills | `#ffffff` | `#0b1226` |
| `muted` | Secondary text, default arrow stroke | `#46557a` (slate-navy) | `#b8c0d4` (mist) |
| `soft` | Sublabels, boundary labels | `#55638a` | `#94a1bd` |
| `rule` | Hairline borders | `rgba(20,33,61,0.12)` | `rgba(246,241,231,0.12)` |
| `rule-solid` | Stronger borders, baselines | `#c4bfb1` (stone) | `rgba(196,191,177,0.25)` |
| `accent` | Focal / 1–2 max per diagram | `#1f4fd8` (cobalt) | `#7fa3ff` |
| `accent-tint` | Fill for accent-bordered boxes | `rgba(31,79,216,0.08)` | `rgba(127,163,255,0.10)` |
| `link` | HTTP/API calls, external arrows | `#0d6b6b` (deep teal) | `#5fc4be` |

> **Palette source:** chosen by hand, not extracted from a site. Three decisions carry the skin: `paper` ivory `#f6f1e7`, `ink` deep navy `#14213d`, `accent` cobalt `#1f4fd8`. The dark skin swaps paper and ink and lifts the accent to `#7fa3ff` so it reads on navy. `link` is a teal rather than the usual blue, because a blue link would be mistaken for the cobalt accent. `ink-strong` is white in the light skin and near-black in the dark one, so text on an accent fill stays legible in both. Every derived value is held to the contrast contract below.

### Contrast contract

Every token must clear the threshold for each role it plays, against the background it actually sits on, in both skins. `scripts/verify-contrast.py` computes the WCAG 2.x ratio for every row above against the `paper` of its skin (`ink-strong` against the 0.85 `accent` fill it labels) and fails CI when one falls short.

| Use | Minimum vs. its actual background |
|---|---|
| Regular text, including any `soft`, `link`, or `accent` used as text | 4.5:1 |
| Large text (24px+, or 18.7px+ at weight 600+) | 3:1 |
| Essential non-text marks: lines, arrows, borders, focus outlines, data points | 3:1 against the adjacent color |
| Decorative rules and translucent tints (`rule`, `rule-solid`, `paper-2`, `accent-tint`, fills at opacity) | No minimum, but never the only carrier of meaning |

- **A token used in several roles must pass each one.** `accent` is a stroke in one place and a label in another, so it is held to 4.5:1, not the 3:1 its strokes alone would need. Don't assume a token is non-text because it usually is.
- **Translucent colors are composited first.** An `rgba()` fill or stroke is blended over `paper` before its ratio is measured. A value that clears the bar at full strength can fail at 0.5 opacity.
- **Surfaces other than `paper` cost contrast.** Inside an `accent-tint` box or on `paper-2` every ratio drops. Measure text placed there against that surface, not against `paper`.
- **Map rows.** The map's tokens are held to this contract by their own rows, under [Map contrast rows](#map-contrast-rows).
- **Current values:** see the ratios printed by `scripts/verify-contrast.py --style-guide <this file>`; every text token clears 4.5:1 in both skins.

### Inversion rule (light → dark)

Any `rgba(20,33,61, X)` in light becomes `rgba(246,241,231, X)` in dark. Same opacities, RGB flipped. The accent gets a slight hue-shift brighter to read on dark paper.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `series-1` | `#7c8f6f` (sage) | `#9caf8f` | Non-focal series |
| `series-2` | `#4f8a86` (dusty-teal) | `#79b5b0` | Non-focal series. Retuned from dusty-blue, which reads as the cobalt accent |
| `series-3` | `#b8915a` (mustard) | `#d3ad7a` | Non-focal series |
| `series-4` | `#9c6b50` (rust-brown) | `#b88670` | Non-focal series |
| `series-5` | `#6e6479` (slate) | `#8d8298` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token | Hex | Purpose |
|---|---|---|
| `terminal-page` | `#0a0a0a` | Page background behind the window |
| `terminal-paper` | `#141414` | Window body, node fill |
| `terminal-bar` | `#1b1b1b` | Titlebar strip |
| `terminal-border` | `#2b2b2b` | Window border, hairlines |
| `terminal-ink` | `#f5f5f5` | Primary text, primary stroke (same white-smoke as default `ink`) |
| `terminal-muted` | `#9a9a9a` | Secondary text, sublabels, ring stroke |
| `terminal-soft` | `#5c5c5c` | Tertiary — inactive dots, spokes |
| `terminal-accent` | `#ff5a36` | The one accent — focal station, prompt sign, active dot |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | Instrument Serif | 1.75rem | 400 | Page H1 |
| `node-name` | Geist (sans) | 12px | 600 | Human-readable labels |
| `sublabel` | Geist Mono | 9px | 400 | Port, protocol, URL, field type |
| `eyebrow` | Geist Mono | 7–8px | 500, tracked 0.18em, uppercase | Type tags, axis labels |
| `arrow-label` | Geist Mono | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | Instrument Serif *italic* | 14px | 400 | Editorial asides only |

### Font stack

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&family=Noto+Serif:ital@0;1&family=Noto+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@400&family=Noto+Sans+TC:wght@400;500;600&family=Noto+Serif+TC:wght@400&display=swap" rel="stylesheet">
```

### Font source

The font source decides whether a diagram makes any network request. It is a skin setting, so a saved profile carries it too.

Font source: `web`

| Value | What ships | Network |
|---|---|---|
| `web` (default) | The Google Fonts `<link>` above; text renders in Instrument Serif, Geist, and Geist Mono | One stylesheet request to `fonts.googleapis.com`, plus the font files |
| `system` | No font `<link>`; every family stack falls through to the platform's own serif, sans, and monospace faces | None |

Use `system` when the user asks for offline output, system fonts, or no Google Fonts, or when this line says `system`. In `system` mode:

- Omit the font `<link>` (and the export `@import`) entirely. Keep every `font-family` stack as written: each one already ends in a generic family (`serif`, `system-ui, sans-serif`, `ui-monospace, monospace`), so a viewer who has Geist installed still gets it and everyone else gets their system face.
- Fallback faces have different metrics from Geist, so keep the 8px label padding intact rather than trimming boxes to the Geist measurement.
- Export with `python3 scripts/export_svg.py <file> --system-fonts`, and verify with `python3 scripts/self_check.py --offline <file>`, which fails if the Google Fonts link is still present.

The render linter's default run (`lint-render.py` with network blocked) measures exactly this fallback rendering, so every shipped template and example is already checked in system-font mode.

To keep the editorial faces with no network at all, install Instrument Serif, Geist, and Geist Mono locally (all three are SIL Open Font License) and use `system`: the stacks resolve to the installed faces first.

### Korean labels

Geist and Instrument Serif carry no Hangul. A Korean `<text>` element extends its own family — never swap the skin:

```svg
<text font-family="'Geist', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">결제 서비스</text>
```

Both Noto faces ship in the font link above, so the web font resolves before any locally installed one and the same file renders identically on macOS, Windows, and a reviewer's browser. The local families follow it for offline viewing. Page titles need the serif equivalent — `'Instrument Serif', 'Noto Serif KR', serif` — or a mixed Latin/Korean title resolves Hangul through the platform's generic serif and the two halves disagree. Google's `css2` endpoint slices Korean by unicode-range, so a diagram with a handful of Korean labels downloads only the slices it touches. The four templates carry both faces because a new diagram may contain Hangul; the shipped Latin-only examples keep the shorter link, since a file with no Hangul has nothing to resolve.

**Width budget.** Measure per character, not per script: **every Unicode wide or full-width character costs 1em, every other character costs its face's Latin advance** (0.60em sans, 0.62em mono), and nonspacing/enclosing marks cost nothing. Sum over the string and multiply by the font size for the text width, then add padding and round the box up to the next multiple of 4. `verify-treemap.py` enforces exactly this text width for treemap cell labels. The skill's `scripts/self_check.py` applies the same width, plus any letter-spacing, to text inside a visible box of any type, and fails a label that runs more than 0.3em past the box edge. Padding, rounding, and labels on paper-coloured arrow-label masks are not checked, so those stay yours to hold.

Counting by script is the trap. `주문 v2.1` is two full-width syllables and five narrow characters; a formula that tallies Hangul, Latin letters, and spaces silently drops `2`, `.`, and `1` and sizes the box for four of its seven characters. Every rendered character costs something — measure per character, never per script.

Three rules follow from Hangul metrics:

- **Sublabels stay Latin.** Ports, protocols, field types, and URLs are Latin anyway — keep `Geist Mono` there and don't translate them. Hangul in a 9px mono sublabel is unreadable and has no mono face to fall back to.
- **Floor of 12px.** Hangul goes muddy below 12px. If a Korean name doesn't fit at 12px, cut the name — don't shrink the type.
- **Arrow labels, eyebrows, and legend text switch register.** Those slots are 7–8px Geist Mono, uppercase and tracked, which Hangul has neither a face nor legibility for. A Korean label in one of those slots becomes 12px sans at weight 500 with no tracking and no uppercase transform, and its mask rect grows to match (16px tall, width from the budget above, still rounded to a multiple of 4). Latin labels in the same diagram keep the mono treatment.

**Load-bearing rule:** Mono is for *technical* content (ports, commands, URLs, field types). Names go in Geist sans. Page title is Instrument Serif. Italic Instrument Serif is reserved for annotation callouts (see [primitive-annotation.md](primitive-annotation.md)). **Never JetBrains Mono** as a blanket "dev" font.

### Traditional Chinese labels

Geist and Instrument Serif carry no Han. A Traditional Chinese `<text>` element extends its own family — never swap the skin:

```svg
<text font-family="'Geist', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif">請求項比對</text>
```

Both Noto TC faces ship in the font link above, so the web font resolves before any locally installed one and the same file renders identically on macOS, Windows, and a reviewer's browser. The local families follow it for offline viewing. Page titles need the serif equivalent — `'Instrument Serif', 'Noto Serif TC', serif` — or a mixed Latin/Han title resolves Han through the platform's generic serif and the two halves disagree. Google's `css2` endpoint slices Chinese by unicode-range, so a diagram with a handful of Chinese labels downloads only the slices it touches.

**Width budget.** The per-character contract above is unchanged: every Unicode wide or full-width character costs 1em, every other character costs its face's Latin advance, and nonspacing marks cost nothing. Full-width punctuation — `（）「」，。：` — is wide and costs 1em as well, which is the part most often dropped.

Counting by script is the trap. `請求項 v2.1` is three full-width characters and five narrow ones; a formula that tallies Han and Latin letters silently drops `2`, `.`, and `1` and sizes the box for six of its nine characters.

Three rules follow from Han metrics, mirroring the Hangul ones:

- **Sublabels stay Latin.** Ports, protocols, field types, and URLs are Latin anyway — keep `Geist Mono` there and don't translate them. Han in a 9px mono sublabel is unreadable and has no mono face to fall back to. A sublabel that is prose rather than a value may be Chinese, but it then switches register by the third rule below.
- **Floor of 12px.** Han packs more strokes than Hangul into the same em box, so the 12px floor binds at least as hard here. If a Chinese name doesn't fit at 12px, cut the name — don't shrink the type.
- **Arrow labels, eyebrows, and legend text switch register.** Those slots are 7–8px Geist Mono, uppercase and tracked, which Han has neither a face nor legibility for. A Chinese label in one of those slots becomes 12px sans at weight 500 with no tracking and no uppercase transform, and its mask rect grows to match (16px tall, width from the budget above, still rounded to a multiple of 4). Latin labels in the same diagram keep the mono treatment.

Simplified Chinese takes the same three rules with the Simplified stack (`'Noto Sans SC'`, `'PingFang SC'`, `'Microsoft YaHei'`). That face does not ship in the link, so Simplified labels still resolve through whatever the viewer has locally.

### Cyrillic labels

Geist and Geist Mono ship Cyrillic (`cyrillic` and `cyrillic-ext` on Google Fonts), so names, sublabels, arrow labels, eyebrows, and legend text in Bulgarian, Russian, Ukrainian, or Serbian keep the Latin treatment: same faces, sizes, tracking, and uppercase. There is no register switch: Hangul and Han switch register because Geist Mono has no face for them, and Geist Mono does cover Cyrillic.

Instrument Serif carries no Cyrillic. A page title extends its family — `'Instrument Serif', 'Noto Serif', serif` — or a mixed Latin/Cyrillic title resolves Cyrillic through whatever face comes next and the two halves disagree. Noto Serif ships in the font link above, upright and italic, so an italic callout in Cyrillic takes the same stack.

**Noto Serif goes ahead of the CJK serifs.** When a stack also lists `'Noto Serif KR'` or `'Noto Serif TC'`, put `'Noto Serif'` ahead of them. Google Fonts slices Cyrillic into those faces as well, so a stack that reaches a CJK face first draws its Cyrillic from it. That is why the templates put `'Noto Serif'` between `'Instrument Serif'` and `'Noto Serif KR'`; Noto Serif has no Hangul or Han, so Korean and Chinese titles pass straight through it.

**Width budget.** The per-character contract above is unchanged: every character costs its face's Latin advance (0.60em sans, 0.62em mono). It fits Geist Mono exactly and Geist sans only on average. Geist Mono is monospaced: a Cyrillic glyph advances exactly as far as a Latin one, so sublabels, arrow labels, eyebrows, legend text, and their mask rects are sized as for Latin. Geist sans is not. Its wide Cyrillic letters, capitals and lowercase alike (such as `Ж Ш Щ Ю Ы`, `ж ш щ ы ю`), run well past the 0.60em average: `Шкаф ODF-2` at 12px is budgeted at 72px and draws at about 76. Rounding the box up to a multiple of 4 recovers at most 3px, so it is not the remedy. Leave the overshoot in the box padding and measure a Cyrillic sans name in the browser — `verify-treemap.py` holds the budget, not the drawn width, so it will not catch the overshoot.

Counting by script is still the trap. `Шкаф ODF-2` is four Cyrillic letters, a space, three Latin letters, a hyphen, and a digit; a formula that tallies Cyrillic letters, Latin letters, and spaces silently drops `-` and `2` and sizes the box for eight of its ten characters.

**Preserve printed labels.** A label the reader matches against a physical thing — a cabinet, a splice closure, a port map — carries the exact printed string. Don't transliterate it and don't re-case it; if one has to sit in an uppercase slot such as an eyebrow, drop the transform for that label rather than re-case the printed string. `Шкаф ODF-2` stays `Шкаф ODF-2`, not `Shkaf ODF-2`.

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` (white) | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Map

The map is the interactive 3D presentation of the Hermes OS tool framework. This section defines what the map needs and the rest of the guide does not cover. It adds tokens and changes none: every map token takes its colour from a semantic role above.

The map uses the light skin only. Its code reads each colour by token name, so a dark skin can be added later from the dark column.

### Map tokens

The stack stands on `paper`. Widths are in pixels on screen. They do not grow as the camera moves closer.

| Token | Value | Use |
|---|---|---|
| `map-plate-fill` | `paper-2` fill | The plate of a tier |
| `map-plate-edge` | `rule-solid` edge, 1px | The edge of a plate |
| `map-cell-line` | `rule` hairline, 1px | The outline of a cell |
| `map-mark-committed` | Solid `ink` fill, no outline | Decision class: committed |
| `map-mark-planned` | `paper` fill, 2px `ink` outline | Decision class: planned |
| `map-mark-optional` | `paper` fill, 1px `soft` outline | Decision class: optional |
| `map-mark-guarded` | No fill, 1px dashed `muted` outline | Decision class: guarded |
| `map-hover-ring` | 1px `ink` ring, 2px clear of the mark | The mark under the pointer |
| `map-selected-fill` | Solid `accent` fill | A selected mark, or a mark in a need trace or phase scrub |
| `map-selected-cell` | 2px `accent` outline | The cell of a selected cluster |
| `map-bestfit-ring` | 2px `accent` ring, 2px clear of the mark | A best-fit tool in a need trace |
| `map-home-cell` | 2px `accent` outline | The home cell of a traced need |
| `map-trace-line` | 1px `accent` line | The line from a home cell to a serving tool, or from an internal skill to its cluster |
| `map-focus-outline` | 2px `accent` outline, with a 2px gap | Keyboard focus, in the panels and on the canvas |
| `map-faded` | `ink @ 0.12` | A mark outside the active lens or filter |
| `map-text-name` | `ink` | Tier, cluster and tool names |
| `map-text-selected` | `accent` | The selected tool's name in the list above its cell, and the selected row's name in the outline |
| `map-text-tag` | `muted` | Counts and tags |
| `map-label-leader` | `soft` hairline, 1px | The line from a cluster name down to its cell, and the bracket from a list of tool names to its cell |

### Decision-class scale

A mark's form shows its decision class in four steps. The map's display table groups the ten decision-class values into these steps.

| Step | Fill | Outline |
|---|---|---|
| Committed | `ink` | None |
| Planned | `paper` | `ink`, 2px, solid |
| Optional | `paper` | `soft`, 1px, solid |
| Guarded | None; the plate shows through | `muted`, 1px, dashed |

The steps differ by form: filled or not, a heavy or a thin outline, a solid or a dashed one. No step differs from another by opacity alone. All marks are the same size.

### Map states

| State | Treatment |
|---|---|
| Hover | `map-hover-ring` is added. The mark itself does not change. |
| Selected or traced | The mark takes `map-selected-fill`, whatever its step. A selected cluster's cell takes `map-selected-cell`. The selected tool's name in the list above its cell takes `map-text-selected`, and so does the selected row's name in the outline. |
| Keyboard focus | `map-focus-outline` is added. |
| Faded | The mark keeps its form. Its `ink`, `soft` or `muted` part turns to `map-faded`, and a `paper` fill stays `paper`. |

A selected or traced mark no longer shows its decision class. The detail card states it. Selection is never shown by the mark alone: the detail card and the outline tree show it too.

### Exceptions to the guide

The map departs from the guide in two places, both on purpose.

1. **`accent` may mark many tools at once.** The guide allows one or two focal elements per diagram. During a need trace or a phase scrub, every tool in the set takes `map-selected-fill`. At rest, `accent` marks only the selection and the keyboard focus.
2. **Faded marks sit below 3:1.** `map-faded` measures 1.26:1 on a plate. The marks inside the set carry the meaning, and a faded mark only has to keep its place. Every faded tool stays reachable through the outline tree and the search.

### Map contrast rows

These rows extend the [contrast contract](#contrast-contract) to the map. Each one names a map token, the semantic role its colour comes from, the surface it sits on, and its use. A mark sits on its plate, so marks are measured on `paper-2`. A token that sits on two surfaces has two rows.

| Token | Colour | Sits on | Use | Minimum | Measured |
|---|---|---|---|---|---|
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
| `map-selected-cell` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-bestfit-ring` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-home-cell` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-trace-line` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-trace-line` | `accent` | `paper` | non-text | 3:1 | 5.89:1 |
| `map-focus-outline` | `accent` | `paper-2` | non-text | 3:1 | 5.33:1 |
| `map-focus-outline` | `accent` | `paper` | non-text | 3:1 | 5.89:1 |
| `map-faded` | `ink @ 0.12` | `paper-2` | exception | none | 1.26:1 |
| `map-text-name` | `ink` | `paper` | text | 4.5:1 | 14.19:1 |
| `map-text-name` | `ink` | `paper-2` | text | 4.5:1 | 12.84:1 |
| `map-text-selected` | `accent` | `paper` | text | 4.5:1 | 5.89:1 |
| `map-text-selected` | `accent` | `paper-2` | text | 4.5:1 | 5.33:1 |
| `map-text-tag` | `muted` | `paper` | text | 4.5:1 | 6.57:1 |
| `map-text-tag` | `muted` | `paper-2` | text | 4.5:1 | 5.94:1 |
| `map-label-leader` | `soft` | `paper` | non-text | 3:1 | 5.27:1 |
| `map-label-leader` | `soft` | `paper-2` | non-text | 3:1 | 4.77:1 |

The plate and the cell line are decorative, so neither may be the only carrier of meaning. Plate height and the tier name carry the tier. The marks of a cell sit together on one grid, with a gap to the next cell, and that grouping carries the cluster at the stack distance. From the tier distance the cluster name carries it too. The `exception` row is the second exception above.

**How the rows are checked.** `scripts/verify-contrast.py` belongs to the diagram-design plugin and reads only the Semantic roles table. The map rows are checked in this repository. In `framework-map/`, `npm run contrast` measures every row in the light skin. It fails on any of these:

- a row below its minimum;
- a Minimum or Measured cell that disagrees with the measurement;
- a colour that the token's row in Map tokens does not name;
- a map token with no row.

The check cannot tell which surfaces a token sits on. Giving a token a row for each surface stays the author's job.

`npm test` and `npm run build` run the same check.

### Map type

| Role | Family | Size on screen | Weight | Usage |
|---|---|---|---|---|
| `map-tier-name` | Instrument Serif | 20px | 400 | Tier names |
| `map-cluster-name` | Geist (sans) | 13px | 600 | Cluster names |
| `map-tool-name` | Geist (sans) | 12px | 500 | Tool names |
| `map-count` | Geist Mono | 11px | 500, tracked 0.08em, uppercase | Tool counts |
| `map-tag` | Geist Mono | 11px | 500, tracked 0.08em, uppercase | Kind, gate and other tags |
| `map-card-name` | Geist (sans) | 20px | 600 | The name at the head of the detail card, and of the list of keys |
| `map-card-body` | Geist (sans) | 13px | 400; 600 for the decision class | Text in the detail card; its opening line is 14px |
| `map-card-note` | Geist (sans) | 12px | 400 | Notes under a value in the detail card |
| `map-card-heading` | Geist Mono | 11px | 600, tracked 0.08em, uppercase | Section headings in the detail card, the rail, the search results and the list of keys |
| `map-rail-row` | Geist (sans) | 13px | 600 for a tier, 500 for a cluster, 400 for a tool; 600 when selected | Rows of the outline. A search result's name and the "Keys" button are 13px at 500, the search field and its "nothing matches" line 13px at 400, and the line under a result is `map-card-note` |
| `map-key` | Geist Mono | 11px | 500 | A key of the keyboard, in a 1px `rule-solid` box |

**Text floor.** No name is drawn below 12 pixels on screen, and no count or tag below 11. The floor holds at every distance and at the smallest supported window, 1280×720. The 7 to 9 pixel sizes in the Typography table are for diagrams and are not used in the map. A size above may be tuned by eye, but never below the floor.

**Fonts.** The map bundles Geist, Geist Mono and Instrument Serif in its one file, through Fontsource, so it makes no network request. The faces are the same as the diagrams use. The guide's own `Font source` stays `web`, and the diagrams keep loading their fonts from the web.

### Map motion

| What moves | Duration |
|---|---|
| Camera flight | 700 ms |
| Lens and filter fade | 250 ms |
| Panel | 200 ms |
| Phase step | 300 ms |

The renderer's own camera transition runs the flights. anime.js runs the fades, the panels and the phase scrub. It never moves the camera or a mark. With reduced motion switched on, every duration is zero. Nothing moves while the partner is not interacting.

### Map postprocessing

- **Antialiasing** is always on.
- **Depth blur** is slight, and is used at the tier and cluster distances only. It is the first thing switched off if frames run slow.
- **No glow.**
- **No vignette.**

---

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: every text token (`ink`, `muted`, `soft`, `link`, and `accent`) must clear 4.5:1 on `paper`, in both skins. See the [contrast contract](#contrast-contract); `scripts/verify-contrast.py` checks it.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Serif + sans + mono**: three families, not more. If brand typography is all sans, keep Instrument Serif for `title` and `callout` anyway — the contrast is load-bearing.
- **Paper is warm-neutral, not pure white**: pure white turns the design sterile. Pick a cream, bone, or light grey with a hint of warmth.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.
