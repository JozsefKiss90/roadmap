# RM AI adoption strategy: four infographics

Status: ready-for-agent

Design specification for an implementing agent. The terms in bold on first use are defined in [GLOSSARY.md](./GLOSSARY.md); use them as defined and keep every word in its avoid lists off the infographics. The original brief is `.scratch/offtopic/prompt.md`.

## Goal

Four **infographics** that argue for official adoption of the **strategy** in the department: one **overview** and one per **mechanism**. The primary audience is department and faculty leadership, who should grant the three **asks**. The secondary audience is research-management colleagues, who should start using and developing the mechanisms.

Icons, diagrams and screenshots carry the message. Text is a last resort.

## Deliverables

All output lives under `.scratch/rm-ai-adoption/`. Nothing outside that folder changes.

| File | What it is |
|---|---|
| `diagrams/overview-path.html` | Standalone source of the overview's path diagram |
| `diagrams/twofold.html` | Standalone source of Twofold's central diagram |
| `diagrams/proposal-orchestrator.html` | Standalone source of the Proposal Orchestrator's central diagram |
| `diagrams/budget-engine.html` | Standalone source of the Budget Engine's central diagram |
| `rm-ai-adoption.html` | One self-contained page holding the four infographics in order |
| `export/01-overview.png` to `export/04-budget-engine.png` | Each infographic at 1920×1080 |
| `assets/` | Cropped screenshots |

## Sources

Primary sources, one content spec per mechanism. Read the spec, not the generated HTML beside it.

| Mechanism | Content spec |
|---|---|
| **Twofold** | `C:\Code\knowledge-graph-app\.archify\explainer-vision-and-brand-20261126-140414\candidate.archify.md` |
| **Proposal Orchestrator** | `C:\Code\proposal_demo\proposal_orchestrator\.archify\explainer-meta-overview-20261126-150000\candidate.archify.md`, plus `tiers.dataflow.json` and `states.lifecycle.json` in the same folder |
| **Budget Engine** | `C:\elte_ai_course\.archify\architecture-bedrock-budget-automation-20261126-151500\candidate.json` |

These are schematics, not design prototypes. Take facts from them and nothing visual.

Design reference: `C:\Code\roadmap\AI_roadmap_2027.html`, its style guide `C:\Code\roadmap\references\style-guide.md`, and its standalone diagram sources in `C:\Code\roadmap\diagrams\`. Read these only; do not edit them.

Two facts come from the brief alone and may be stated as facts: the Proposal Orchestrator was tested on 2 MSCA proposals, and the workstation has 32 GB VRAM and 128 GB DDR5. "5+ proposals in parallel" is the planned workload, not a present fact.

## Build method

1. Draw the four diagrams with the diagram-design skill against `references/style-guide.md`, each as a standalone file in `diagrams/`.
2. Assemble `rm-ai-adoption.html` by hand: inline CSS, inline SVG, no script libraries. Google Fonts is the only external request.
3. Export each infographic as a PNG at 1920×1080.

## Visual language

Kept from the reference:

- The "Ivory and cobalt" palette of the style guide.
- Instrument Serif for names and promise lines, Geist for body text, Geist Mono for small uppercase labels.
- One accent per diagram, on the focal element only.
- The style guide's contrast contract: 4.5:1 for text, 3:1 for marks.

Changed from the reference:

- Draw in the **light** skin (ivory paper `#f6f1e7`, ink `#14213d`, accent `#1f4fd8`). These go into slides and handouts.
- Each infographic is a fixed 16:9 panel. The page stacks the four; it is not a scrolling report.
- No tables, no collapsible cards, no navigation bar.
- At most 60 words per infographic outside diagram labels.
- At most seven labelled parts per diagram.

### Present and planned

Anything that exists today is drawn solid. Anything planned or proposed is drawn in outline with a dashed stroke. This applies to diagram parts, benefit examples and hosting statements alike. A viewer must never read a planned item as running.

### Colour

No mechanism has its own colour. The three are told apart by icon and name. In Twofold's diagram, money awarded is solid cobalt and money on offer is cobalt outline with hatching.

### Icons

One outline family throughout: Lucide, one stroke weight, drawn in ink, with the accent only on the focal icon. Inline each icon as SVG. An icon is needed for each of these:

