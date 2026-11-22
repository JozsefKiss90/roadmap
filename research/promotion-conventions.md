# Promotion and ontology conventions in the two reference templates

**Question.** What conventions do the two reference templates use to promote an entry through statuses and to govern a knowledge base with an ontology? Which of them fit a vault of tool, cluster and tier notes?

**Sources read (read-only):**

- `C:\Code\el_nino\dev_graph\CLAUDE.md`: the dev_graph operations manual, `schema_version: "2.2.0"`.
- `C:\Code\el_nino\wiki\CLAUDE.md`: the wiki manual that dev_graph says it inherits from ("dev_graph INHERITS governance principles from `wiki/CLAUDE.md`"). I only checked it for the status and confidence rules.
- `C:\Kierkegaard\sickness\wiki\kierkegaard\`: `index.md`, `log.md` and sample notes from `concepts/`, `definitions/`, `arguments/`, `sources/` and `dashboards/`. I also tallied frontmatter and relation predicates across all 67 notes.
- `C:\Kierkegaard\sickness\llm_wiki.md`: the "LLM Wiki" pattern document that the Kierkegaard wiki is built from.

## Caveat: the Kierkegaard CLAUDE.md does not exist

The ticket points at a CLAUDE.md for the Kierkegaard wiki, but none exists:

- There is none in `wiki/kierkegaard/`, `wiki/`, `C:\Kierkegaard\sickness\` or its `.claude/` folder.
- The repo's git history has a single commit (`fb3ea71 inited repo`) and no CLAUDE.md in it.
- It is not in `C:\Code\el_nino\*\CLAUDE.md` either (a grep for "Kierkegaard" found nothing).

The log says the file was written, but it was never saved here:

> "Extended wiki/CLAUDE.md with Kierkegaard Domain Extension section … Added 18 new node_type enum values … Defined 17 relation predicates" (`wiki/kierkegaard/log.md`)

So every Kierkegaard convention below is **inferred from the notes, the dashboards and the log**, not quoted from a governing document. That gap matters: Section 3 shows what happens to an ontology that nothing enforces.

---

## 1. Statuses, and what promotes an entry

### dev_graph: three separate lifecycle axes

Every node carries three independent enums (`dev_graph/CLAUDE.md`, "Allowed Enums"):

> **`status` (7 values)**: `active`, `planned`, `implemented`, `validated`, `deprecated`, `blocked`, `draft`
> **`implementation_status` (7 values)**: `not-started`, `in-progress`, `implemented`, `tested`, `validated`, `deprecated`, `blocked`
> **`confidence` (5 values)**: `confirmed`, `single-source`, `inferred`, `speculative`, `experimental`

**Promotion is tied to evidence of real work, not to anyone's say-so.** The module template comments spell out the path:

> `status: planned          # planned (plan only) → active (code exists)`
> `implementation_status: not-started   # → in-progress → tested → validated`
> `confidence: inferred     # → single-source/confirmed as code/tests land`
> `evidence: [design, wiki] # add `code` at writeback`

The "End-of-Coding-Session Writeback Checklist" turns this into an executable procedure:

> 5. Update the parent MODULE node: bump `implementation_status` (not-started → in-progress on code; → tested on green tests); set `status: active`; add `code` to `evidence`; bump `updated`.
> 6. Update the parent CAPABILITY node: bump `implementation_status` to `in-progress` once any implementing module has code

Other promotion rules:

- **Some nodes can only be born in a promoted state.** "file and test nodes are created ONLY at writeback, when the real file exists". They start at `status: implemented` and `confidence: confirmed`.
- **Some types never reach "implemented".** "Knowledge assets do NOT have `implementation_status` — they are conceptual foundations, never 'implemented.'" The same note applies to patterns.
- **Confidence has its own transition table** ("Confidence Lifecycle"):

  > | `single-source` | `confirmed` | Second independent source corroborates |
  > | Any | `speculative` | Contradiction detected |
  > Promotion updates both `confidence` and `updated` fields. Demotion MUST be logged in `log.md`.

