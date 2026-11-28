# 02: Promotion conventions in the reference templates

Type: research
Status: resolved
Blocked by: none
Map: [Agentic OS observability increment](../map.md)

## Question

What conventions for promoting an entry through statuses, and for governing a knowledge base with an ontology, do the two reference templates use?

Read `C:\Code\el_nino\dev_graph\CLAUDE.md` and `C:\Kierkegaard\sickness\wiki\kierkegaard` (its `CLAUDE.md` and enough of the wiki to see the conventions working), and report:
- the statuses or stages an entry passes through, and what promotes it from one to the next;
- how entries are named, identified and linked, and what frontmatter they carry;
- how the ontology (entity kinds, relation kinds) is declared and enforced;
- which of these would carry over to a vault of tool, cluster and tier notes, and which belong to their own domain.

## Answer

Findings: `research/promotion-conventions.md` on branch `research/promotion-conventions` (pushed, never merged).

- **dev_graph** keeps three independent lifecycle fields: `status` (planned → active → deprecated), `implementation_status` (not-started → in-progress → tested → validated) and `confidence` (speculative → inferred → single-source → confirmed). Promotion is evidence-gated (code exists, `code` added to `evidence`) and rolls up to the parent. IDs are immutable prefixed ids (`MOD-001`) apart from filenames; 24 entity and 17 relation types are closed lists in CLAUDE.md, enforced by 11 lint checks and a 9-point authority gate; the schema is add-only and nothing is deleted, only deprecated.
- **Kierkegaard** has a review ladder (seed → draft → needs_review → canonical) tracked only by Dataview; no promotion criteria, no provenance, and relations are unenforced (100+ predicates against 17 claimed). Its governing `wiki/CLAUDE.md` was never saved; the log names it, and its source pattern is `llm_wiki.md`.
- **Carries over** to the vault: a separate implementation-status axis, evidence-gated promotion rolling up tool → cluster → tier, immutable prefixed ids, flat closed frontmatter, a closed relation vocabulary with lint, an add-only schema, deprecate-never-delete, and log plus index. **Gap in both:** neither records who promoted an entry or when, which the vault needs for traceability.