- The five **benefits**: Automate, Simplify, Accelerate, Innovate, Adapt.
- The four **rules**.
- The three **stages**.
- The two **leads**.
- The three mechanisms.
- A person, used wherever someone decides or approves.

### Images

Real screenshots only. No generated pictures, no stock pictures, no mock-ups. No EU flag, no ring of stars, no flag blue with flag yellow.

- **Twofold**: capture from the deployed app, cropped to one telling region of the open-calls view. Candidate addresses found in the repo: `https://eu-graphs.up.railway.app` and `https://knowledge-graph-frontend-production.up.railway.app`. Use whichever serves the app.
- **Budget Engine**: run the engine to build a blank planning workbook and capture a cropped region of it.
- **Proposal Orchestrator**: no screenshot. Its image zone holds a small drawing of one gate result, pass and block side by side.

If a capture cannot be made, leave a labelled placeholder in the zone and report it.

## Layout

The three mechanism infographics share this layout:

```
┌──────────────────────────────────────────────────────────┐
│ icon  NAME   promise line              stage ●─○─○  lead │
├──────────────────────────────────┬───────────────────────┤
│                                  │  benefits: 4 icons,   │
│        central diagram           │  one example each     │
│                                  ├───────────────────────┤
│                                  │  screenshot           │
├──────────────────────────────────┴───────────────────────┤
│ 4 rules, one instance each   │ hosting statement │ next  │
└──────────────────────────────────────────────────────────┘
```

The overview keeps the top and bottom bands and puts the **path** in the middle:

```
┌──────────────────────────────────────────────────────────┐
│ AI in research management: three mechanisms, one strategy│
│ Automate   Simplify   Accelerate   Innovate   Adapt      │
├──────────────────────────────────────────────────────────┤
│ Choose the call ─▶ Write the proposal ─▶ Build the budget│
│   Twofold      ☺    Proposal Orchestrator ☺  Budget Engine│
│   stage, lead        stage, lead            stage, lead  │
├──────────────────────────────────────────────────────────┤
│ How every mechanism behaves: 4 rules │ ask strip: 3 asks │
└──────────────────────────────────────────────────────────┘
```

A person is drawn at each handover between steps of the path. The mechanisms hand over to each other; they are never drawn as one merged system.

Every infographic carries a foot line in small mono type: Kiss József, the department, ELTE, and the month and year.

## Shared content

### The five benefits

Automate, Simplify, Accelerate, Innovate, Adapt. The overview shows all five. Each mechanism infographic shows the four it delivers, with the example given below.

### The four rules

Heading on the overview: "How every mechanism behaves".

1. A person decides; the AI advises.
2. Figures are computed by fixed code, never by the model.
3. Every claim cites its source and date.
4. A declared failure beats a made-up result.

Do not add generic "responsible AI" wording anywhere.

### The ask strip

On the overview only.

1. Official departmental status for the Proposal Orchestrator.
2. The workstation as its approved host. It is already available; the ask is approval to use it, not budget.
3. Colleague time to use and develop the Budget Engine.

### Naming real things

Name ELTE, the department and MSCA. Do not name individual proposals, applicants or colleagues.

## Infographic 1: overview

Content as in the layout above. Each mechanism on the path shows its icon, name, stage marker and lead marker, with no further detail.

## Infographic 2: Twofold

| Field | Content |
|---|---|
| Promise line | "See the call. See who has been funded." |
| Descriptor | "European research funding, on offer and awarded" |
| Stage | In use, for open calls |
| Lead | Its author |
| Next step | The funded track record goes live |

If the name Twofold has been dropped by the time work starts, use the descriptor alone as the name.

**Central diagram.** Two source streams enter from the left: money on offer (the Funding and Tenders portal) and money awarded (CORDIS). They join in the middle through subject-area tagging, curated by hand. Two jobs leave on the right: weekly monitoring and occasional deliberation. The awarded stream is drawn as planned until it is live.

**Benefits.**

| Benefit | Example | Drawn as |
|---|---|---|
| Simplify | Calls and track record in one place | Present |
| Accelerate | Weekly monitoring by research field | Present |
| Innovate | An assistant that cites the data | Present |
| Adapt | "What changed" on watched calls | Planned |

**Rules, one instance each.**

1. It informs the decision to commit proposal effort and never makes it.
2. Counts and sums come from the data, not from the assistant.
3. Every figure answers "says who, as of when".
4. An empty result is shown as a finding with its scope.

