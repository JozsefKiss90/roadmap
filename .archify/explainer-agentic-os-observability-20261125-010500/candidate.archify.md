# Where does the Agentic OS observability increment stand? {#observability-increment}

The increment is a **read-only observability layer** over the tool inventory: a markdown vault holds each tool's state, the Markdown Engine reads it, and Jarvis shows it. Four of eight tickets are resolved, and the vault note schema (ticket 05) now gates every remaining one.

- The tool matrix owns identity and classification; the vault owns operational state.[](source:map)
- Nothing acts in this increment: server code is limited to read-only routes that report state.
- Jarvis is built from four FounderOS parts, copied and adapted, about 20k lines.[](source:t03)
- Tool state is three separate axes, not one ladder: status, active and health.[](source:t04)

@answer scope="State of `.scratch/agentic-os-observability` on 2026-11-25 · spec only, building is a separate effort"
@meta locale=en
@source map title="Map: Agentic OS observability increment" path=.scratch/agentic-os-observability/map.md
@source t01 title="Ticket 01: Markdown to HTML and back" path=.scratch/agentic-os-observability/issues/01-markdown-html-round-trip.md
@source t02 title="Ticket 02: Promotion conventions in the reference templates" path=.scratch/agentic-os-observability/issues/02-promotion-conventions-in-reference-templates.md
@source t03 title="Ticket 03: FounderOS extraction audit" path=.scratch/agentic-os-observability/issues/03-founderos-extraction-audit.md
@source t04 title="Ticket 04: Tool status ladder" path=.scratch/agentic-os-observability/issues/04-tool-status-ladder.md

## What are the parts, and who owns which data? {#parts}

@architecture id=system-parts title="Observability increment: parts and data ownership"
| role database | Owned data |
| role backend | Read-only engine |
| role frontend | View |
| role external | Outside the build |
| partner | Partner | external |
| matrix | Tool matrix | database |
| vault | Markdown vault | database |
| engine | Markdown Engine | backend |
| jarvis | Jarvis | frontend |
| fmap | Framework map | frontend |
| founderos | FounderOS | external |
| obsidian | Obsidian | external |
| matrix > vault | generates identity | emphasis |
| vault > matrix | writes back state | dashed |
| partner > vault | commits moves |
| vault > engine | notes | emphasis |
| engine > jarvis | read-only routes | emphasis |
| founderos > jarvis | copied parts |
| jarvis > fmap | links or embeds |
| matrix > fmap | builds |
| vault > obsidian | optional viewer |

@steps id=parts-steps
| s-matrix | Tool matrix | Owns id, name, kind, tier, cluster and needs. It stays the primary inventory, in this repo. | system-parts | matrix |
| s-vault | Markdown vault | A git repo, also opened as an Obsidian vault. Notes are generated from the matrix and checked against it. The vault owns status, declared activity, notes and links. | system-parts | vault |
| s-engine | Markdown Engine | Reads the vault, round-trips markdown and HTML, and serves read-only routes. Health is computed live here and is never stored. | system-parts | engine |
| s-jarvis | Jarvis | The front end, in a new repo on the FounderOS stack. Tool status shows here only. | system-parts | jarvis |
| s-fmap | Framework map | Its design is not changed (open–closed). Jarvis links to it or embeds it. | system-parts | fmap |
| s-founderos | FounderOS | Export, not merge: modules are copied with the MIT notice, or re-implemented where they are tied to business domains. | system-parts | founderos |

@callout level=open-question title="The write-back path is not designed yet"
The dashed arrow from the vault to the tool matrix is ticket 06. Column or sidecar file, direction, trigger and mismatch reporting are all open.

## Which requirements does every ticket stand on? {#requirements}

| Requirement | What it rules in or out |
| --- | --- |
| Export, not merge | Copy FounderOS modules into a new repo and adapt them. Keep the MIT notice. |
| FounderOS stack | Next.js 14, React 18, TypeScript, Tailwind 3, zod, Vitest. `better-sqlite3` waits for a later increment. |
| Open–closed framework map | The map stays its own build. Status in the 3D map is deferred. |
| Split ownership | The matrix owns identity. Markdown owns operational state and writes it back for the map to read. |
| Vault is a git repo | Obsidian is an optional viewer, not a dependency. |
| Read-only server | Routes may report state. Anything that acts waits for the next increment. |
| Four co-opted parts | Knowledge Visualizer, brain observatory, skills catalogue, Usage. |
| Galaxy mapping | A galaxy is a tier, a constellation is a cluster, a star is a tool. |
| Runs on Linux | Workstation migration is expected in early December 2026. |

These nine points were settled at charting and are not tickets.[](source:map)

## What have the four closed tickets decided? {#decisions}

| Ticket | Decision | Consequence |
| --- | --- | --- |
| 01 Round trip | Use unified with custom handlers in both directions. | Idempotent means a fixed point after one normalising pass. Edits are spliced into the source. |
| 02 Promotion conventions | Carry over the dev_graph lifecycle: evidence-gated, immutable ids, closed linted ontology. | Neither template records who promoted what and when. The vault must add that. |
| 03 Extraction audit | Cut `getDb()` and the monolithic `globals.css`. | About 20k lines to copy against about 70k. No SQLite. No Linux or Node 22 blockers. |
| 04 Status ladder | Three axes: partner-set status, active for standing tools, health computed live. | Only a partner moves a tool, by commit. An agent may propose a move. |

