# Hermes OS tool discovery: meta framework and capability matrix

Nov 17, 2026 · @Kiss József

The framework sorts 752 tools, repositories, models, platforms and design components into 8 tiers and 55 clusters, classifies each on twelve axes, and maps all 33 capability needs from the AI 2027 roadmap to at least one of them. The sortable matrix is in [Hermes OS tool matrix](https://claude.ai/artifact/CAagLLpPnGCF9Db93ML4N2).

## Framework at a glance

&#91;embedded content: tier stack · 8 tiers, 3 roles\]

Read the stack top down as dependency: each tier is built from the ones under it. The Analyst's extra segment at T5 is requirement interviews and rating outputs for evals.

## Axes

Every one of the 752 catalogued items carries the same twelve attributes, so the matrix can be cut along any of them and the 3D map can give each one a visual channel. The full matrix is in the companion sheet, [Hermes OS tool matrix](https://claude.ai/artifact/CAagLLpPnGCF9Db93ML4N2).

| Axis | Values | What it answers | 3D map encoding |
| --- | --- | --- | --- |
| Tier | T7 to T0 | How abstract is it, from autonomous optimisation down to substrate? | Height: one plane per tier |
| Cluster | 55 clusters | Which capability family inside the tier? | Sector on the plane; the cluster node is the hub of its tools |
| Kind | Skill, plug-in, subagent, hook, MCP server, library, framework, app, model, standard, internal build | What sort of thing is it? | Node shape |
| Decision class | Core v1, Core later, Adapter, Skill / rule, Build, Optional / benchmark, Delay / guarded, Reference / concept, Out of scope, Unverified | How committed are you? Uses the status key of the Hermes catalogue, plus three additions. | Opacity and outline |
| Used by | Architect, Designer, Analyst | Which partners work with it? | Colour |
| Operated by | Architect, Designer, Analyst | Who installs, hosts and maintains it? | Filter |
| Hosting | Hub, Spoke, Cloud, Client | Where does it run? | Ring within the sector |
| Value stream | Hermes OS and RAG Factory, product build, client delivery, go-to-market, enablement, personal resilience | Which part of the business does it serve? | Filter |
| Needs | N01 to N33 | Which roadmap capability needs does it help with? | Edges to need nodes |
| Phase | P0 to P4 | When does the roadmap call for it? Inherited from the need. | Time slider |
| Gate | None, admission review, licence check, guarded, operator approval | What must happen before it is switched on? | Warning badge |
| Evidence | Verification, repository, stars, last commit, licence file | What was read on 17 November 2026? | Node size from stars; stale repositories desaturated |

Decisions on the 378 rows from the Hermes catalogue are kept exactly as you recorded them. Decisions on the other 374 rows are my proposals and are marked "Proposed here" in the sheet; none of them is an accepted ADR.

## Tier hierarchy

The hierarchy has three levels: 8 tiers, 55 clusters and 752 items. Each tier is composed from the ones below it, and that composition is recorded: 51 internal skills and subagents at T1 carry an "implements" link to the higher cluster they serve, so `ontology-shacl-check` sits with the skills and points up to constraint validation at T5.

| Tier | Clusters | Anchors already committed | Strongest additions from this exercise | Items |
| --- | --- | --- | --- | --- |
| T7 Autonomous experimentation and AI optimisation | Research and experiment loops; prompt, program and harness optimisation; self-improving skills and session mining; model and benchmark intelligence; model adaptation | DSPy, Hermes self-improving loop, dreaming function | [GEPA](https://github.com/gepa-ai/gepa), [Harness2](https://github.com/google-research/harness2), [autoresearch](https://github.com/karpathy/autoresearch), [AutoHarness](https://github.com/tigerless-labs/autoharness), [Unsloth](https://github.com/unslothai/unsloth), a personal eval repo | 33 |
| T6 Agent orchestration and looped operations | Persistent controller; multi-agent orchestration; agent frameworks; scheduling and durable workflows; loop governance and job contracts; observability, cost and delivery metrics | Hermes Agent, cron, job manifest, loop-engineering, Phoenix, cost ledger | Claude cloud scheduled tasks, [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python), [CodeBurn](https://github.com/getagentseal/codeburn), [Paperclip](https://github.com/paperclipai/paperclip) and [Multica](https://github.com/multica-ai/multica) as deferred benchmarks | 104 |
| T5 Ontology engineering and formal verification | Ontology modelling and glossary; constraint and graph validation; specification and requirements; formal methods and deep testing; evals, rubrics and harness gates; code review and change-risk verification | SHACL and pySHACL, Pydantic, promptfoo, Ragas, the harness gate sets, grill-me, ADRs | [LinkML](https://github.com/linkml/linkml), [Open Ontologies](https://github.com/fabio-rovai/open-ontologies), [Vale](https://github.com/vale-cli/vale), [Hypothesis](https://github.com/HypothesisWorks/hypothesis), [SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator), [reviewdog](https://github.com/reviewdog/reviewdog), /code-review | 86 |
| T4 Semantic layers and agent grounding | Engineering graph and code intelligence; knowledge graphs and GraphRAG; retrieval substrate; enterprise semantic layer and data context; agent memory; context assembly and compression; knowledge work surface; RAG Factory blueprints | dev\_graph, CodeGraph, Neo4j, Qdrant, Postgres, Context Packs, Context7, Obsidian | [Auto Ontology](https://github.com/NVIDIA/auto-ontology), [Cube](https://github.com/cube-js/cube), [Boring Semantic Layer](https://github.com/boringdata/boring-semantic-layer), [Honcho](https://github.com/plastic-labs/honcho), [Graphiti](https://github.com/getzep/graphiti) | 92 |
| T3 Pipelines and applications | Source harvesting; document processing; research and monitoring; browser and app operation; interface design; diagrams and decks; video, motion, voice and 3D; marketing and distribution; sales, CRM and outreach; client measurement; training and enablement | Firecrawl, Docling, pandoc, Playwright MCP, Hyperframes, Manim | [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp), [ComfyUI](https://github.com/Comfy-Org/ComfyUI), [Postiz](https://github.com/gitroomhq/postiz-app), [Twenty](https://github.com/twentyhq/twenty), [Evidence](https://github.com/evidence-dev/evidence), [WhisperX](https://github.com/m-bain/whisperX), [claude-howto](https://github.com/luongnv89/claude-howto) | 154 |
| T2 Agent runtimes and harnesses | Coding agents; knowledge-work surfaces; alternative harnesses; sandboxes; guardrails and agent security; channels | Claude Code, Docker, hook denylist, allowedTools, Telegram | Claude Cowork as the partner surface, [sandbox-runtime](https://github.com/anthropics/sandbox-runtime), [agent-scan](https://github.com/snyk/agent-scan), [Presidio](https://github.com/data-privacy-stack/presidio), [OpenShell](https://github.com/NVIDIA/OpenShell) | 65 |
| T1 Extension primitives | Skills; plug-ins, marketplaces and distribution; subagents; hooks, commands and project constitution; MCP servers and connector tooling; catalogues | SKILL.md, the internal skills and 13 subagents, hooks, GitHub MCP, mattpocock/skills | [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins), a private plugin marketplace repo, [skills CLI](https://github.com/vercel-labs/skills), [FastMCP](https://github.com/PrefectHQ/fastmcp) | 119 |
| T0 Substrate | Model providers; local runtime and offline kit; routing and gateways; embeddings and rerankers; compute and hosting; network, identity and secrets; SCM, CI/CD and code quality | Claude models, LiteLLM, OpenRouter, Docker Compose, GitHub Actions, uv, Ruff | [Ollama](https://github.com/ollama/ollama), [Tailscale](https://github.com/tailscale/tailscale), [Vaultwarden](https://github.com/dani-garcia/vaultwarden), [Kiwix tools](https://github.com/kiwix/kiwix-tools) | 99 |

Your home folder has config directories for claude-mem, Context7, Headroom, Serena, OpenCode, Codex, Cursor and ComfyUI, so the sheet treats those as already in use rather than as candidates.

## Role domains

The Architect operates 52 of the 55 clusters; the two partners mostly consume through Claude Cowork plug-ins and browser tabs, so their mid-tier machines never need to run a model.

| Role | Home clusters | Daily toolbelt | Items in reach |
| --- | --- | --- | --- |
| Architect, builder, system engineer | All of T7 to T4, T2 and T0; operates the T3 services the partners use | Hermes, Claude Code, dev\_graph, the Compose stack, promptfoo, Phoenix, LiteLLM, local models | 689 |
| Designer, content creator | Interface design and front-end; diagrams, decks and documents; video, motion, voice and 3D; the content half of marketing | Claude Cowork with the design and marketing plug-ins, diagram-design, [Hallmark](https://github.com/nutlope/hallmark), Figma MCP, [motion-skills](https://github.com/iart-ai/motion-skills) over Hyperframes and [Remotion](https://github.com/remotion-dev/remotion), ComfyUI on the hub through a browser, Postiz | 269 |
| Business analyst, marketing specialist | Research and opportunity monitoring; marketing and distribution; sales, CRM and outreach; client measurement; training and enablement; requirements interviews and output rating | Claude Cowork with the sales, marketing, data and product-management plug-ins, Twenty, [Meetily](https://github.com/Zackriya-Solutions/meetily), Evidence and Umami dashboards, [last30days](https://github.com/mvanhorn/last30days-skill), TrendRadar, [Kiln](https://github.com/Kiln-AI/Kiln) for rating outputs | 391 |

| Hosting | What runs there | Default for |
| --- | --- | --- |
| Hub: your workstation (32 GB GPU, 128 GB RAM) | Hermes, the Compose stack (Neo4j, Qdrant, Postgres, Phoenix), local models behind LiteLLM, ComfyUI, WhisperX, experiment loops | 552 items |
| Spoke: a partner's machine | Claude Cowork and its plug-ins, OpenCode pointed at the hub's gateway, Meetily, Kiln, browser tabs for hub apps | 52 items |
| Cloud: managed services | Claude scheduled tasks, GitHub, hosted MCP servers for ads and outreach, model providers | 127 items |
| Client: their environment | The skills, plug-ins and scheduled tasks you hand over, and semantic-layer work on their data | 13 items |

Three design calls follow from this split.

1. **Keep always-on partner apps off the GPU box.** The CRM, the social scheduler and the Hermes gateway need uptime that a workstation running experiments cannot promise, and they hold personal data of leads and clients. Put those on a small VPS or the vendor's hosted tier; keep the hub for GPU work and the knowledge stack.
2. **Distribution depends on the Claude plan.** Pushing skills to every member from Organization settings is a Team and Enterprise feature ([Claude support](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization)). On individual subscriptions, a private plugin marketplace repo does the same job by hand, and the [skills CLI](https://github.com/vercel-labs/skills) carries the same skills to OpenCode.
3. **One gateway for local models.** LiteLLM in front of the hub, with a key and budget per partner, gives OpenCode on the spokes cheap tokens and feeds the cost ledger. Current guides disagree on the best model for 32 GB ([one](https://www.llamabuilds.ai/gpus/rtx-5090/best-models) picks Qwen3.8 27B, [another](https://bishalkshah.com.np/blog/best-local-llm-for-coding) Qwen3-Coder 30B-A3B), so let the personal eval decide.

## Coverage of the 33 capability needs

Every need has at least one mapped tool, but only 10 can be met by adopting something as it stands. Another 18 need tools composed with a thin skill or job of your own, 3 are pure builds (N10, N12, N30), N17 is a guarded trial and N09 waits behind an ADR. That matches the roadmap's own thesis: the tools exist, and what is missing is the judgment layer that wires them to your method.

| Need | Phase | Verdict | Best-fit tools | Gap or build item |
| --- | --- | --- | --- | --- |
| N01 Multi-reviewer code review aggregation | P2 | Compose and build | /code-review and ultrareview, [reviewdog](https://github.com/reviewdog/reviewdog), [PR-Agent](https://github.com/The-PR-Agent/pr-agent), review-merge skill | No tool dedupes findings across AI reviewers: build the review-merge skill. |
| N02 Blast-radius classification of changes | P2 | Compose and build | [CodeGraph](https://github.com/colbymchenry/codegraph), [Open Ontologies](https://github.com/fabio-rovai/open-ontologies), risk-class gate | The risk policy is project-specific: build the risk-class gate into the Agent harness. |
| N03 Requirements-interview tooling | P2 | Adopt | [grill-me and grill-with-docs](https://github.com/mattpocock/skills) |  |
| N04 Domain-glossary management | P2 | Compose | [Vale](https://github.com/vale-cli/vale), [LinkML](https://github.com/linkml/linkml), [Open Ontologies](https://github.com/fabio-rovai/open-ontologies) | Nothing syncs the glossary into UI copy and client conversations; that stays a review habit. |
| N05 Rubric and eval authoring | P2 | Compose and build | [promptfoo](https://github.com/promptfoo/promptfoo), [evals-skills](https://github.com/hamelsmu/evals-skills), [Kiln](https://github.com/Kiln-AI/Kiln) | Turning thumbs-down votes into rules needs the thumbs-down-to-rule skill. |
| N06 Delivery metrics | P2-P3 | Compose and build | [Apache DevLake](https://github.com/apache/devlake), [CodeBurn](https://github.com/getagentseal/codeburn) | The tests-pass versus would-merge gap has no ready metric: add merge-gap fields to the cost ledger. |
| N07 Agent-operable app runtime | P1-P2 | Adopt | [Playwright MCP](https://github.com/microsoft/playwright-mcp), [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) |  |
| N08 Production monitoring with model-graded evals | P3 | Adopt | [Arize Phoenix](https://github.com/Arize-ai/phoenix), already in the Compose stack |  |
| N09 Multi-agent orchestration | P3-P4 | Defer behind an ADR | Hermes Agent, then [Paperclip](https://github.com/paperclipai/paperclip) and [Multica](https://github.com/multica-ai/multica) as benchmarks | v1 excludes multi-agent orchestration, so adoption needs a signed ADR. |
| N10 Junior training environments | P4 | Build | [DeepTutor](https://github.com/HKUDS/DeepTutor) for study only | Build the customer-sim skill. |
| N11 Discovery-call funnel capture | P3 | Compose and build | [WhisperX](https://github.com/m-bain/whisperX) or [Meetily](https://github.com/Zackriya-Solutions/meetily), the sales plug-in, [Twenty](https://github.com/twentyhq/twenty) | Build the RACE funnel skill. |
| N12 Goal-factoring tree builder | P3 | Build | None found | Build the goal-factoring skill. |
| N13 Ad-platform integration | P3 | Adopt, guarded | [Google Ads MCP](https://github.com/googleads/google-ads-mcp), [Meta Ads MCP](https://github.com/pipeboard-co/meta-ads-mcp), [claude-ads](https://github.com/AgriciDaniel/claude-ads), [ComfyUI](https://github.com/Comfy-Org/ComfyUI) for variants | Staging paused ads is a write to a client account: keep it a human-approved step. |
| N14 Scheduled cloud execution | P1, P3 | Adopt | Claude cloud scheduled tasks, Hermes cron, GitHub Actions |  |
| N15 Skill packaging and org-wide distribution | P3-P4 | Adopt | [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins), private plugin marketplace repo, [skills CLI](https://github.com/vercel-labs/skills), [Agent Skills specification](https://github.com/agentskills/agentskills) | Admin push to every member needs a Team or Enterprise plan. |
| N16 Eval harness for skills | P2-P3 | Compose | skill-creator plug-in, [SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator), [promptfoo](https://github.com/promptfoo/promptfoo) |  |
| N17 Chat-log mining | P3 | Trial, guarded | [AutoHarness](https://github.com/tigerless-labs/autoharness), [Presidio](https://github.com/data-privacy-stack/presidio), SOP-miner skill | Mining colleagues' chat logs needs their consent and a data-protection basis. |
| N18 Workshop and training delivery | P3-P4 | Compose and build | [claude-howto](https://github.com/luongnv89/claude-howto), [learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) | Build the curriculum tracker for team capability. |
| N19 Client measurement and attribution | P3 | Compose and build | [Evidence](https://github.com/evidence-dev/evidence), [Umami](https://github.com/umami-software/umami) | Build the KPI baseline and guarantee tracker. |
| N20 Multi-client account management | P3 | Compose, guarded | [Vaultwarden](https://github.com/dani-garcia/vaultwarden), [Tailscale](https://github.com/tailscale/tailscale) | Write the credential handover procedure before the first client. |
| N21 Model-release and benchmark monitoring | P0-P4 | Compose and build | [models.dev](https://github.com/anomalyco/models.dev), [changedetection.io](https://github.com/dgtlmoon/changedetection.io), [TrendRadar](https://github.com/sansan0/TrendRadar) | Build the model-watch job that alerts on Telegram and triggers the personal eval. |
| N22 No-code migration | P1 | Compose and build | [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), [Activepieces](https://github.com/activepieces/activepieces) | Build the workflow-to-skill converter. |
| N23 Higher-bandwidth output generation | P4 | Adopt | Hyperframes, [Remotion](https://github.com/remotion-dev/remotion), [motion-skills](https://github.com/iart-ai/motion-skills), [ComfyUI](https://github.com/Comfy-Org/ComfyUI), [3d-force-graph](https://github.com/vasturiano/3d-force-graph) |  |
| N24 Opportunity scanning | P4 | Compose and build | [last30days](https://github.com/mvanhorn/last30days-skill), [Agent-Reach](https://github.com/Panniantong/Agent-Reach), [TrendRadar](https://github.com/sansan0/TrendRadar), [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Build the scheduled opportunity-scan job. |
| N25 Agent sandboxing and guardrails | P1-P4 | Adopt | Claude Code hooks, [sandbox-runtime](https://github.com/anthropics/sandbox-runtime), [agent-scan](https://github.com/snyk/agent-scan), [OpenShell](https://github.com/NVIDIA/OpenShell) |  |
| N26 Personal eval runner | P0 | Compose and build | [promptfoo](https://github.com/promptfoo/promptfoo) over LiteLLM or OpenRouter | Build the personal eval repo of 10 to 15 tasks. |
| N27 Batched news intake | P0 | Compose and build | [Miniflux](https://github.com/miniflux/v2), [TrendRadar](https://github.com/sansan0/TrendRadar), [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | Build the weekly news-window digest skill that tags camp and incentive. |
| N28 Offline knowledge kit | P0 | Adopt | [Ollama](https://github.com/ollama/ollama) or LM Studio, [Kiwix tools](https://github.com/kiwix/kiwix-tools) |  |
| N29 Account-security audit | P0 | Compose and build | [Vaultwarden](https://github.com/dani-garcia/vaultwarden) reports, [2FA Directory](https://github.com/2factorauth/twofactorauth) | No tool finds SMS-based 2FA across accounts: build the MFA audit checklist skill. |
| N30 Job-exposure self-assessment | P0, P4 | Build | None found | Build the TLC exposure skill. |
| N31 Relationship and network management | P4 | Adopt | [Monica](https://github.com/monicahq/monica), [Twenty](https://github.com/twentyhq/twenty) |  |
| N32 Learning-path tracker | P1 | Compose and build | [Open Notebook](https://github.com/lfnovo/open-notebook), [DeepTutor](https://github.com/HKUDS/DeepTutor), [claude-howto](https://github.com/luongnv89/claude-howto) | Build the curriculum tracker. |
| N33 Personal brand and distribution pipeline | P3-P4 | Compose | [Postiz](https://github.com/gitroomhq/postiz-app), [claude-seo](https://github.com/AgriciDaniel/claude-seo), the marketing and sales plug-ins, [Twenty](https://github.com/twentyhq/twenty), [Umami](https://github.com/umami-software/umami) | Outreach servers (Apollo, Hunter, Instantly, Smartlead) stay guarded until consent and GDPR handling are settled. |

The 19 build items are small: 10 skills, 2 scheduled jobs, 1 harness gate, 3 ledger or tracker templates, 2 repos and 1 procedure. The sheet lists them with the verification value "Proposed build". Phases P0 and P1 need only seven: the personal eval repo, the model-watch job, the news-window digest, the MFA checklist, the TLC skill, the curriculum tracker and the workflow-to-skill converter.

## Catalogue triage

Of the 72 GitHub links in tools.md, 71 resolve and 1 is dead; the bare names needed more interpretation, and eight of them need your call. Across both catalogues and the new discoveries, just over 400 distinct repositories were checked on 17 November 2026 for existence, stars, last commit and licence file.

| In tools.md | What I found | How it is recorded |
| --- | --- | --- |
| `cbrock84/headcount` | The link returns 404 | Dropped; send the right link if it matters |
| "laya" | Two live projects: [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya), a small decision model (35,605 stars), and [aayushch/laya](https://github.com/aayushch/laya), a notification command centre (825 stars) | Both listed as optional; tell me which you meant |
| "headspcae" | No project by that name. [Headroom](https://github.com/headroomlabs-ai/headroom) fits, and you have a `.headroom` folder | Mapped to Headroom |
| "security-audit-skill" | [netresearch/security-audit-skill](https://github.com/netresearch/security-audit-skill): 53 stars, deep checks are PHP and TYPO3 specific | Reference only; [claude-code-security-review](https://github.com/anthropics/claude-code-security-review) covers the need |
| `/plugin enable cc-plugin-you-should-know@builtin` | Not in [claude-plugins-official](https://github.com/anthropics/claude-plugins-official), and no search result | Unverified |
| "agent reach skill" | [Agent-Reach](https://github.com/Panniantong/Agent-Reach) is an internet-reading CLI. The Hermes catalogue uses "Agent Reach" for capability governance | Kept as two different rows |
| "deepseek harness" | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), a developer preview | Optional benchmark among coding agents |
| hunter-mcp, instantly-mcp, Smartlead MCP | Hunter's repository is deprecated and the LeadMagic Smartlead repository is archived; each vendor now runs a hosted server ([Instantly](https://developer.instantly.ai/mcp/introduction.md)) | Mapped to the hosted servers, guarded |

| Flag | Items | Why |
| --- | --- | --- |
| Out of scope | [Kronos](https://github.com/shiyu-coder/Kronos), [calibrain-harness](https://github.com/zadescoxp/calibrain-harness), [Algory](https://algory.app/) | Trading tools; they belong to the trading track, not Hermes OS or the consultancy |
| Legal review first | [Craft Anything](https://github.com/storytold/craft-anything), [Replica skill](https://github.com/Jakeschincariol/replica-skill) | Both rebuild other people's products; a consultancy should settle the IP position before using them for clients |
| Authorised targets only | [Strix](https://github.com/usestrix/strix), [Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) | Offensive security tooling |
| Low-trust reference | [best-apis-for-lead-gen](https://github.com/cporter202/best-apis-for-lead-gen), [lead-gen-api-stack](https://github.com/cporter202/lead-gen-api-stack), [awesome-grok-bot](https://github.com/bigibyte/awesome-grok-bot) | The two lists promote one paid marketplace (96 and 189 stars); the third has 17 stars |
| Licence check before client use | [context-mode](https://github.com/mksglu/context-mode) (Elastic-2.0), [Desloppify](https://github.com/peteromallet/desloppify) (non-standard), [Multica](https://github.com/multica-ai/multica) (README says source-available), n8n (Sustainable Use), and the AGPL apps: Postiz, Twenty, Maxun, MiroFish | Fine for internal use; read the terms before hosting them for a client or shipping a modified copy |
| No licence file at the default path | Plannotator, Craft Anything, PdfCraft, andrej-karpathy-skills, both lead-gen lists | Treat as all rights reserved until checked |

| Overlap group | Members | Suggested keeper |
| --- | --- | --- |
| Code topology | CodeGraph, Graphify, Serena, CodeFlow, Floorplan | CodeGraph as the dev\_graph adapter (already decided), Serena for edits (already installed) |
| Token economy | context-mode, Headroom, Chisle, TokenEconomizer, Ponytail | Headroom plus the Ponytail rule; benchmark one more at most |
| Agent team boards | Paperclip, Multica, herdr, Switch, vibe-kanban, claude-squad, Gas Town | None until the ADR; then Paperclip against Multica |
| Web harvesting | Firecrawl, Crawl4AI, Scrapling, ScrapeGraphAI, Maxun | Firecrawl, as the catalogue's "choose one web stack" already leans; Scrapling as the local fallback |
| Skill learning | Hermes self-improving loop, AutoHarness, Skill Recorder | The Hermes loop; AutoHarness as a trial on Claude Code sessions |
| Spec methods | grill-me, Spec Kit, OpenSpec, BMAD | grill-me; the roadmap already records that spec-driven development made code worse for S6 |
| Free model lists | awesome-free-llm-apis, free-llm-api-resources | The first (13,450 stars against 310) |

Four entries in the Hermes catalogue have moved: Ragas is now at vibrantlabsai/ragas, OpenCode at anomalyco/opencode, OpenHands at OpenHands/OpenHands and DVC at treeverse/dvc. The 214 catalogue rows that are features, concepts or vendors without a repository were classified but not re-checked. The licence column is keyword-detected from each licence file, so treat it as a pointer.

## Graph model for the 3D map

The framework is already a graph: 863 nodes and 1,537 edges, saved as `tool-framework.graph.json` in `C:\Code\roadmap\tool-discovery`, with the same rows as `tool-matrix.csv` beside it. Each tier node carries a height and each cluster a sector index, so a renderer such as [3d-force-graph](https://github.com/vasturiano/3d-force-graph) can pin tiers to planes and let tools settle around their cluster.

| Node type | Count | Key attributes |
| --- | --- | --- |
| Tier | 8 | name, description, height |
| Cluster | 55 | tier, operated by, used by, hosting, value stream, gate, sector |
| Tool | 752 | every axis in the Axes table, plus repository URL and a size derived from stars |
| Need | 33 | roadmap domain, phase, verdict, lead role, home cluster, approach, gap |
| Role, value stream, phase | 3, 6, 5 | label |

| Edge type | Count | Reads as |
| --- | --- | --- |
| contains | 815 | root to tier, tier to cluster, cluster to tool: the hierarchy |
| serves | 315 | tool helps with a need; flagged when it is a best fit |
| implements | 51 | an internal skill or subagent at T1 realises a higher cluster: the vertical wiring |
| operates, uses | 55, 94 | role to cluster |
| serves\_stream | 55 | cluster to value stream |
| scheduled\_in | 49 | need to roadmap phase |
| homed\_in | 33 | need to the cluster that owns it |
| overlaps | 70 | tools that compete for one slot, in eight groups |

Three views fall out of this without extra data: the stack (tiers as planes), a role lens (colour by who uses a tool, fade the rest) and a roadmap scrub (step P0 to P4 and light up the needs and tools each phase calls for).

## Sources

- Your inputs: the Hermes / Claude Code tool catalogue, tools.md, the Hermes OS README, and the handoff brief in "AI 2027 — Thematic Analysis & Aggregated Roadmap.md".
- GitHub, read on 17 November 2026: repository pages for stars and descriptions, a shallow clone of each for the last commit, and each licence file and README. The raw results are in `tool-discovery/evidence/github-repo-check-2026-11-17.tsv`.
- [Claude Code docs: ultrareview](https://code.claude.com/docs/en/ultrareview) and [cloud scheduled tasks](https://code.claude.com/docs/en/web-scheduled-tasks)
- [Claude support: provision and manage skills for your organization](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization)
- [Instantly MCP documentation](https://developer.instantly.ai/mcp/introduction.md) and a third-party [write-up of the Smartlead server](https://syncgtm.com/blog/smartlead-mcp-server-2026)
- [The New Stack on DeepSeek Harness](https://thenewstack.io/deepseek-harness-open-source-plugins/)
- [Algory product page](https://algory.app/)
- Local model guides for 32 GB cards: [llamabuilds](https://www.llamabuilds.ai/gpus/rtx-5090/best-models), [Bishal Shah](https://bishalkshah.com.np/blog/best-local-llm-for-coding)
