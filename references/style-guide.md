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

The map is the interactive 3D presentation of the Hermes OS tool framework. This section defines what the map needs and the rest of the guide does not cover. It adds tokens and changes none: in the light skin every map token takes its colour from a semantic role above, and the dark skin takes its colours from roles of its own, below.

The map has two skins. It is drawn in the dark one. The light one, which it was first drawn in, keeps its column in the tables below, and its contrast rows are still measured. `SKIN` in `framework-map/src/tokens.ts` names the skin the map is drawn in, and the map's stylesheet carries that skin's values.

The light skin takes every colour from the light column of the semantic roles above. The dark skin is the map's own: it is not the dark column of that table, which is the diagrams' dark skin and stays as it is. `docs/adr/0004` records why.

### Map roles, dark skin

The values the map reads in its dark skin. Nine are the guide's roles with values of the map's own. Seven are roles this skin adds: `paper-3`, `edge`, `count` and the four that begin with `class-`.

| Role | Dark skin | Use on the map |
|---|---|---|
| `paper` | `#0B0B0C` | Page background, rail background, hover label background |
| `paper-2` | `#202024` | The plate of a tier. Also a row or a control under the pointer, and a selected row |
| `paper-3` | `#0E0E10` | The underside of a plate, which shows its thickness |
| `ink` | `#E6E2DA` | Primary text, tier names, the fill of the chosen segment of the lens switch |
| `ink-strong` | `#0B0B0C` | Text on an `ink` or an `accent` fill |
| `muted` | `#9C9890` | Secondary text: section headings, counts in the outline, the build stamp, the search placeholder |
| `soft` | `#9C9890` | The same value as `muted`. It stays a role so that the rules that name it resolve |
| `rule` | `#26262A` | The rail's edge, the lines between sections, the legend's frame, the lines between rows of the outline |
| `rule-solid` | `#3C3C44` | The borders of controls: the search box, the lens switch, a key cap, the line beside an opened row's children |
| `edge` | `#FFFFFF` | The edge of a plate and the line of a cell. The only white on the screen |
| `accent` | `#4DF0B4` | Hover, selection, trace, best fit, home cell, keyboard focus |
| `count` | `#F5C842` | The count line beside each plate, a tier's code in the outline, and the count of all tools beside the lens switch |
| `class-committed` | `rgba(0, 238, 27, 0.9)` | Decision class: committed |
| `class-planned` | `rgba(51, 202, 255, 0.9)` | Decision class: planned |
| `class-optional` | `#A49BC4` | Decision class: optional |
| `class-guarded` | `rgba(255, 83, 124, 1)` | Decision class: guarded |

