# 03: Vocabulary file and graph validator

**What to build:** The build fails with a clear message whenever the graph JSON is inconsistent, so a broken map never reaches the partners. A vocabulary file declares the allowed values for kind, decision class, hosting, value stream and gate, and today's data is reconciled against it.

The data currently holds at least 14 kind values and at least 14 gate values, against 11 and 5 in the framework document; hosting also holds `n/a` for 8 tools. Nothing is patched silently: each mismatch is either added to the vocabulary or fixed in the data, and the choice is listed for the Architect.

This ticket also proposes the display groupings the map will use: about eight kind families and five gate families (none, admission review, licence check, guarded, operator approval).

**Blocked by:** 01

**Status:** ready-for-agent

- [x] A vocabulary file lists the allowed values for kind, decision class, hosting, value stream and gate
- [x] The validator rejects a graph with an edge pointing to a missing node, or with a duplicate id
- [x] The validator rejects a tool with no cluster, or whose tier disagrees with its cluster's tier
- [x] The validator rejects any kind, decision class, hosting, value stream or gate value that is not in the vocabulary file
- [x] The validator rejects a need with no serving tool, or a phase string that does not parse into phases P0 to P4
- [x] The validator rejects metadata counts that disagree with the actual nodes and edges
- [x] Each rejection names the fault and the offending id
- [x] Each of the five fault types has a test using a small graph that contains only that fault
- [x] The current graph JSON passes the validator
- [x] A table of every raw kind and gate value, the family it is grouped into, and any value changed in the data is written under Comments, and the Architect has signed it off
- [x] The work is committed

## Comments

### 2026-11-17: built, waiting for the Architect's sign-off

Everything is built and committed except the sign-off on the groupings below. The status is `ready-for-human` for that reason.

What exists:

- **The vocabulary file** is `tool-discovery/vocabulary.json`. It lists the allowed values for kind, decision class, hosting, value stream and gate.
- **The validator** is `framework-map/src/validate.ts`, run by `npm run validate`. `npm run build` runs it before Vite, so a graph with a fault stops the build.
- **Its report** lists every fault in one run, each with its type and the offending id.
- **The tests** are `framework-map/src/validate.test.ts`. Each fault has a test on a five-node graph that holds only that fault.
- **The current graph JSON passes.** A test runs the validator on it, and so does every build.
- **The graph's types** are `framework-map/src/graph.ts`, which ticket 02 left to this ticket.

One check was made by hand, on a copy of the graph with four faults put in. They were a dangling edge, an unknown kind, a wrong tier and a bad phase. `npm run validate` exited with 1 and named all four. The build and the screenshot script still run clean.

#### What the data really holds

The ticket expected at least 14 kind values and 14 gate values. The data holds **278 kind values** and **24 gate values**. Of the 278 kinds, 210 are used by one tool only.

#### Choices made, for sign-off

1. **No value was changed in the data.** Every raw kind and gate value in today's graph was added to the vocabulary file under a family.
   - The detail card shows the raw kind, so the raw values carry meaning.
   - The CSV and the xlsx hold the same values, and ticket 04 makes the CSV the source. A change here would have put the JSON out of step with both.
2. **Hosting `n/a` was added to the vocabulary** beside Hub, Spoke, Cloud and Client. Cluster 1F and 8 of its tools carry it: they are link lists, which run nowhere.
3. **Kind has ten families, not about eight.** Merging "MCP server" into "Plug-in, subagent or hook", and "Feature or capability" into "Standard or reference", would give eight.
4. **Gate has the five families from the spec.** Five raw values did not name their family and were placed by judgement:
   - "Reference only" and "Benchmark only" are in None. They limit what a tool is used for, and nothing has to happen before it is switched on.
   - "Zero silent writes" is in Guarded.
   - "ADR first: v1 excludes multi-agent orchestration" is in Operator approval.
   - "Legal review: cloning third-party products" is in Licence check.
5. **Kind placements that could go either way:**
   - "GitHub repo" (5 tools, such as qdrant/qdrant) is in Standard or reference. The value says nothing about what the tool is, so it is a candidate for a fix in the CSV.
   - Databases and search engines are in Platform or infrastructure, including SQLite and DuckDB.
   - "Runtime" (Ollama, llama.cpp, vLLM and four others) is in App or CLI.
   - "Managed model platform" (Bedrock, Vertex AI) is in Platform or infrastructure, not Model.
   - "Command interface" and "Hermes command concept" are in Skill or command, though all seven are internal design items.
   - "Schema file" is in Standard or reference, though all four are internal design items.