**Hosting statement.** A deployed web app over public funding data from the Funding and Tenders portal and CORDIS. It holds no proposal data. Take the remaining details from the source and the repo; state only what is verified.

**Wording limits from its source.** Say "research field", "awarded" and "in one place". Twofold is never a proposal-writing tool, a publications index or an adjudicator, and shows no eligibility ruling or winnability score.

## Infographic 3: Proposal Orchestrator

| Field | Content |
|---|---|
| Promise line | "From sources to a gated proposal draft." |
| Stage | Built; tested on 2 MSCA proposals |
| Lead | Its author |
| Next step | Becomes the department's working tool for 5+ proposals in parallel |

**Central diagram.** Sources enter on the left (funding rules, call documents, project data). A chain of phases runs left to right with a gate on every link. A proposal leaves on the right. A person stands above the chain, outranking everything. The budget gate is the focal element, marked as the one that blocks drafting when it fails. Show no gate IDs and no tier numbers.

**Benefits.**

| Benefit | Example | Drawn as |
|---|---|---|
| Automate | Sources to a gated draft | Present |
| Accelerate | Three sections drafted in parallel | Present |
| Innovate | Gates that block a made-up result | Present |
| Adapt | New call rules enter as a source | Present |

**Rules, one instance each.**

1. A person's override outranks every rule and every agent.
2. Unit-cost budgets are derived by fixed code from published rates.
3. Sources are ranked by authority; a lower one never overrides a higher one.
4. A failed gate stops the run and names one failure origin.

**Hosting statement.** Today it runs on the department's workstation and calls Claude for language work; its gates and unit-cost budget never call a model. Planned, drawn in outline: local models on the same workstation (32 GB VRAM, 128 GB DDR5).

**Left off.** Tracking, monitoring, teamwork and collaboration are not in the source. Do not show them.

## Infographic 4: Budget Engine

| Field | Content |
|---|---|
| Promise line | "Every figure computed, every budget approved by a person." |
| Stage | Built, for blank planning workbooks |
| Lead | Colleagues, with the author's support |
| Next step | Private deployment on AWS that reads real partner data |

**Central diagram.** Partner data enters on the left. A private boundary surrounds the processing. Inside it, the engine computes the figures and is the focal element. A named person approves before anything reaches the funder on the right. Today's part (the engine building and checking a blank workbook) is solid. The proposed part (the boundary, data intake, filling and evaluating) is in outline. Show no AWS service names.

**Benefits.**

| Benefit | Example | Drawn as |
|---|---|---|
| Automate | Workbook built and checked | Present |
| Simplify | Partner data captured once | Planned |
| Accelerate | Rebuild when partners change | Planned |
| Adapt | A new Programme Guide becomes a new profile | Planned |

**Rules, one instance each.**

1. Only a named person approves and submits a budget.
2. The model interprets and explains; it never calculates a figure.
3. Every finding cites the rule it rests on.
4. A workbook is delivered only after its checks pass.

**Hosting statement.** Today it runs locally and a person enters all data. Proposed, drawn in outline: one private AWS account in one EU region with no public internet path, where prompts are not used to train models.

## Acceptance checks

1. Four infographics exist in `rm-ai-adoption.html` and as four PNGs at 1920×1080.
2. Each PNG is readable alone: name, promise line, stage and lead are present on each mechanism infographic.
3. No infographic exceeds 60 words outside diagram labels, and no diagram exceeds seven labelled parts.
4. The style guide's contrast script passes on every diagram.
5. Every planned item is drawn in outline, and every present-day claim traces to a source file or to one of the brief's two stated facts.
6. No word from the glossary's avoid lists appears on any infographic.
7. The implementer views each PNG and reports any overlap, clipped text or placeholder.

## Open inputs

- The department's name for the foot line is not in any source. Use "Department" as a labelled placeholder and report it.
- Which of the two Twofold addresses is current is unverified.
- Twofold's hosting details beyond "deployed web app over public data" need checking in its repo before they are stated.

## Out of scope

- A Hungarian version. Keep text sparse enough that one is a later swap of labels.
- Calendar dates or a timeline.
- Any tie to the Agentic OS tool framework, its needs, tiers or roles.
- Changes to the three mechanisms' own repos.