- **`rule`, `rule-solid` and `edge` are set by hand.** They are opaque, and the [inversion rule](#inversion-rule-light--dark) does not derive them.
- **`count` carries counts and tier codes only.** It is a sixth colour beside `accent` and the four class colours. Used for anything else, it would have to be in the legend.
- **A translucent class colour is composited over its surface** before it is measured, as the contrast contract says.

### Map tokens

The stack stands on `paper`. Widths are in pixels on screen. They do not grow as the camera moves closer. "None" means the skin does not have the token.

| Token | Light skin | Dark skin | Use |
|---|---|---|---|
| `map-plate-fill` | `paper-2` fill | `paper-2` fill | The plate of a tier |
| `map-plate-side` | None | `paper-3` fill, 7px deep on screen | The underside of a plate, seen along its near edges |
| `map-plate-edge` | `rule-solid` edge, 1px | `edge` line, 1px | The edge of a plate, and of its underside |
| `map-cell-line` | `rule` hairline, 1px | `edge` line, 1px | The outline of a cell |
| `map-mark-committed` | Solid `ink` fill, no outline | Solid `class-committed` fill, no outline | Decision class: committed |
| `map-mark-planned` | `paper` fill, 2px `ink` outline | No fill, 2px `class-planned` outline | Decision class: planned |
| `map-mark-optional` | `paper` fill, 1px `soft` outline | No fill, 1px `class-optional` outline | Decision class: optional |
| `map-mark-guarded` | No fill, 1px dashed `muted` outline | No fill, 1px dashed `class-guarded` outline | Decision class: guarded |
| `map-hover-ring` | 1px `ink` ring, 2px clear of the mark | 1px `accent` ring, 2px clear of the mark, and an `accent` fill on the mark | The mark under the pointer |
| `map-hover-cell` | None | 1px `accent` outline, in place of the cell's own line | The cell of the mark under the pointer |
| `map-selected-fill` | Solid `accent` fill | Solid `accent` fill | A selected mark, or a mark in a need trace or phase scrub |
| `map-selected-cell` | 2px `accent` outline | 2px `accent` outline | The cell of a selected cluster |
| `map-bestfit-ring` | 2px `accent` ring, 2px clear of the mark | 2px `accent` ring, 2px clear of the mark | A best-fit tool in a need trace |
| `map-home-cell` | 2px `accent` outline | 2px `accent` outline | The home cell of a traced need |
| `map-trace-line` | 1px `accent` line | 1px `accent` line | The line from a home cell to a serving tool, or from an internal skill to its cluster |
| `map-trace-selected` | 2px `ink` ring, 2px clear of the mark | 2px `ink` ring, 2px clear of the mark | The selection while a need is traced or a phase is shown: a ring on the selected tool's mark, and the outline of a selected cluster's cell |
| `map-focus-outline` | 2px `accent` outline, with a 2px gap | 2px `accent` outline, with a 2px gap | Keyboard focus, in the panels and on the canvas |
| `map-faded` | `ink @ 0.12` | `edge @ 0.12` | A mark outside the active lens or filter |
| `map-text-name` | `ink` | `ink` | Tier, cluster and tool names |
| `map-text-count` | None | `count` | The count line beside each plate, a tier's code in the outline, and the count of the tools beside the lens switch |
| `map-text-selected` | `accent` | `accent` | The selected tool's name in the list above its cell, the selected row's name in the outline, and the traced need's name in the need list |
| `map-text-tag` | `muted` | `muted` | Counts and tags. Also a tool's name in the list above its cell, when the lens or the filters leave the tool out, and a tier's name when the lens leaves none of its tools in reach |
| `map-label-leader` | `soft` hairline, 1px | `muted` line, 1px, and from the hover label an `accent` line, 1px | The line from a cluster name down to its cell, and the bracket from a list of tool names to its cell. In the dark skin also the line from the hover label toward its mark |

In the dark skin a planned or an optional mark has no fill, so the plate shows through every outlined mark and the only filled marks at rest are the committed ones. The fill is itself a signal.

### Decision-class scale

A mark's form shows its decision class in four steps. The map's display table groups the ten decision-class values into these steps. In the light skin:

| Step | Fill | Outline |
|---|---|---|
| Committed | `ink` | None |
| Planned | `paper` | `ink`, 2px, solid |
| Optional | `paper` | `soft`, 1px, solid |
| Guarded | None; the plate shows through | `muted`, 1px, dashed |

In the dark skin each step also has a colour of its own:

| Step | Colour | Fill | Outline |
|---|---|---|---|
| Committed | `class-committed` | Solid | None |
| Planned | `class-planned` | None; the plate shows through | 2px, solid |
| Optional | `class-optional` | None; the plate shows through | 1px, solid |
| Guarded | `class-guarded` | None; the plate shows through | 1px, dashed |

The steps differ by form in both skins: filled or not, a heavy or a thin outline, a solid or a dashed one. No step differs from another by opacity alone, and in the dark skin none differs by colour alone. All marks are the same size.

### Map states

| State | Treatment |
|---|---|
| Hover | `map-hover-ring` is added. In the light skin the mark itself does not change. In the dark skin the mark fills `accent` under the ring, and its cell takes `map-hover-cell`: the ring alone was too small to find on the dark plate. The hover label opens beside the mark in both. |
| Selected or traced | The mark takes `map-selected-fill`, whatever its step. A selected cluster's cell takes `map-selected-cell`. The selected tool's name in the list above its cell takes `map-text-selected`, and so does the selected row's name in the outline. In a need trace, a best-fit tool's mark also takes `map-bestfit-ring`, the need's home cell takes `map-home-cell`, and the traced need's name in the need list takes `map-text-selected`. The traced need's row in the need list, and the row at the head of a tool's detail card that leads back to the need, stand on `paper-2` with a 2px `accent` bar at the left, as the outline's selected row does. |
| Selected while a need is traced, or a phase is shown in the phase scrub | `map-selected-fill` then means "traced", so the selection is drawn in `ink`. The selected tool's mark keeps the form the trace gives it and takes `map-trace-selected`, outside a best-fit ring if it has one. A selected cluster's cell takes the same line as its outline, so that it is not taken for the home cell. |
| Best-fit ring among small marks | A best-fit ring never reaches a neighbouring mark. Where the marks are drawn too small for the token's gap and width, the ring keeps to the space between two marks and its line thins with it, to no less than 1px. |
| Keyboard focus | `map-focus-outline` is added. |
| Faded | The mark keeps its form. Its `ink`, `soft` or `muted` part turns to `map-faded`, and a `paper` fill stays `paper`. In the dark skin it is the mark's class colour that turns to `map-faded`. The tool's square in the outline fades the same way, and the text of its row takes `soft`. Its name in the list above its cell takes `map-text-tag`. |

A selected or traced mark no longer shows its decision class. The detail card states it. Selection is never shown by the mark alone: the detail card and the outline tree show it too.

### Map geometry

| Property | Value |
|---|---|
| Corner radius | None, anywhere: plates, cells, marks, rings, controls, key caps, labels and the legend are square. The guide's `radius-*` tokens are not used in the map |
| Plate | Its face takes `map-plate-fill` and a `map-plate-edge` line. Under it is its underside: the same rectangle with the same line, in `map-plate-side`, drawn 7px lower on screen whatever the camera's distance. It gives the plate its thickness. No side of the plate is lit or shaded |
| Shadows, glow, gradients, blur, vignette | None |

Where the plates stand, how large they are and how the camera sees them are the layout's, and are the same in both skins.

### Exceptions to the guide

The map departs from the guide in three places, all on purpose.

1. **`accent` may mark many tools at once.** The guide allows one or two focal elements per diagram. During a need trace or a phase scrub, every tool in the set takes `map-selected-fill`. At rest, `accent` marks only the selection and the keyboard focus.
2. **Faded marks sit below 3:1.** `map-faded` measures 1.26:1 on a plate in the light skin and 1.45:1 in the dark one. The marks inside the set carry the meaning, and a faded mark only has to keep its place. Every faded tool stays reachable through the outline tree and the search.
3. **The dark skin is not the guide's dark column.** Its roles are in [Map roles, dark skin](#map-roles-dark-skin). `rule`, `rule-solid` and the plate's `edge` are set by hand and not by the inversion rule, and the four decision-class steps and the counts have colours of their own. `docs/adr/0004` gives the reasons.

Two things about the dark skin are known and accepted.

- **`accent` sits close to two class colours.** It measures 1.32:1 against a committed mark and 1.56:1 against a planned one. Hover and selection are never shown by colour alone: the ring, the cell's outline, the hover label and the detail card show them too. If a trace of many tools reads as a field of committed marks, `accent` takes the value of `count`, and `count` another.
- **Every cell has a white line.** It stays at 1px: a heavier one would compete with the 2px outline of a planned mark.

### Map contrast rows

These rows extend the [contrast contract](#contrast-contract) to the map. Each one names a map token, the semantic role its colour comes from, the surface it sits on, and its use. A mark sits on its plate, so marks are measured on `paper-2`. A token that sits on two surfaces has two rows. This table is the light skin's. The dark skin's follows it.

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
| `map-trace-selected` | `ink` | `paper-2` | non-text | 3:1 | 12.84:1 |
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

The plate and the cell line are decorative, so neither may be the only carrier of meaning. Plate height and the tier name carry the tier. Where the stack stands back beside a need's detail card and the plates come too close for the names, the count carries it in the name's place: it begins with the tier's code, and the outline names the tier. Under the bar, in the narrow and the upright page layout, a tag over each plate carries it: the tier's code and name, with the name cut short where it has no room. The marks of a cell sit together on one grid, with a gap to the next cell, and that grouping carries the cluster at the stack distance. From the tier distance the cluster name carries it too. The `exception` row is the second exception above.

**How the rows are checked.** `scripts/verify-contrast.py` belongs to the diagram-design plugin and reads only the Semantic roles table. The map rows are checked in this repository. In `framework-map/`, `npm run contrast` measures every row of both tables, each with the roles of its own skin. It fails on any of these:

- a row below its minimum;
- a Minimum or Measured cell that disagrees with the measurement;
- a colour that the token's value in Map tokens does not name for that skin;
- a map token of a skin with no row in that skin's table.

The check cannot tell which surfaces a token sits on. Giving a token a row for each surface stays the author's job.

`npm test` and `npm run build` run the same check.

### Map contrast rows, dark skin

The same rows for the dark skin, measured with the [roles of that skin](#map-roles-dark-skin). The last four rows measure a role on its own: the text on a filled control, and the two rules.

| Token | Colour | Sits on | Use | Minimum | Measured |
|---|---|---|---|---|---|
| `map-plate-fill` | `paper-2` | `paper` | decorative | none | 1.21:1 |
| `map-plate-side` | `paper-3` | `paper` | decorative | none | 1.02:1 |
| `map-plate-edge` | `edge` | `paper` | decorative | none | 19.67:1 |
| `map-cell-line` | `edge` | `paper-2` | decorative | none | 16.24:1 |
| `map-mark-committed` | `class-committed` | `paper-2` | non-text | 3:1 | 8.49:1 |
| `map-mark-planned` | `class-planned` | `paper-2` | non-text | 3:1 | 7.15:1 |
| `map-mark-planned` | `class-planned` | `paper` | non-text | 3:1 | 8.47:1 |
| `map-mark-optional` | `class-optional` | `paper-2` | non-text | 3:1 | 6.23:1 |
| `map-mark-optional` | `class-optional` | `paper` | non-text | 3:1 | 7.55:1 |
| `map-mark-guarded` | `class-guarded` | `paper-2` | non-text | 3:1 | 5.24:1 |
| `map-hover-ring` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-hover-cell` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-selected-fill` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-selected-cell` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-bestfit-ring` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-home-cell` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-trace-line` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-trace-line` | `accent` | `paper` | non-text | 3:1 | 13.53:1 |
| `map-trace-selected` | `ink` | `paper-2` | non-text | 3:1 | 12.57:1 |
| `map-focus-outline` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `map-focus-outline` | `accent` | `paper` | non-text | 3:1 | 13.53:1 |
| `map-faded` | `edge @ 0.12` | `paper-2` | exception | none | 1.45:1 |
| `map-text-name` | `ink` | `paper` | text | 4.5:1 | 15.23:1 |
| `map-text-name` | `ink` | `paper-2` | text | 4.5:1 | 12.57:1 |
| `map-text-count` | `count` | `paper` | text | 4.5:1 | 12.39:1 |
| `map-text-count` | `count` | `paper-2` | text | 4.5:1 | 10.22:1 |
| `map-text-selected` | `accent` | `paper` | text | 4.5:1 | 13.53:1 |
| `map-text-selected` | `accent` | `paper-2` | text | 4.5:1 | 11.16:1 |
| `map-text-tag` | `muted` | `paper` | text | 4.5:1 | 6.85:1 |
| `map-text-tag` | `muted` | `paper-2` | text | 4.5:1 | 5.65:1 |
| `map-label-leader` | `muted` | `paper` | non-text | 3:1 | 6.85:1 |
| `map-label-leader` | `muted` | `paper-2` | non-text | 3:1 | 5.65:1 |
| `map-label-leader` | `accent` | `paper` | non-text | 3:1 | 13.53:1 |
| `map-label-leader` | `accent` | `paper-2` | non-text | 3:1 | 11.16:1 |
| `ink-strong` | `ink-strong` | `ink` | text | 4.5:1 | 15.23:1 |
| `ink-strong` | `ink-strong` | `accent` | text | 4.5:1 | 13.53:1 |
| `rule` | `rule` | `paper` | decorative | none | 1.31:1 |
| `rule-solid` | `rule-solid` | `paper` | decorative | none | 1.80:1 |

The plate, its underside, its edge and the cell line are decorative here too, and the same things carry the tier and the cluster. The white edge measures far above any minimum, but it is not what tells one tier from the next.

### Map type

| Role | Family | Size on screen | Weight | Usage |
|---|---|---|---|---|
| `map-title` | Instrument Serif | 32px | 400, on a line of 1.05 | The map's title at the head of the rail. It is 20px on one line where a part of the rail is open under the bar |
| `map-tier-name` | Instrument Serif | 26px | 400 | Tier names |
| `map-cluster-name` | Geist (sans) | 13px | 600 | Cluster names |
| `map-tool-name` | Geist (sans) | 12px | 500 | Tool names |
| `map-count` | Geist Mono | 11px | 400, tracked 0.10em, uppercase | Tool counts, on the canvas, beside the lens switch and in the filters. A count drawn on the canvas has no tracking, and a tier's count line in the static picture is tracked 0.12em. Also a phase and its number of needs, in the need list. A tier's count line beside its plate and the count beside the lens switch are in `map-text-count`, and so is a tier's code in the outline, which has no tracking. A tier's code and name over its plate under the bar are in the same face at 10px |
| `map-tag` | Geist Mono | 11px | 500, tracked 0.08em, uppercase | Kind, gate and other tags in the detail card. A tag in the rail or the search results is at 400, tracked 0.10em. The build stamp is at 400, tracked 0.04em, on a line of one and a half times its size, all of it in `muted`, with the build identifier in the small letters a commit is written in |
| `map-card-name` | Geist (sans) | 20px | 600 | The name at the head of the detail card, and of the list of keys |
| `map-card-body` | Geist (sans) | 13px | 400; 600 for the decision class | Text in the detail card; its opening line is 14px |
| `map-card-note` | Geist (sans) | 12px | 400 | Notes under a value in the detail card, and the line beside "Needs" that asks for a need |
| `map-card-heading` | Geist Mono | 11px | 600, tracked 0.08em, uppercase | Section headings in the detail card |
| `map-rail-heading` | Geist Mono | 11px | 400, tracked 0.10em, uppercase, in `muted` | Section headings in the rail, the search results and the list of keys. The tag at the head of the legend is the same at 500, tracked 0.12em, in `ink-strong` on `ink` |
| `map-rail-row` | Geist (sans) | 13px | 400; 600 for a row that is opened, selected, or where the map is | Rows of the outline. A search result's name is 13px at 500, the "Keys" button and the "nothing matches" line 13px at 400, the search field 14px at 400, and the line under a result is `map-card-note`. A filter's name, "Committed only" and "Clear" are 13px at 500, and a filter's values 13px at 400. A row of the need list is 13px at 400, and 600 when its need is traced. A segment of the lens switch is 13px at 400, and 600 when chosen. The segment of the lens switch that is chosen is filled with `ink` and named in `ink-strong`, "None" as much as a lens; a chosen role takes `paper-2` and a 2px `ink` ring. A step of the phase strip has its phase at 13px and 600 over its counts in `map-card-note`; the phase that is shown takes `paper-2` and the 2px `ink` ring, as a chosen role does |
| `map-key` | Geist Mono | 11px | 400, in `muted` | A key of the keyboard, in a 1px `rule-solid` box |
| `map-hover-label` | Geist Mono and Geist (sans) | 11px, 13px and 12px | 400 | The three lines of the hover label: where the mark stands, in the mono face, tracked 0.10em, uppercase, in `accent`; the tool's name at 13px; and the name of its decision-class step at 12px in `muted`, beside the step's square |

**Tier labels stand in the scene.** A tier's count and name stand upright at the left end of its plate and run along it, so they turn and tilt with the stack. The sizes above are their sizes with the stack at rest. From another angle a label is seen as its plate is, and it never shrinks as the camera stands back. Cluster and tool names face the camera and keep their size at every angle.

The switch for the single keys, in the list of keys, is a checkbox as the filters have them, with its name at 13px and 500 and a line in `map-card-note`, `muted`, under it.

**Text floor.** No name is drawn below 12 pixels on screen, and no count or tag below 11. The one exception is the tag that gives a tier's code and name over its plate under the bar: it is 10 pixels, so that the longest tier name has room in a phone's window. The floor holds at every distance and at the smallest supported window, 360×640. Nothing is made to fit by drawing it smaller: a name that has no room is left out, and a panel says it in its place. The 7 to 9 pixel sizes in the Typography table are for diagrams and are not used in the map. A size above may be tuned by eye, but never below the floor.

**Panels.** They stand on `paper`, with square corners.

- **The rail** is 240 pixels wide, with a 1px `rule` at its right edge. Its parts stand 20 pixels in from each side and 22 pixels under one another, and the title 28 pixels from the top. The lines between its parts are `rule`. The borders of its controls are `rule-solid`: the search box, 40 pixels high, the lens switch, with segments 32 pixels high, and a key cap. A checkbox keeps a `soft` border, because the border is all there is of it until it is chosen.
- **The outline** has a `rule` under each tier. A tier's code stands in a 20-pixel column, in `map-text-count`. What an opened row holds stands in from it, behind a 1px `rule-solid` line. A name too long for its row takes a second line and is not cut, as the text-spacing rule below asks.
- **The legend** stands 32 pixels in from the rail and from the foot of the window, in a 1px `rule` frame. Its tag, "Decision class", comes first. Then each step and each state stands 34 pixels high, with a 12-pixel square in the form and colour of its mark and its name at 13px, and a `rule` between two of them. A state, which is not a decision class, stands behind a `rule-solid` line. The last is the mark under the pointer, "Hover / selected", which is "Hover" while tools are traced. Beside an open detail card they take a second row where they must, and the phase strip stands over the legend however high it is.
- **The hover label** has a 1px `accent` border and stands to the right of the pointer and above it. A 1px `accent` leader, 20 pixels long, runs in the pointer's own column from the label's near edge toward the mark, and ends short of it.
- **What lies behind an open panel is dimmed** with `paper` at 72%: the canvas beside the open rail, and the page behind the list of keys.

**Page layouts.** There are four, by the size and shape of the window. The canvas is the main thing on screen in each.

| Layout | Window | Rail | Detail card | Legend |
|---|---|---|---|---|
| Full | 1366 pixels wide and more | Open, 240 pixels | At the right, 360 pixels | On show, bottom left |
| Compact | 1024 to 1365 pixels wide | A 56-pixel column of icons | At the right, 360 pixels | On show, bottom left |
| Narrow | 480 to 1023 pixels wide, and wider than tall | The bar: a 52-pixel row of icons, with the breadcrumb in it | Under the bar at the right, 360 pixels or half the window if that is less | On request |
| Upright | Under 1024 pixels wide and at least as tall as wide; every window under 480 pixels | The bar, with the breadcrumb in a 44-pixel row under it | At the bottom, 45% of the height | On request |

- **Icons.** In the column an icon is a 40-pixel button with a 20-pixel Lucide icon in `muted`, which turns `ink` on `paper-2` under the pointer. In the bar the button is 44 pixels. The icon of a lens that is on, of filters that are chosen, or of the open legend is `ink` on `paper-2`.
- **The open rail.** In the compact layout an icon opens the whole rail over the canvas. Under the bar an icon opens its own part alone, 320 pixels wide, with the title on one line at 20px Instrument Serif and the build stamp at its foot; the lens switch and the need list open together. The search box has no foot, so its results have the room. The canvas beside the open rail is dimmed, as the page is behind the list of keys.
- **Under the bar, names that have no room are left out.** At the stack distance the tier names have no room beside the stack at their own size. Each tier's code and name stand on the far edge of its plate instead, as one tag in the face of `map-count` at 10px, with no count. The tag has the colour of a name, `map-text-name`, and `map-text-tag` where the lens leaves none of the tier's tools in reach. Every name has room from 324 pixels wide. A name that would still run out of the window is cut short, with an ellipsis, as a tool's name is in the list above its cell. The names of a tier's clusters, and of a cluster's tools, stand above the plate or the cell only where the window has room for them. A line in `map-card-note`, `muted`, under the breadcrumb then says what to choose, and the detail card and the outline give the names.
- **The phase strip** has the two counts of a step one over the other wherever it has no room for five steps with their counts side by side: on a phone, where five steps then fit 360 pixels, and beside the detail card in a window under 1,072 pixels.
- **Nothing slides.** A part of the rail, the detail card and the legend open by their opacity in every layout, over the panel duration.

**Touch.** Where a touch screen is the main pointer, every control is at least 44 by 44 pixels, in every page layout, and the search field is set at 16px. A laptop with a touch screen has a mouse for its main pointer and keeps the sizes above. On the canvas a tap selects, a drag orbits and a pinch changes the distance. A finger held in place for half a second shows the hover label, 28 pixels clear of the finger, with `map-hover-ring` on the mark; it stays until the next touch. A mark drawn under 10 pixels is too small for a finger, and a tap on it is a tap on its cell.

**Pointer.** Where a mouse is the main pointer, every control is at least 24 by 24 pixels. A name in the detail card that selects what it names, and a link there, stand on a 20-pixel line and take the rest as padding. The chevron of an outline row is a control of its own, 24 pixels with its padding, and 44 where a touch screen is the main pointer. A crumb of the breadcrumb that gives way to the others keeps 24 pixels.

**Text spacing.** No name of a control is cut where a partner sets wider letter, word and line spacing. A segment of the lens switch, a role or a step of the phase strip takes a second line: its height is a least height. The two counts of a phase step break between them and never inside one.

**Static picture.** Where the browser has no WebGL, the page shows the stack at rest as a flat drawing. Its plates and their undersides, its cells and its marks take the same map tokens as the scene, its tier names are `map-tier-name` and its counts `map-count`. The names and counts are text of the page, and are never drawn smaller. In a window too narrow for the names beside the plates, each tier's count and name stand over its plate, and the plates alone are drawn smaller to fit the width.

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
- **Depth blur** is slight, and is used at the tier and cluster distances only. It is the first thing switched off if frames run slow. The dark skin has none: the map is drawn in that skin, so the blur is switched off.
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
