# Grill brief: interactive 3D map of the Hermes OS tool framework

Grill me on the design and build approach for an interactive, navigable 3D map of the Hermes OS tool framework. This is a design session: write no map code. When we reach a shared understanding I will run `/to-spec`, then `/to-tickets`, so every decision has to be precise enough to become a spec line and a ticket.

## Read first (facts are yours to find, not mine to recite)

- `tool-discovery/tool-framework.graph.json`: the data the map renders. About 863 nodes (tiers, clusters, tools, needs, roles, value streams, phases) and 1,537 edges of nine types, plus an `axes` block and layout hints (a height per tier, a sector per cluster).
- `tool-discovery/tool-matrix.csv`: the same tools as rows.
- `Hermes OS tool discovery meta framework and capability matrix.md`: the framework itself. Read the Axes and Graph model sections closely; they propose an encoding for each of the twelve axes. Treat those as proposals to grill, not as decisions.
- `references/style-guide.md`: the current visual source of truth ("Ivory and cobalt", with light and dark skins and a contrast contract).
- `AI_roadmap_2027.html` and `diagrams/`: existing work the map should sit beside.
- `CLAUDE.md` and `docs/agents/`: how specs, tickets, the glossary and ADRs are kept in this repo.
- Check which tools in the toolset below are already installed here.

## Fixed constraints (do not reopen)

- Everything is built and checked from Claude Code. No other desktop apps, no browser-based design tools.
- Free tools only.
- A headless browser that Claude Code drives itself is allowed, for screenshots and console checks.
- The look is simple, clean and minimal, with a polished, high-quality finish. It is not a showpiece site, and it must not look like a typical graph-visualisation demo. I have reference sites; ask me for them early and ask what I like about each.

## Settled toolset

Design within these. Propose an addition only when a decided feature cannot be built without it, and put that to me as a decision.

| Tool | Job | Boundary |
| --- | --- | --- |
| 3d-force-graph | Graph renderer | |
| three.js | 3D engine: planes, node shapes, camera | |
| troika-three-text | Main labels | |
| three-spritetext | Small secondary labels | Not for main labels |
| postprocessing | Antialiasing, glow, depth blur, vignette | Restrained |
| anime.js | Roadmap scrub, lens changes, panel transitions | Never the camera, never node positions |
| Fontsource | Bundles Geist and Instrument Serif locally | |
| Lucide | Icons for panels and the "kind" axis | |
| MiniSearch | Search across the tools, then fly to the result | |
| threejs-skills | Keeps code on the current three.js release | |
| diagram-design + `references/style-guide.md` | Colour and type | Source of truth |
| Impeccable | Critic for the screenshots | Critiques; does not set colour or type |
| design plugin | Accessibility review, design critique | |
| frontend-design | Builds the panels around the canvas | |
| ui-ux-pro-max-skill | UX rules lookup | Does not choose colours or fonts |
| Playwright MCP (headless) | Screenshot and console loop | Frame rates from it are not representative |
| Tweakpane | Hidden tuning panel during the build | Removed from the finished map |

When design skills disagree, the order of authority is: style guide, then Impeccable, then frontend-design, then ui-ux-pro-max.

## The style guide

`references/style-guide.md` was written for 2D diagrams. Wherever a map feature needs something it does not define (depth, glow, 3D node treatments, a role palette, a decision-class scale, hover and focus states, and so on), raise it as its own question with three options: update a token, extend the guide with a map section, or replace the guide. Give your recommendation and say what each option does to the roadmap page, the six diagrams and the contrast contract. Do not edit the file in this session; the outcome becomes an ADR and a ticket.

## Branches the design tree must cover

Order them by dependency yourself; this list only guards against silent assumptions.

1. Purpose and audience: who opens the map, where, and the questions it must answer for each of them.
2. Scope of the first version: which node types and how much of the 752 tools show by default; what waits.
3. Spatial model: tiers, clusters, and where needs, roles and phases live; what is pinned and what is simulated.
4. Views and lenses: tier stack, role lens, roadmap scrub, need trace, overlap groups; which exist in the first version.
5. Encodings: for each of the twelve axes, a visual channel, a filter only, or nothing.
6. Level of detail and labels: what is visible at each zoom distance.
7. Navigation and interaction: camera, selection, detail card, search, filters, keyboard, shareable state.
8. Interface around the canvas, and the viewport sizes it must work at.
9. Motion: what animates, how long, and the reduced-motion fallback.
10. Visual language: light or dark skin, and the style guide questions above.
11. Data contract and refresh: how the map stays in step when the matrix changes, and how the data is validated.
12. Architecture and delivery: one self-contained file or a build step, module boundaries, offline use, where it lives, how my two partners open it.
13. Performance and compatibility: budgets on a mid-tier laptop, and what happens without WebGL.
14. Accessibility.
15. Verification: the screenshot loop, the seams the map is tested at, and what "done" means for a ticket.
16. Out of scope.

## How the session ends

When the frontier is empty and I confirm, close with a summary shaped for `/to-spec`: problem, solution, user stories, implementation decisions, testing decisions, out of scope, open questions. Flag where the work splits naturally into thin end-to-end slices, so `/to-tickets` has seams to cut along. Suggested feature slug: `framework-map`.
