# 01: Markdown to HTML and back

Type: research
Status: resolved
Blocked by: none
Map: [Agentic OS observability increment](../map.md)

## Question

How can the Markdown Engine translate markdown to HTML and back so that a round trip changes nothing (idempotent), and what does https://github.com/DIY-Smart-Code/agent-html-kit do towards that?

Find out:
- what agent-html-kit is, how it maps markdown to HTML and back, its licence and how active it is;
- which features survive a round trip and which are lost (frontmatter, `[[wikilinks]]`, tables, callouts, embedded HTML, whitespace);
- the main alternatives for a lossless round trip in the TypeScript stack (the unified/remark/rehype family and others), and how they handle Obsidian syntax;
- what "idempotent" can realistically mean here: byte-identical, or identical after a normalising first pass.

## Answer

Findings: `research/markdown-html-round-trip.md` on branch `research/markdown-html-round-trip` (pushed, never merged).

- **agent-html-kit** is an MIT demo (4 commits, October 2026, "no tests"). It goes from markdown to HTML only: it embeds the raw markdown in a `<script type="text/markdown">` block and renders a subset in the browser. There is no way back to markdown. It loses frontmatter, wikilinks, callouts, raw HTML, hard breaks and table alignment. Only one idea is worth taking: keep the markdown source next to the HTML.
- **Byte-identical round trips are not reachable** with any pipeline tested (unified/remark/rehype, turndown), because serialisers write one fixed style and HTML collapses whitespace. **A fixed point is reachable:** remark to remark after 1 pass, remark→rehype→remark after 2. Turndown never settles.
- **Obsidian syntax needs custom work.** Out of the box, wikilinks, embeds and callouts get escaped, and frontmatter and raw HTML are lost. Custom handlers in both directions, carrying frontmatter, wikilinks and raw HTML as data attributes, plus a `rehype-remark` setting that keeps line breaks, reduce the loss to style alone. Embeds and callouts still need plugins that work in both directions. `@flowershow/remark-wiki-link` 4.1.0 is published broken, and `remark-obsidian` is GPL-3.0.
- **Recommendation:** use unified with custom handlers in both directions. Define idempotent as: a fixed point after one normalising pass, with the meaning of the note unchanged. Run that normalisation once over the vault in a single commit, and test both properties on every note. Apply dashboard edits by splicing only the changed text into the original source, so untouched bytes never change.
