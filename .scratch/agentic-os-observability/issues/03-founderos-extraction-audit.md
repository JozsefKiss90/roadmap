# 03: FounderOS extraction audit

Type: research
Status: resolved
Blocked by: none
Map: [Agentic OS observability increment](../map.md)

## Question

For each FounderOS part chosen for the first increment, what has to come with it when it is copied out, and what has to be cut?

The parts, in `C:\Code\FounderOS`:
1. Knowledge Visualizer: `components/knowledge/*`, `lib/knowledge-index.ts`, `lib/knowledge-views.ts`, `lib/knowledge-metrics.ts`, `components/useSvgCamera`
2. Brain observatory: `lib/gbrain-observatory.ts` and the `/brain` radial
3. Skills catalogue: `app/skills`, `lib/skills-catalog.ts`
4. Usage: `app/usage`, `lib/usage*.ts`

For each, report: the transitive imports inside FounderOS (shell, theme and appearance system, demo mode, SQLite tables, connectors), which of them touch business domains, a rough size in files and lines, what a minimal standalone copy needs, and anything that will not run on Linux or on Node 22.

## Answer

Findings: `research/founderos-extraction-audit.md` on branch `research/founderos-extraction-audit` (pushed, never merged), read against FounderOS commit e26392c.

- **The main obstacle is `lib/data.ts` (`getDb()`).** Through it, a single import pulls in 187 files and about 59k lines. Once it is cut, none of the four parts needs SQLite, so `better-sqlite3` can stay out of this increment. The second obstacle is `app/globals.css` (19k lines covering three UI trees), which has to be cut down rather than copied.
- **Knowledge Visualizer:** about 4.0k lines of its own. Cut the index's reads of departments, agents, workflows, tools and clients from the database, drop the client entity kind, and turn off the links to business pages. The G variant also needs the classic `KnowledgeVisualizer.tsx`. Drift stays behind.
- **Brain radial:** about 1.9k lines. Take only the radial, not the `/brain` page. Replace the two helpers taken from `demo-mode.ts`, add a read-only `GET /api/brain`, and drop `BrainDock`, which writes. The external `gbrain` CLI is optional: it falls back to grepping local markdown.
- **Skills catalogue:** about 1.3k lines, and clean. Drop the create and propose routes, the form and the seeded fallback.
- **Usage:** about 1.7k lines. `usage.ts` is clean. Rewrite `usage-payload.ts`, which reads from the database and auth and pulls in sample data. Drop the push route and the legacy UI. The lane rules encode the operator's own folders and need a review.
- **Shared, copy once:**
  - the G component kit (56 files, 7.2k lines, self-contained)
  - `useSvgCamera`, `brain-graph`, and the markdown reader from `connectors/gbrain`
  - the read half of `skills-catalog`, and slimmed `stores` and `paths`
  - palette and appearance, `terminal.tsx` and `format-number`
  - the CSS cut from `globals.css`, the Tailwind config and the Geist fonts

  The kit's CSS applies only under `data-ui="glados"` on `<html>`.
- **Linux and Node 22:** no blockers found. Use plain `next dev`/`next start` instead of `scripts/serve.mjs`. In total, about 20k lines to copy, against about 70k without the cuts.