- **Coherence is linted.** Check 11: "Verify nodes with `confidence: confirmed` have `evidence: []` with at least one value."
- **Admissibility is the payoff of promotion.** A node passes 9 checks before it is "used as authoritative context". The checks include "`canonical: true`", "`status` is not `deprecated`", "No more recent decision record supersedes it" and "Relevant tests or validation gates identified".
- **Nothing is ever deleted.** Deprecation is the terminal state: "Node is retained indefinitely (never deleted)". Merges and splits deprecate the losing node and add a `### Supersedes` link.
- **Who may promote** ("MCP Operations"): "Constrained-automated: New dev_graph node creation (with governance), frontmatter lint corrections, link additions". "Human-review-required: Overwriting existing nodes, moving nodes". "Prohibited: Deleting nodes".
- **Every promotion leaves a trace.** It appends `## [DATE] writeback | <title>` to `log.md`, updates `index.md` and re-syncs the read-only Neo4j projection.

The parent wiki manual adds a simpler `status` enum: "`active`, `stub`, `deprecated`, `draft`". New pages start "`status: draft` until content is verified". Page creation and deprecation are "Human-review-required" (`el_nino/wiki/CLAUDE.md`).

### Kierkegaard: an editorial ladder of review states

The dashboards imply this ladder: `seed` → `draft` → `needs_review` → `canonical`. Each rung is a section of `dashboards/review-queue.md`:

> `WHERE status = "needs_review"` … `WHERE status = "draft"` … "Seed Notes (Minimal Content)" `WHERE status = "seed"`

The vault in use has only two values, `draft` (43 notes) and `canonical` (22). In practice the line between them follows **the kind of content and who owns it**:

- **`canonical`:** the source, the work, parts, definitions, distinctions, biblical references and the taxonomy. These are notes that transcribe the text.
- **`draft`:** concepts, arguments, chapters, most sections, people and syntheses. These are notes that interpret the text.

No written rule says what promotes a note. The signals the dashboards watch are:

- `certainty` (`high`, or `low` in the "Notes with certainty: low" section);
- `canonical_owner` (`source`, `claude` or `mixed`), with a section headed "Synthesis Notes (Claude-Generated, Needs Verification)" `WHERE canonical_owner = "claude"`;
- orphan detection (no `parent_nodes` and no `related_nodes`).

Read together, a note moves up the ladder once a reviewer has checked its claims against `source_refs`, page-cited quotes from the primary text. The notes record no review event, reviewer or date of promotion. `created` and `updated` are both `2026-05-23` everywhere, and `log.md` records only the single ingest.

## 2. Naming, identity, linking and frontmatter

### dev_graph

- **File names** are "Title Case with spaces (e.g., `Trading Engine Module.md`)". Type prefixes: "Reference nodes: Prefixed with `REF -`", "Decision records: Prefixed with `ADR -`". "Constraint nodes: Named as imperative rules (e.g., `No Wiki Mutation.md`)".
- **Identity is separate from the name:**

  > The `canonical_id` is assigned at creation and NEVER changes, even if the node is renamed or moved. It is globally unique within the dev_graph and serves as the primary key for Neo4j export.

  IDs use a type prefix plus a number (`KA-001`, `SYS-001`, `MOD-001` …), drawn from a table of 24 prefixes.
- **One concept, one node:** "Each implementation concept has ONE canonical node … If a concept is already covered, UPDATE the existing node … Never duplicate a definition — link instead".
- **Links:** `[[Page Name]]` wikilinks, recorded twice:
  1. in typed frontmatter arrays (`related_files`, `related_tests`, `related_constraints`, `related_decisions`, plus per-type keys such as `parent_system`, `implemented_by`, `covers`);
  2. in a body `## Relationships` section with one `### <Relation>` heading per edge type, which is "REQUIRED for Neo4j export readiness".
- **Universal frontmatter** has the keys `type, canonical_id, status, implementation_status, canonical, created, updated, confidence, evidence, source_paths, related_files, related_tests, related_constraints, related_decisions`. Each type adds its own extension keys. The rules are strict: "No frontmatter keys beyond those defined in this file", "Flat YAML only — no nested objects", "`created` is set once … NEVER modified".
- **Folders follow types:** "Type-to-directory binding: a node's `type` should match its directory" (23 directories).
- **Structural files are exempt.** `CLAUDE.md`, `index.md`, `log.md` and `README.md` "have NO frontmatter".

