# Markdown to HTML and back without loss

Research ticket for the Markdown Engine (Agentic OS). Date: 2026-11-22.

**Question.** How can the Markdown Engine turn markdown into HTML and back so that a round trip changes nothing? And what does [DIY-Smart-Code/agent-html-kit](https://github.com/DIY-Smart-Code/agent-html-kit) contribute to that?

**Short answer.** agent-html-kit does not help here. It renders markdown to HTML in one direction only and has no HTML-to-markdown step. A byte-identical round trip through a parse tree cannot be done with any library tested: every markdown serializer re-prints the tree in its own style. What you can get is a **fixed point**. The first pass normalises the note, and every later round trip returns the same bytes. With the unified stack (remark/rehype) and a few custom handlers, frontmatter, wikilinks, tables and embedded HTML all survive. Obsidian callouts and embeds need dedicated plugins in both directions, or the serializer escapes them and breaks them.

How the evidence was gathered: the source code of agent-html-kit and the official READMEs, plus a local experiment. The experiment ran one Obsidian-style test note through each pipeline (Node 22, unified 11, remark-parse 11, remark-stringify 11, remark-gfm 4.0.1, remark-frontmatter 5, remark-rehype 11.1.2, rehype-remark 10.0.1, remark-wiki-link 2.0.1, turndown 7.2.5, jsdom 29). The test note contained: YAML frontmatter; `[[Project Alpha]]`, `[[Project Alpha#Goals|the goals]]` and `![[diagram.png]]`; `*` and `-` bullets; `1)` ordered lists; `_em_` and `__strong__`; an aligned GFM table; a `> [!warning]` callout; a raw `<details>` block; a setext heading; a two-space hard break; hard-wrapped lines; a fenced code block.

---

## 1. What agent-html-kit is

| Fact | Value | Source |
|---|---|---|
| What it is | "Demo: HTML pages from a coding agent at markdown token cost. A component kit, a Claude Code skill, and the 72-run benchmark behind it." | [GitHub API repo description](https://api.github.com/repos/DIY-Smart-Code/agent-html-kit) |
| Self-description | "**A demo, not a product.** … It is not a finished, production-ready library: the kit covers a few components, has no tests" | [README](https://github.com/DIY-Smart-Code/agent-html-kit#readme) |
| Licence | MIT | [LICENSE](https://github.com/DIY-Smart-Code/agent-html-kit/blob/main/LICENSE), GitHub API `license.spdx_id` |
| Activity | Created 2026-10-12. 4 commits, all on 2026-10-12/13 (v1.0, v1.1, two README edits). No push since 2026-10-13. 55 stars, 9 forks, 1 open issue (a feature request for chart/diagram options, 2026-10-14). | [commits API](https://api.github.com/repos/DIY-Smart-Code/agent-html-kit/commits), [issues API](https://api.github.com/repos/DIY-Smart-Code/agent-html-kit/issues?state=all) |
| Code | `kit/kit.js` (763 lines: CSS, web components, a markdown renderer), `kit/md2html.js` (26 lines), `skill/SKILL.md` | repo tree |

Its goal is **token cost**, not fidelity. An agent writes short content using `rk-*` custom elements (`rk-header`, `rk-table`, `rk-callout`, `rk-chart`, `rk-diagram`, `rk-board`…), and `kit.js` draws them in the browser. The benchmark compares output tokens of markdown, freeform HTML, HTML + kit and markdown + renderer ([README "Results"](https://github.com/DIY-Smart-Code/agent-html-kit#results)).

### How it maps markdown to HTML

- `md2html.js` does not convert anything. It wraps the **unchanged markdown source** in a one-line page: `<rk-md><script type="text/markdown">…source…</script></rk-md>`. The only change is escaping `</script` as `<\/script` ([kit/md2html.js](https://github.com/DIY-Smart-Code/agent-html-kit/blob/main/kit/md2html.js)).
- In the browser, `renderMarkdown()` in `kit.js` turns that text into DOM. It is a hand-written, line-based subset parser: headings, lists, task lists, `|` tables, `>` quotes, fenced blocks, `---` rules, plus an inline regex subset (`**`, `*`, `~~`, `` ` ``, links, images, `[done]` pills, ticket IDs) ([kit.js lines 145–165, 600–700](https://github.com/DIY-Smart-Code/agent-html-kit/blob/main/kit/kit.js)). The README says: "It is not a full CommonMark implementation."
- Special fences (`chart`, `diagram`, `board`, `stats`, `steps`) and `> Note:` / `> Risk:` quotes become kit components.

### How it maps HTML back to markdown

**It does not.** No HTML-to-markdown converter exists in the repo. The only markdown output is the board's "Export as markdown" button, which writes `## Column` plus `- ID title` lines for the cards in each column (`kit.js` lines 591–597).

The kit's one useful idea for us is a side effect of `md2html.js`: the HTML file **carries the original markdown verbatim**. You can get the source back byte-for-byte by reading the `<script type="text/markdown">` block. That works because nothing was translated, so edits made to the rendered DOM do not flow back.

### What its renderer loses (run in jsdom on the test note)

| Feature | Result in agent-html-kit |
|---|---|
| YAML frontmatter | Becomes `<hr>`, then one paragraph `title: Weekly review tags: [...] status: draft`, then `<hr>` |
| `[[wikilinks]]`, `![[embeds]]` | Left as literal text |
| `_em_`, `__strong__` | Left as literal text (only `*`/`**` are recognised) |
| GFM table | Rendered, but column alignment is dropped |
| `> [!warning]` callout | Plain `<blockquote>` with literal `[!warning]` (only `> Note:` / `Risk:` / `Warning:` / `OK:` are callouts) |
| Raw HTML `<details>` | Escaped and shown as text |
| Setext heading | Paragraph followed by `<hr>` |
| Hard break, hard wraps | Lines joined with spaces, `<br>` lost |
| `*` list then `-` list | Merged into one `<ul>` |

Conclusion: as a markdown-to-HTML engine for an Obsidian vault, agent-html-kit loses information, and it has no way back. Only its *pattern* is worth borrowing: keep the markdown source next to the HTML, and keep design out of the content.

---

## 2. What survives a round trip in the TypeScript stack

### Pipelines tested

- **A. md → md** (no HTML): `remark-parse` + `remark-frontmatter` + `remark-gfm` → `remark-stringify`.
- **B. md → HTML → md, stock**: `remark-rehype` (`allowDangerousHtml`) + `rehype-raw` + `remark-wiki-link` → HTML → `rehype-parse` + `rehype-remark` + `remark-gfm` → `remark-stringify`.
- **C. Turndown**: B's HTML → `turndown` (default rules, no GFM plugin).
- **D. md → HTML → md, custom handlers**: like B, plus `remark-rehype` handlers that emit `yaml` as `<script type="application/yaml" data-frontmatter>`, `wikiLink` as `<a data-wikilink data-alias>`, and raw `html` nodes as `<template data-raw-html>`. Matching `rehype-remark` handlers map these back to mdast nodes, with `newlines: true`.

### Results

| Pipeline | Byte-identical to source? | Fixed point? |
|---|---|---|
| A md→md | No | Yes, after pass 1 |
| B stock md→HTML→md | No | Yes, after pass 2 (md and HTML stop changing from the 2nd trip) |
| C turndown | No | No, still changing after pass 1 |
| D custom handlers | No | Yes, after pass 1 |

| Feature | A md→md | B stock via HTML | C turndown | D custom via HTML |
|---|---|---|---|---|
| YAML frontmatter | kept verbatim | **dropped** (the `yaml` node has no HTML form) | **dropped** | kept verbatim |
| `[[Note]]`, `[[Note#H\|alias]]` | **escaped to `\[\[Note]]`** when no wiki plugin is loaded, which breaks the link in Obsidian | turned into ordinary `[text](#/page/…)` links, wikilink lost | same as B | kept as written |
| `![[embed]]` | escaped `!\[\[…]]` (broken) | escaped (broken) | escaped (broken) | escaped (broken); `remark-wiki-link` 2.x has no embed syntax |
| GFM table | kept; re-padded, alignment kept | kept; re-padded | **flattened to loose text** | kept; re-padded |
| `> [!warning]` callout | escaped to `\[!warning]` (no longer a callout in Obsidian) | escaped, and lines joined | escaped, and lines joined | escaped |
| Raw HTML block | kept verbatim | **converted to markdown text** (`Raw HTML` / `Hidden **bold**`) | converted | kept verbatim |
| `_em_` / `__strong__` | rewritten to `*em*` / `**strong**` | rewritten | `_em_` / `**strong**` | rewritten |
| `1)` ordered | rewritten to `1.` | rewritten | rewritten | rewritten |
| Setext heading | rewritten to `## ATX` | rewritten | rewritten | rewritten |
| Hard break (two spaces) | rewritten to `\` | rewritten to `\` | kept as two spaces | rewritten to `\` |
| Hard-wrapped paragraph lines | kept | **joined into one line** | joined | kept (thanks to `newlines: true`) |
| Runs of spaces inside text | kept | collapsed to one space | collapsed | collapsed |
| Adjacent `*` list then `-` list | kept separate (blank line inserted) | kept separate | kept separate | kept separate |
| Fenced code with language | kept | kept | kept | kept |

Why this happens:

- **The tree does not record surface style.** mdast keeps the meaning (emphasis, list, heading level) but not which marker was typed. On output, `remark-stringify` uses one configured marker per construct (`bullet`, `emphasis`, `strong`, `rule`, `setext`, `fence`, `listItemIndent`, `bulletOrdered`, …) ([remark-stringify options](https://github.com/remarkjs/remark/tree/main/packages/remark-stringify#options), via Context7 `/remarkjs/remark`). So the first pass rewrites the note into one house style, and every pass after that reproduces the same bytes.
- **HTML collapses whitespace.** `hast-util-to-mdast` (used by `rehype-remark`) collapses whitespace. Its `newlines` option only keeps line endings ([hast-util-to-mdast readme, `newlines`](https://github.com/syntax-tree/hast-util-to-mdast#newlines)). Runs of spaces are therefore lost in any trip through HTML.
- **Unknown syntax gets escaped.** If the serializer does not know a construct, it escapes characters that might otherwise be read as markdown. Without plugins, `[[x]]`, `![[x]]` and `[!note]` turn into `\[\[x]]`, `!\[\[x]]` and `\[!note]`. That is harmless in CommonMark but **breaks Obsidian semantics**. Every Obsidian construct the vault uses must have a parser **and** a `toMarkdown` extension, loaded on both sides.
- **HTML has no slot for some nodes.** Frontmatter and raw HTML become nothing, or plain content, unless you map them to an element that carries the original value (pipeline D).

### What the Obsidian syntax covers

Obsidian "supports CommonMark, GitHub Flavored Markdown, and LaTeX". On top of that it adds internal links `[[Link]]`, embeds `![[Link]]`, block references `![[Link#^id]]`, block IDs `^id`, comments `%%Text%%`, highlights `==Text==` and callouts `> [!note]` ([Obsidian Flavored Markdown](https://obsidian.md/help/obsidian-flavored-markdown)). Plugin support in the unified ecosystem:

| Need | Plugin | Status (npm, 2026-11-22) | Notes |
|---|---|---|---|
| Frontmatter | `remark-frontmatter` 5.0.0 (MIT, remarkjs org) | maintained | Parses and serialises the YAML block verbatim. Parse the YAML yourself; do not re-dump it, or you lose quoting and comments. |
| GFM tables, tasks, strike, footnotes | `remark-gfm` 4.0.1 (MIT) | maintained | Tables are re-padded on output. |
| Wikilinks | `remark-wiki-link` 2.0.1 (MIT) | last published 2023-10 | Has `aliasDivider` (default `:`; set `'\|'` for Obsidian) and a `toMarkdown` extension; no `![[embed]]` ([readme](https://github.com/landakram/remark-wiki-link)) |
| Wikilinks + embeds, Obsidian path resolution | `@flowershow/remark-wiki-link` 4.1.0 (MIT) | active (published 2026-11-19) | Supports `[[…]]` and `![[…]]`, `format: "shortestPossible"` (Obsidian-style matching), and `aliasDivider` "during both parsing and stringification" (package README). **The 4.1.0 tarball shipped without its `dist/` folder, so it failed to import**; pin an earlier 4.0.x and re-check. |
| Callouts | `@r4ai/remark-callout` 0.6.2, `remark-callout` 1.1.1, `@portaljs/remark-callouts` 1.0.5 (all MIT) | last releases 2023–2024 | These target md→HTML rendering. Check each for a `toMarkdown` handler before relying on it; a small custom `blockquote` handler may be simpler. |
| Everything Obsidian | `remark-obsidian` 1.15.0 | active | **GPL-3.0**: a licence risk for the dashboard. |

### Other options

- **turndown** (MIT, 7.2.5): an HTML-to-markdown converter built on rules. It does not pair with a parser, so it cannot guarantee a fixed point; in the test it flattened tables (no GFM plugin) and kept changing on the second pass. Not suitable as the engine.
- **Milkdown** (`@milkdown/core` 7.23, MIT) and **Tiptap** (`@tiptap/markdown` 3.35, MIT): WYSIWYG editors built on ProseMirror. Milkdown uses remark for markdown in and out, so it normalises the same way as pipeline A. They make sense if the dashboard needs rich editing, but they do not avoid normalisation.
- **Source-position patching**: every mdast node has `position.start/end.offset` into the source ([unist positions](https://github.com/syntax-tree/unist#position)). If HTML elements carry `data-src-start/end`, an edit in the dashboard can be applied as a **text splice** of only the changed node's markdown, and every other byte of the file stays untouched. This is the only route to true byte stability for the parts of the file nobody edited.

---

## 3. What "idempotent" can realistically mean

Define `R = html→md ∘ md→html`.

1. **Byte-identical, `R(x) = x` for every note**: not achievable with any parse-tree-based pipeline. The tree lacks the style information, and HTML lacks the whitespace (section 2). The only ways to get it are (a) not translating (agent-html-kit's embedded source) or (b) splicing edits into the original text by position.
2. **Fixed point after normalising once, `R(R(x)) = R(x)`**: achievable and testable. Pipelines A and D reached it after one pass, B after two. Meaning is preserved if every construct has a handler in both directions.
3. **Semantic equality, `parse(R(x)) ≅ parse(x)` ignoring positions**: the property to assert in tests, alongside (2). It catches escaping bugs like `\[\[x]]` that a fixed-point test would miss.

A practical contract for the vault: **canonical markdown**. Run a remark formatter once over the vault (a one-time git commit, using the same `remark-stringify` options as the engine). From then on, md → HTML → md is byte-identical for notes already in canonical form. Hand edits in Obsidian get re-normalised the next time the dashboard saves them. To keep diffs small, either write only notes the dashboard actually changed, or splice by position (above).

---

## Recommendation

1. **Do not build on agent-html-kit.** It is an unmaintained MIT demo (4 commits in two days, "no tests"). It renders a markdown subset one way only, and it loses frontmatter, wikilinks, callouts and embedded HTML. Borrow one idea: the HTML view keeps or links to the markdown source, which stays the single source of truth.
2. **Use unified as the engine**: `remark-parse` + `remark-frontmatter` + `remark-gfm` + a wikilink plugin, through `remark-rehype` / `rehype-remark` with **custom handlers** for frontmatter, wikilinks/embeds, callouts and raw HTML (the pipeline D pattern), and `rehype-remark` `{newlines: true}`. Everything is MIT, TypeScript-typed, and runs both in Node and in Next.js 14.
3. **Define idempotent as "fixed point after one canonical pass" plus semantic equality.** Pin `remark-stringify` options to the markers the vault already uses most (e.g. `bullet: '-'`, `rule: '-'`; count them first to keep the one-time diff small), run that pass once over the vault in a single commit, and add property tests: `R(R(x)) === R(x)` and an mdast equality check on every note in the vault.
4. **For edits from the dashboard, splice by source position** rather than re-serialising the whole note. Unedited bytes, including odd spacing, then never change in git.
5. **Gaps to close before building:** choose and pin a wikilink+embed plugin (`@flowershow/remark-wiki-link` 4.0.x, after re-testing, since 4.1.0's package is broken). Write or verify `toMarkdown` handlers for callouts, `==highlight==`, `%%comments%%` and `^block-ids`. Avoid `remark-obsidian` (GPL-3.0).