6. **Raw values that look like duplicates were left alone:** "Obsidian plugin" and "Obsidian plug-in"; "MCP server repo" beside "MCP server". They can be merged in the CSV once ticket 04 is done.

#### Decisions later tickets inherit

- **The vocabulary file is also the display table.** Kind and gate values are listed under their family, so a raw value cannot be allowed without a family.
- **Ticket 10 should read the families from this file** and not keep a second table.
- **A new kind or gate value fails the build** until it is added to the vocabulary file under a family. The validator also fails if one value is listed under two families.
- **Clusters are checked too.** A cluster's hosting, value stream and gate must be in the vocabulary, and its `tools` count must equal the number of tools that name it.
- **`parsePhases` in `validate.ts` reads a need's phase string** into a list of phases, for the phase scrub in ticket 13. It accepts single phases, rising ranges and comma lists, such as "P2", "P2-P3" and "P1, P3".
- **Two agreements are not checked:** a need's phase string with its `scheduled_in` edges, and a tool's `contains` edge with its `cluster` field. Both hold in today's data, and ticket 04's generator should derive one from the other.
- **The build script runs TypeScript under Node** with `--experimental-strip-types`, which Node 22.14 needs. Imports in `scripts/*.ts` therefore carry the `.ts` extension.
- **Ticket 04 can validate any file** with `npm run validate -- path/to/graph.json`.

The tdd skill was not called. The tests were written first by hand and seen to fail before the validator existed.

The tables below are generated from the vocabulary file and today's graph.

#### Gate values: families

| Family | Raw values | Tools |
| --- | --- | --- |
| None | 3 | 448 |
| Admission review | 4 | 107 |
| Licence check | 3 | 17 |
| Guarded | 11 | 126 |
| Operator approval | 3 | 54 |

#### Gate values: every raw value

| Raw value | Tools | Family |
| --- | --- | --- |
| None | 436 | None |
| Reference only | 8 | None |
| Benchmark only | 4 | None |
| Admission review for third-party skills | 57 | Admission review |
| Admission review | 33 | Admission review |
| Admission review (mcp-auditor) | 16 | Admission review |
| Admission review: routes prompts through third parties | 1 | Admission review |
| Licence check | 14 | Licence check |
| Legal review: cloning third-party products | 2 | Licence check |
| Licence check: confirm EU use is permitted | 1 | Licence check |
| Guarded: client data | 23 | Guarded |
| Guarded: site terms and personal data | 18 | Guarded |
| Guarded: credentials | 14 | Guarded |
| Guarded: outbound publishing and ad spend | 14 | Guarded |
| Guarded: personal data and outbound email | 14 | Guarded |
| Zero silent writes | 12 | Guarded |
| Guarded: account access | 10 | Guarded |
| Guarded: acts with user sign-ins | 10 | Guarded |
| Guarded: session data and consent | 8 | Guarded |
| Guarded: authorised targets only | 2 | Guarded |
| Guarded: site terms | 1 | Guarded |
| Operator approval for cron changes | 25 | Operator approval |
| Operator approval | 22 | Operator approval |
| ADR first: v1 excludes multi-agent orchestration | 7 | Operator approval |

#### Kind values: families

| Family | Raw values | Tools |
| --- | --- | --- |
| Skill or command | 22 | 91 |
| Plug-in, subagent or hook | 15 | 56 |
| MCP server | 6 | 42 |
| Library or framework | 33 | 117 |
| App or CLI | 56 | 167 |
| Platform or infrastructure | 44 | 77 |
| Model | 16 | 39 |
| Feature or capability | 31 | 40 |
| Standard or reference | 41 | 75 |
| Internal build | 14 | 48 |

#### Kind values: every raw value

