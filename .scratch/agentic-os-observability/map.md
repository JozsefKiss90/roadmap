# Map: Agentic OS observability increment

Label: wayfinder:map

## Destination

A spec for the first observability increment of the Agentic OS: the Markdown Engine and the Jarvis front end, built from parts copied out of FounderOS into a new Agentic OS repo, with the tool matrix and framework map (here) staying the primary inventory. The spec is ready to cut into implementation tickets; building it is a separate effort.

## Notes

- **Domain**: the Agentic OS tool framework. Vocabulary is in `GLOSSARY.md` (section "Agentic OS"): Agentic OS, Markdown Engine, Jarvis, Knowledge Visualizer, FounderOS. Every session should call the Skill tool for "grilling" and "domain-modeling" on HITL tickets.
- **Sources**: the brief is `.scratch/brainstorm/problem.txt` and `.scratch/brainstorm/prompt.txt`. FounderOS is cloned at `C:\Code\FounderOS` (MIT). The Jarvis prototype is `.scratch/handout/Obsidian Jarvis — main interface-html` (copy its values, not its code).
- **Settled at charting** (not tickets; the ground every ticket stands on):
  - One map; it ends where the observability-first increment meets the FounderOS extraction.
  - Export, not merge: copy FounderOS modules into the new repo and adapt them, keeping the MIT notice; re-implement where a module is too tied to business domains.
  - New repo for the Agentic OS, on FounderOS's stack (Next.js 14, React 18, TypeScript, Tailwind 3, zod, Vitest; better-sqlite3 joins only when a later increment needs storage, per the FounderOS extraction audit). The framework map stays its own build here and is linked or embedded from Jarvis, not rewritten.
  - Open–closed: the framework map's design is not changed. In this effort tool status shows in Jarvis only.
  - Identity and classification (id, name, kind, tier, cluster, needs) are owned by the tool matrix; markdown is generated from it and checked against it. Operational state (status, declared activity, notes, links) is owned by markdown and written back for the map to read. Health is derived from it by a live check and is not stored (narrowed by the tool status ladder).
  - The markdown store is a git repo that is also opened as an Obsidian vault; Obsidian is an optional viewer.
  - Server code is allowed only as read-only routes that report state (counted as part of the Markdown Engine). Anything that acts waits.
  - First increment's co-opted parts: Knowledge Visualizer, brain observatory, skills catalogue, Usage.
  - In the Knowledge Visualizer a galaxy is a tier, a constellation is a cluster and a star is a tool, with the framework map's identities.
  - Everything must run on Linux (workstation migration expected early December 2026).
- **Added while grilling the Knowledge Visualizer data model** (2026-11-25): nothing in the design may depend on a person typing markdown. Partners act through commands, agents and Jarvis.

## Decisions so far

<!-- one line per closed ticket: [title](issues/NN-slug.md): gist -->

- [Promotion conventions in the reference templates](issues/02-promotion-conventions-in-reference-templates.md): dev_graph's evidence-gated, multi-axis lifecycle with immutable ids and a closed, linted ontology carries over; neither template records who promoted what, when.
- [Markdown to HTML and back](issues/01-markdown-html-round-trip.md): agent-html-kit is a one-way demo; use unified with custom handlers in both directions, define idempotent as a fixed point after one normalising pass with meaning preserved, and splice edits into the source.
- [FounderOS extraction audit](issues/03-founderos-extraction-audit.md): about 20k lines to copy once `getDb()` and the monolithic `globals.css` are cut; no SQLite needed this increment; the G kit, the markdown reader and palette are shared; no Linux or Node 22 blockers.
- [Tool status ladder](issues/04-tool-status-ladder.md): three axes, not one ladder: a partner-set status (catalogued → implemented → retired), active for standing tools only, and health computed live; implemented means findable, available, invokable and usable; Jarvis derives attention, active and idle from them.
- [Vault note schema and layout](issues/05-vault-note-schema.md): tool, cluster, tier and need notes in flat folders under `vault/` in the Agentic OS repo, keyed by the immutable matrix id; one file per thing with an owner for each frontmatter key and one fenced generated block; presence derived from the kind family; a vault-wide move log; a closed markdown feature list and an add-only zod schema; a generator that refuses a matrix that fails validation, with a check mode that is the core of lint.
- [Writing operational state back to the inventory](issues/06-operational-state-write-back.md): state reaches the roadmap repo as a generated `tool-state.json`, never a matrix column; the Agentic OS repo holds a committed matrix snapshot; every command is run by hand; a tool whose note holds state is never removed from the matrix, with a guard in each repo; an empty note is pruned; one lint with three grades.
- [Knowledge Visualizer data model](issues/07-knowledge-visualizer-data-model.md): five node kinds (tier, cluster, tool, need, note) and six cross-reference kinds read from the matrix snapshot; membership is a field, not an edge; a cluster relation is a roll-up, never stored; all five sections stay with new stack findings and a move-based timeline; nothing depends on a person typing markdown.

## Not yet specified

- **Health checks**: the status ladder settled what a check tests (findable, available, invokable) and that a reading is computed live. Still open: which check and which probe each kind of evidence gets, the read-only route that runs them, and the allow-list that limits what `invoke` may run (the note schema fixed its shape: an argument list, run without a shell).
- **Active agents and partner access**: "active" is defined to cover agent sessions and partners reaching the OS, but applies to tools only in this increment. In once agents run through the OS and partner access has an auth story.
- **Event log**: what emits the sync, run, call, spawn, warn, write and link events the Jarvis prototype shows, given that nothing acts in this increment.
- **Agent-run sparklines and the pulse line**: in once agents run through the OS and leave run data.
- **Status in the 3D framework map**: an additive lens or filter on the marks, reading the tool state file that write-back settled.
- **SQLite index**: a derived, uncommitted index built from the matrix snapshot and the vault, planned as the first use of storage in the next increment. Still open: its tables, when it is rebuilt and which routes read it. All reads already go through one module so it can slot in.
- **Tool discovery for the spec**: which catalogued tools help build the Markdown Engine itself (markdown parsers, graph layout, file watching), once the round-trip and note schema are known.
- **Spec assembly**: how the closed decisions are laid out as the final spec, and which repo it lands in.

## Out of scope

- FounderOS business domains (clients, comms, finance, social, analytics, drift, spend): brought in later, at the right time, as their own effort.
- Cron, Gates and anything else that acts or writes on its own: the next increment, after this read-only one.
- Advanced pillar features (thresholds, trigger signals, benchmarking, cost reports): planned for Jarvis later.
- Graph-governed version control and containerisation; multiple experiment sandboxes.
- Loop Engineering and agentic workflow integration, including the automated philosophy wiki use case.
- The Markdown Engine taking governance over downstream projects and superseding Hermes OS.
- Linux workstation setup.