### Kierkegaard

- **File names** use the title, with a type prefix for derived kinds: `DEF -`, `ARG -`, `THM -`, `DST -`, `TAX -`, `REF -`, `SYN -`, `SRC -`. The log lists these: "Created naming conventions (DEF-, ARG-, THM-, DST-, TAX-, REF-, SYN- prefixes)". Concepts carry no prefix (`Despair.md`). Structure notes copy the book's own labels (`Ch2 - The Socratic Definition of Sin`).
- **Identity** is a kebab-case slug, `id: despair` or `id: def-despair`, plus a `title` and `aliases` (for example the Danish term `"Fortvivlelse"`).
- **Frontmatter** (from `concepts/Despair.md`) uses **nested YAML**, unlike dev_graph:

  ```yaml
  id: despair
  node_type: concept
  ontology_version: "1.0"
  canonical_owner: source
  source_work / source_path / source_author / attributed_author / editor / translator / publication_context
  domain: existential_psychology
  status: draft
  certainty: high
  source_refs:
    - page: "18"
      section: "Introduction"
      quote: "despair is the disrelationship in a relation which relates itself to itself"
  parent_nodes: [...]   child_nodes: [...]   related_nodes: [...]
  prerequisite_concepts / downstream_concepts   # on definitions and arguments
  tags, created_by: claude, created, updated
  ```

- **Links** appear in three places:
  - generic frontmatter arrays (`parent_nodes`, `child_nodes`, `related_nodes`);
  - a body `## Relations` list of typed predicates, for example `- defined_by: [[DEF - Despair]]` and `- potentiated_into: [[Sin]]`;
  - a `## Query Hooks` list of natural-language questions the note should answer, for retrieval.
- **Navigation** runs through `index.md` (a catalogue grouped by kind) and an append-only `log.md` with `## [DATE] ingest | Title` headings. This is the pattern from `llm_wiki.md`: "if each entry starts with a consistent prefix (e.g. `## [2026-04-02] ingest | Article Title`), the log becomes parseable".

## 3. How the ontology is declared and enforced

### dev_graph: declared in CLAUDE.md, enforced by lint and admissibility

- **Kinds of entity.** A closed `type` enum of 24 values, each bound to a directory and an ID prefix. Each type has its own frontmatter extension and required body sections. Lint Check 8, "Type-Content Alignment": "A module node should have Implementation Notes. An ADR should have Status, Context, Decision, Consequences."
- **Kinds of relation.** "17 relationship types organized by category": Structural, Existing, Behavioral, Traceability and Composition. Each comes with a semantics sentence and an example ("Justified By | Decision authorization | Module/Capability → ADR"). An **object hierarchy** also fixes which types connect: "Architecture → System → Capability → Module → File".
- **Cardinality and coverage rules** ("Cross-Linking Protocol"):
  - "Every **capability** MUST reference its parent system"
  - "Every **pattern** MUST reference at least 2 realizing modules/capabilities"
  - "Every node MUST have >=1 outbound wikilink (no orphans)"
  - "Each capability is owned by exactly ONE system"
- **Enforcement** has three layers:
  1. **11 lint checks** run on touched nodes every session and on all nodes weekly. They cover missing frontmatter, invalid enums, orphans, staleness with type-aware thresholds (30 to 180 days), broken links, constraint and test coverage, type-content alignment, links to deprecated nodes, canonical_id uniqueness and evidence-confidence coherence. They are written as Dataview queries plus manual review.
  2. **Admissibility checks** gate retrieval.
  3. **A Neo4j projection** for impact and orphan audits. It is read-only: "never author into Neo4j. Edit the markdown (the canonical source), then re-sync."

  The manual admits the limit: "(Instruction-level habit, not a hard gate; for mechanical enforcement add an orchestration hook …)".
- **Evolution is governed.** "Append-only enums: Values are never renamed or removed." "Governance-first: Every schema change documented in this file BEFORE being applied." "No silent evolution: Schema changes not in this file are schema drift (prohibited)." Enum appends and field additions each have a procedure that ends in a log line, for example `## [DATE] schema | Enum extension: <field>.<value>`. Migrations carry a `schema_version` bump and an ADR.