| Raw value | Tools | Family |
| --- | --- | --- |
| Skill | 36 | Skill or command |
| Claude Code skill | 14 | Skill or command |
| Skill library | 8 | Skill or command |
| Command interface | 4 | Skill or command |
| Hermes command | 4 | Skill or command |
| Claude/Hermes skill | 3 | Skill or command |
| Hermes command concept | 3 | Skill or command |
| Hermes skill | 3 | Skill or command |
| Official/community skill | 2 | Skill or command |
| Ruleset | 2 | Skill or command |
| Coding-discipline repo | 1 | Skill or command |
| Default skill library | 1 | Skill or command |
| IDE instruction system | 1 | Skill or command |
| IDE skill system | 1 | Skill or command |
| Meta-skill | 1 | Skill or command |
| Procedural memory | 1 | Skill or command |
| Reusable procedures | 1 | Skill or command |
| Skill marketplace / repository | 1 | Skill or command |
| Skill repo/pattern | 1 | Skill or command |
| Skill/capability | 1 | Skill or command |
| Skill/gate | 1 | Skill or command |
| Skill/pattern | 1 | Skill or command |
| Plugin | 25 | Plug-in, subagent or hook |
| Subagent | 13 | Plug-in, subagent or hook |
| Hook | 3 | Plug-in, subagent or hook |
| Plugin library | 3 | Plug-in, subagent or hook |
| Marketplace | 2 | Plug-in, subagent or hook |
| Agent role configuration | 1 | Plug-in, subagent or hook |
| IDE plug-in | 1 | Plug-in, subagent or hook |
| Lifecycle automation | 1 | Plug-in, subagent or hook |
| Obsidian plug-in | 1 | Plug-in, subagent or hook |
| Obsidian plugin | 1 | Plug-in, subagent or hook |
| Obsidian plugin/MCP | 1 | Plug-in, subagent or hook |
| Packaging/extensibility | 1 | Plug-in, subagent or hook |
| Plugin / code intelligence | 1 | Plug-in, subagent or hook |
| Specialist agents | 1 | Plug-in, subagent or hook |
| Zotero plugin | 1 | Plug-in, subagent or hook |
| MCP server | 35 | MCP server |
| MCP server repo | 3 | MCP server |
| Code topology MCP/index | 1 | MCP server |
| MCP category | 1 | MCP server |
| MCP server / docs retrieval | 1 | MCP server |
| Reference MCP repo | 1 | MCP server |
| Library | 41 | Library or framework |
| Framework | 40 | Library or framework |
| Language | 4 | Library or framework |
| RAG framework | 2 | Library or framework |
| Task queue | 2 | Library or framework |
| Approval testing library | 1 | Library or framework |
| Browser automation framework | 1 | Library or framework |
| Document parsing library | 1 | Library or framework |
| Evaluation framework | 1 | Library or framework |
| GitHub repo/library | 1 | Library or framework |
| Graph analytics library | 1 | Library or framework |
| GraphRAG framework | 1 | Library or framework |
| GraphRAG library/pattern | 1 | Library or framework |
| JS/TS test framework | 1 | Library or framework |
| Library / proxy / MCP | 1 | Library or framework |
| Library + MCP | 1 | Library or framework |
| LLM programming/eval framework | 1 | Library or framework |
| LLM tracing instrumentation | 1 | Library or framework |
| Mathematical animation/video library | 1 | Library or framework |
| PDF library | 1 | Library or framework |
| Prompt/model eval framework | 1 | Library or framework |
| Python graph library | 1 | Library or framework |
| Python OWL library | 1 | Library or framework |
| Python RDF library | 1 | Library or framework |
| Python SHACL validator | 1 | Library or framework |
| Python task queue | 1 | Library or framework |
| Python test framework | 1 | Library or framework |
| RAG evaluation library | 1 | Library or framework |
| Schema language | 1 | Library or framework |
| Schema/contracts library | 1 | Library or framework |
| Search engine library | 1 | Library or framework |
| Testing pattern/tooling | 1 | Library or framework |
| Workflow/agent graph framework | 1 | Library or framework |
| App (self-hosted) | 43 | App or CLI |
| CLI | 34 | App or CLI |
| Agent runtime | 11 | App or CLI |
| App (desktop) | 11 | App or CLI |
| App | 7 | App or CLI |
| Runtime | 7 | App or CLI |
| Gateway | 2 | App or CLI |
| GitHub Action | 2 | App or CLI |
| Secrets scanner | 2 | App or CLI |
| Task runner | 2 | App or CLI |
| Agent harness | 1 | App or CLI |
| Agent harness repo | 1 | App or CLI |
| AI agent/tool surface | 1 | App or CLI |
| AI IDE | 1 | App or CLI |
| AI IDE / coding agent surface | 1 | App or CLI |
| Cloud coding agent | 1 | App or CLI |
| Coding agent | 1 | App or CLI |
| Coding agent / CLI | 1 | App or CLI |
| Coding CLI | 1 | App or CLI |
| Container orchestration | 1 | App or CLI |
| Container runtime | 1 | App or CLI |
| Container/SBOM scanner | 1 | App or CLI |
| Container/SBOM/vulnerability scanner | 1 | App or CLI |
| Data/artifact versioning | 1 | App or CLI |
| Dependency vulnerability scanner | 1 | App or CLI |
| Diagramming tool | 1 | App or CLI |
| Document conversion tool | 1 | App or CLI |
| Document converter | 1 | App or CLI |
| Enterprise stack | 1 | App or CLI |
| Formatter | 1 | App or CLI |
| Git hook framework | 1 | App or CLI |
| JS/TS linter | 1 | App or CLI |
| Large file storage | 1 | App or CLI |
| Local model runtime | 1 | App or CLI |
| Markdown knowledge base | 1 | App or CLI |
| Markdown slide generator | 1 | App or CLI |
| Model router/proxy/cost tracker | 1 | App or CLI |
| Model/provider/coding agent | 1 | App or CLI |
| Node dependency scanner | 1 | App or CLI |
| Ontology editor | 1 | App or CLI |
| Ontology toolkit | 1 | App or CLI |
| Open-source agent harness | 1 | App or CLI |
| PDF/Markdown conversion tool | 1 | App or CLI |
| Python dependency scanner | 1 | App or CLI |
| Python formatter | 1 | App or CLI |
| Python linter/formatter | 1 | App or CLI |
| Python package/project manager | 1 | App or CLI |
| Python security linter | 1 | App or CLI |
| Python type checker | 1 | App or CLI |
| Python type checker / LSP | 1 | App or CLI |
| Reference manager | 1 | App or CLI |
| Self-hosted metasearch | 1 | App or CLI |
| Static analysis/security | 1 | App or CLI |
| Video generation/editing tool | 1 | App or CLI |
| Web app | 1 | App or CLI |
| Web extraction/crawling tool | 1 | App or CLI |
| Platform | 23 | Platform or infrastructure |
| Messaging gateway | 5 | Platform or infrastructure |
| Source/social platform | 3 | Platform or infrastructure |
| Database | 2 | Platform or infrastructure |
| Managed model platform | 2 | Platform or infrastructure |
| Scholarly metadata API | 2 | Platform or infrastructure |
| Vector database | 2 | Platform or infrastructure |
| Workflow orchestration | 2 | Platform or infrastructure |
| Android Linux environment | 1 | Platform or infrastructure |
| Audit logging | 1 | Platform or infrastructure |
| CI/CD | 1 | Platform or infrastructure |
| Cloud compute/workflow deployment | 1 | Platform or infrastructure |
| Cloud network | 1 | Platform or infrastructure |
| Cloud server | 1 | Platform or infrastructure |
| Communication connector | 1 | Platform or infrastructure |
| Durable workflow engine | 1 | Platform or infrastructure |
| Embedded analytics DB | 1 | Platform or infrastructure |
| Embedded database | 1 | Platform or infrastructure |
| Git hosting/platform | 1 | Platform or infrastructure |
| Graph database | 1 | Platform or infrastructure |
| Identity/access management | 1 | Platform or infrastructure |
| Key management | 1 | Platform or infrastructure |
| Linux service manager | 1 | Platform or infrastructure |
| LLM observability | 1 | Platform or infrastructure |
| Local always-on hardware | 1 | Platform or infrastructure |
| Local database | 1 | Platform or infrastructure |
| Local host | 1 | Platform or infrastructure |
| Local object store | 1 | Platform or infrastructure |
| Model router/provider | 1 | Platform or infrastructure |
| Model serving route | 1 | Platform or infrastructure |
| Monitoring/logging | 1 | Platform or infrastructure |
| Neural/search API | 1 | Platform or infrastructure |
| Operating system | 1 | Platform or infrastructure |
| Private network connectivity | 1 | Platform or infrastructure |
| SaaS / closed app | 1 | Platform or infrastructure |
| Scholarly search/API | 1 | Platform or infrastructure |
| Search engine | 1 | Platform or infrastructure |
| Search provider | 1 | Platform or infrastructure |
| Search/reader service | 1 | Platform or infrastructure |
| Secret storage | 1 | Platform or infrastructure |
| VPS plan type | 1 | Platform or infrastructure |
| VPS provider | 1 | Platform or infrastructure |
| Web search/extraction provider | 1 | Platform or infrastructure |
| Workflow automation | 1 | Platform or infrastructure |
| Model | 9 | Model |
| Model example | 4 | Model |
| Model tier | 4 | Model |
| Embedding model | 3 | Model |
| Embedding model family | 3 | Model |
| Reranker | 3 | Model |
| Mistral coding model | 2 | Model |
| Model provider | 2 | Model |
| Open model family | 2 | Model |
| Mistral small model | 1 | Model |
| Model family | 1 | Model |
| Model family/provider | 1 | Model |
| Model provider/family | 1 | Model |
| Model/provider | 1 | Model |
| Reranking model type | 1 | Model |
| Subscription route | 1 | Model |
| Platform feature | 6 | Feature or capability |
| Analytics feature | 2 | Feature or capability |
| CLI execution mode | 2 | Feature or capability |
| LSP capability | 2 | Feature or capability |
| Retrieval capability | 2 | Feature or capability |
| Auth method | 1 | Feature or capability |
| Capability / integration layer | 1 | Feature or capability |
| Capability / operating pattern | 1 | Feature or capability |
| Claude Code permission setting | 1 | Feature or capability |
| CLI interface | 1 | Feature or capability |
| Cron chaining option | 1 | Feature or capability |
| Cron execution option | 1 | Feature or capability |
| Cron/script mode | 1 | Feature or capability |
| Custom UI / dashboard | 1 | Feature or capability |
| Hermes scheduling primitive | 1 | Feature or capability |
| Human interface | 1 | Feature or capability |
| IDE agent mode | 1 | Feature or capability |
| Memory retrieval capability | 1 | Feature or capability |
| Messaging/media capability | 1 | Feature or capability |
| Mobile control surface | 1 | Feature or capability |
| Model/tool capability | 1 | Feature or capability |
| OS feature | 1 | Feature or capability |
| Packaging mechanism | 1 | Feature or capability |
| Persona/skill dashboard | 1 | Feature or capability |
| Platform workflow | 1 | Feature or capability |
| Reflective automation | 1 | Feature or capability |
| Scheduled report | 1 | Feature or capability |
| Setup workflow | 1 | Feature or capability |
| Source/context input | 1 | Feature or capability |
| Visual OS feature | 1 | Feature or capability |
| Visualization | 1 | Feature or capability |
| Catalogue | 14 | Standard or reference |
| GitHub repo | 5 | Standard or reference |
| Standard | 5 | Standard or reference |
| Course material | 4 | Standard or reference |
| Retrieval metric | 4 | Standard or reference |
| Schema file | 4 | Standard or reference |
| Answer metric | 2 | Standard or reference |
| Catalogue (data) | 2 | Standard or reference |
| Hermes memory file | 2 | Standard or reference |
| Policy | 2 | Standard or reference |
| Architecture decision records | 1 | Standard or reference |
| Architecture pattern | 1 | Standard or reference |
| Claude Code constitution | 1 | Standard or reference |
| Claude Code settings file | 1 | Standard or reference |
| Constraint language | 1 | Standard or reference |
| Data format | 1 | Standard or reference |
| Data-integrity technique | 1 | Standard or reference |
| Design records | 1 | Standard or reference |
| Dev environment standard | 1 | Standard or reference |
| Eval data format | 1 | Standard or reference |
| Git automation | 1 | Standard or reference |
| Git workflow | 1 | Standard or reference |
| GitHub policy | 1 | Standard or reference |
| Governance policy | 1 | Standard or reference |
| Graph health metrics | 1 | Standard or reference |
| Hermes identity file | 1 | Standard or reference |
| Hermes profile file | 1 | Standard or reference |
| Hermes/profile config | 1 | Standard or reference |
| Loop methodology repo | 1 | Standard or reference |
| Markdown metadata format | 1 | Standard or reference |
| MCP config file | 1 | Standard or reference |
| Observability standard | 1 | Standard or reference |
| Ontology standards | 1 | Standard or reference |
| Project context file | 1 | Standard or reference |
| Run metadata | 1 | Standard or reference |
| Schema standard | 1 | Standard or reference |
| Structured contract | 1 | Standard or reference |
| Structured job file | 1 | Standard or reference |
| Structured result format | 1 | Standard or reference |
| Tool discovery source | 1 | Standard or reference |
| Typed execution artifact | 1 | Standard or reference |
| Internal build | 19 | Internal build |
| Reliability harness | 7 | Internal build |
| Blueprint | 6 | Internal build |
| Script | 6 | Internal build |
| Internal ledger | 1 | Internal build |
| Ontology-governed engineering graph | 1 | Internal build |
| Project wiki / RAG substrate | 1 | Internal build |
| Proposed blueprint repo | 1 | Internal build |
| Proposed eval repo | 1 | Internal build |
| Proposed Hermes profile repo | 1 | Internal build |
| Proposed repo | 1 | Internal build |
| Proposed template repo | 1 | Internal build |
| Source layer | 1 | Internal build |
| Synthesis knowledge base | 1 | Internal build |

### 2026-11-17: signed off

The Architect reviewed the choices and the tables above and signed them off as they stand. Every box is ticked, and the status is back to `ready-for-agent`, as on the other finished tickets.