@facts
| Rejected in 01 | agent-html-kit (one-way demo), byte-identical round trips, turndown |
| Rejected in 04 | An "evaluated" or "in progress" rung; storing health in the vault |
| Own lines per part, from 03 | Visualizer 4.0k, brain radial 1.9k, skills 1.3k, Usage 1.7k |
| Shared kit, from 03 | G component kit: 56 files, 7.2k lines |

Sources: tickets 01[](source:t01), 02[](source:t02), 03[](source:t03) and 04[](source:t04).

## How does a tool's state become what Jarvis shows? {#tool-state}

@workflow id=jarvis-state title="From the three axes to a Jarvis display state"
| role external | Input |
| role backend | Question |
| role frontend | Jarvis shows |
| tool | Tool in matrix | external |
| impl | Implemented? | backend |
| check | Health check passes? | backend |
| run | Standing and running? | backend |
| none | No state | frontend |
| att | Attention | frontend |
| act | Active | frontend |
| idle | Idle | frontend |
| tool > impl | |
| impl > none | no |
| impl > check | yes |
| check > att | no | security |
| check > run | yes |
| run > act | yes | emphasis |
| run > idle | no |

| Axis | Values | Who sets it, and where |
| --- | --- | --- |
| Status | catalogued → implemented → retired | A partner, by commit to the tool note |
| Active | yes or no, standing tools only | A probe, or a partner's declaration in the note |
| Health | pass, fail, not checked | The check, live; stored nowhere |

- **Implemented** needs four things: findable, available, invokable and usable.
- A health check re-runs the first three. A check that cannot run shows attention with the reason "not checked".
- Catalogued and retired tools show no state. A retired tool may return to implemented, never to catalogued.
- A cluster or tier has no status. It shows counts, and attention when any of its tools does.
- A standing tool not seen active for 30 days is flagged for a partner. Nothing is demoted automatically.

## Which tickets are open, and in what order? {#tickets}

@workflow id=ticket-map title="Ticket dependencies"
| role backend | Resolved |
| role external | Open |
| role cloud | Destination |
| t01 | 01 Round trip | backend |
| t02 | 02 Promotion conventions | backend |
| t03 | 03 Extraction audit | backend |
| t04 | 04 Status ladder | backend |
| t05 | 05 Vault note schema | external |
| t06 | 06 State write-back | external |
| t07 | 07 Visualizer data model | external |
| t08 | 08 Jarvis static layout | external |
| spec | Increment spec | cloud |
| t02 > t04 | |
| t01 > t05 | |
| t04 > t05 | | emphasis |
| t05 > t06 | |
| t05 > t07 | |
| t03 > t07 | |
| t03 > t08 | |
| t04 > t08 | |
| t07 > t08 | |
| t06 > spec | | dashed |
| t08 > spec | | dashed |

@steps id=ticket-steps
| o05 | 05 Vault note schema | The only open ticket with no open blocker. Settles note kinds, folders, the identity key, frontmatter, and how generated sections are fenced from hand-written ones. | ticket-map | t05 |
| o06 | 06 State write-back | Settles how vault state reaches the matrix and how matrix changes reach the vault, without either overwriting the other. | ticket-map | t06 |
| o07 | 07 Visualizer data model | Settles entity kinds, which edge kinds count as cross-references, which sections stay, and what the graph metrics tell a partner. | ticket-map | t07 |
| o08 | 08 Jarvis static layout | A static prototype with mock data: panel positions and the path from a star to its note and its place in the framework map. | ticket-map | t08 |

@callout level=note title="The dashed arrows are a reading, not a recorded dependency"
The map names the spec as the destination. It lists spec assembly as not yet specified, including which repo the spec lands in.

## What is still unspecified, and what is out of scope? {#edges}

| Not yet specified | What is missing |
| --- | --- |
| Health checks | Which check and probe each kind of evidence gets, and the route that runs them |
| Active agents and partner access | Waits until agents run through the OS and partner access has an auth story |
| Event log | What emits the events the Jarvis prototype shows, given that nothing acts |
| Sparklines and pulse line | Waits for agent run data |
| Status in the 3D framework map | An additive lens, revisited after the write-back is settled |
| Tool discovery for the spec | Which catalogued tools help build the Markdown Engine |
| Spec assembly | Layout of the final spec and its repo |

@list id=out-of-scope
| FounderOS business domains: clients, comms, finance, social, analytics, drift, spend |
| Cron, Gates and anything else that acts or writes on its own |
| Advanced pillar features: thresholds, trigger signals, benchmarking, cost reports |
| Graph-governed version control, containerisation and multiple experiment sandboxes |
| Loop Engineering and agentic workflow integration |
| The Markdown Engine governing downstream projects and superseding Hermes OS |
| Linux workstation setup |

The list is what the map places out of scope for this increment.[](source:map)