### Kierkegaard: declared by stamping, not enforced

- **Kinds of entity.** The log lists 15 types in use: "source, work, part, chapter, section, concept, definition, argument, theorem, taxonomy, distinction, biblical_reference, person, pseudonym, synthesis". It also lists 8 `domain` values (`primary_text`, `christian_theology`, `existential_psychology`, `query_dashboard` …). Each note carries `node_type`, `domain` and `ontology_version: "1.0"`. Folders follow types, loosely: dashboards are filed as `node_type: synthesis` under `dashboards/`.
- **Kinds of relation.** The log claims "Defined 17 relation predicates", but that definition is lost with the CLAUDE.md. A count of the `## Relations` sections across all notes found **more than 100 distinct predicate names**. Most appear once or twice: `belongs_to` 42, `presupposes` 23, `opposes` 19, `develops` 18, then one-offs such as `misrelation_produces`, `failure_becomes`, `overcomes_into`, `highest_potentiation_of`. Without a closed list and a lint pass, the relation vocabulary drifted almost immediately, in a single ingest session.
- **Enforcement** consists of Dataview dashboards only (`review-queue.md` with drafts, low certainty, Claude-owned notes and orphans). They report but nothing blocks.

---

## Carries over

These fit a git-backed vault of tool, cluster and tier notes promoted to `implemented` and `active`:

- **A separate lifecycle axis for implementation.** dev_graph splits `status` (lifecycle: `planned` → `active` → `deprecated`) from `implementation_status` (build: `not-started` → `in-progress` → `implemented` → `tested` → `validated`). That split is close to what the tool catalogue needs.
- **Promotion triggered by evidence and recorded in the note.** A tool moves only when an artefact exists. A field such as `evidence: [code, test, ...]` grows with each promotion, and a lint check ("`confirmed`/`active` requires evidence") enforces coherence.
- **Promotion that rolls up the hierarchy.** A capability becomes `in-progress` "once any implementing module has code". This maps directly to tool → cluster → tier roll-ups.
- **Stable `canonical_id` with type prefixes** (for example `TOOL-NNN`, `CLU-NNN`, `TIER-NN`), separate from the editable file name. The id must survive renames and match the ID in `tool-matrix.csv`.
- **Flat, closed frontmatter, with folders bound to types**, plus "no undeclared keys". The Kierkegaard nested `source_refs` show why flat YAML is easier to lint and to read with Dataview.
- **A closed relation enum declared in the governing file**, plus a body `## Relationships` section with one heading per relation and parent links that the hierarchy requires (tool → cluster → tier). Kierkegaard's drift to more than 100 predicates is the warning case.
- **Governance-first schema evolution:** append-only enums, a `schema_version` and a logged procedure for each extension.
- **Deprecate, never delete,** with `Supersedes` for merges and splits.
- **An append-only `log.md`** with `## [DATE] <op> | <title>` entries plus `index.md`. In git, the commit can serve as the promotion record. Neither template records who promoted an entry or when, beyond `updated`, so traceability needs an explicit addition, such as a `promoted_by`/`promoted_on` field or a log line per promotion.
- **Lint as the gate:** enum validity, orphans, broken links, id uniqueness and evidence coherence. Better still, a mechanical pre-commit check, which dev_graph's own manual says it lacks.
- **Admissibility before an agent treats a note as authoritative.** For example, only `active` tools that are not deprecated and have evidence are offered to the Agentic OS.

These belong to their own domains:

- dev_graph's 24 engineering types, its Closed-Loop Engineering Continuum, its context-pack assembly, intent routing, Neo4j sync, MCP tool classes, and the module/file/test writeback templates. The *shape* of the writeback checklist carries over; the content does not.
- Kierkegaard's bibliographic frontmatter (`source_work`, `translator`, `attributed_author` …), its page-cited `source_refs` quotes, its `domain` values and its philosophical node types (argument, theorem, distinction …). The idea of an editorial review ladder (`seed`/`draft`/`needs_review`/`canonical`) and of `canonical_owner` (source, Claude or mixed) could guide the `confidence` of a tool note's *description*, but it does not replace implementation status.
- Kierkegaard's `## Query Hooks` are a retrieval aid, not governance. They are optional.
