# 04: Tool status ladder

Type: grilling
Status: resolved
Blocked by: 02
Map: [Agentic OS observability increment](../map.md)

## Question

What are the ontological statuses a tool can hold, what promotes or demotes it between them, and what do "implemented" and "active" mean exactly?

The brief asks to promote operational tools to "implemented", show whether they are active, and include them in health checks, with every tool's status and identity specified for traceability. Settle the ladder (for example catalogued → evaluated → implemented → active, plus retired), who or what may move a tool along it, the evidence each step needs, and how "active" differs from "healthy".

## Answer

Settled by grilling on 2026-11-25. Tool state is three separate axes, not one ladder.

| Axis | Values | Stored where | Who sets it |
|---|---|---|---|
| Status | catalogued → implemented → retired | tool note | a partner, by commit |
| Active | yes / no, standing tools only | probe, or declared in the note where no probe is possible | observed, else a partner |
| Health | pass / fail / not checked | nowhere; computed live by a read-only route | the check |

### Status

- Every tool in the matrix starts as **catalogued**, with no work needed.
- **Implemented** means the tool is findable, available, invokable and usable. All four are needed to promote.
  - *Findable*: the note's evidence pointer resolves (path, config entry, URL).
  - *Available*: the thing is present or reachable there.
  - *Invokable*: it answers a call with no side effects (version, help, ping).
  - *Usable*: a partner attests it did real work once; recorded, not re-checked.
- For a kind that cannot be installed (a standard, a concept, a model reached by API), the evidence is the config or code that conforms to it or calls it.
- **Retired** means the tool was implemented and has been taken out. Retiring needs a written reason and, where one exists, the tool that replaces it. The note and its history stay in the vault for good.
- A retired tool may return to implemented. An implemented tool never returns to catalogued.
- There is no "evaluated" or "in progress" rung. `decision_class` stays in the matrix and means intent; status lives in the vault and means fact.
- A tool holds one status, for the one Agentic OS deployment. After the Linux migration every implemented tool keeps its status and its evidence is re-verified; a failure shows as attention and does not demote.

### Active

- Active is a narrower, weaker category inside implemented: a tool with a lasting presence that can be watched over time, such as a service or a provider.
- Each tool is a **standing tool** (runs continuously) or a **triggered tool** (runs only when called, such as a skill, a command or a library). The value is derived from the kind family, with a per-tool override in the note. The kind-to-presence table belongs to ticket 05.
- Only a standing tool can be active. For a triggered tool the question does not apply.
- Active is read by a read-only probe (process, port, endpoint, heartbeat file) wherever one exists. Where none is possible a partner declares it, and the note says which of the two it is.
- A standing tool not seen active for 30 days is flagged for a partner to keep or retire. The period is one setting for all standing tools, counted from the tool's first probe. Nothing is demoted automatically.
- The word is defined broadly enough to cover agent sessions and partner access later. In this increment it applies to tools only.

### Health

- A health check re-runs findable, available and invokable. Promotion and health are the same tests at two moments.
- A reading is computed live each time Jarvis asks and is not written to the vault. The vault holds only what the check needs: the evidence pointer and the probe.
- A check that cannot run or gives no answer shows attention with the reason "not checked", never idle or active.

### What Jarvis shows

- `attention`: implemented and failing a check or not checked. Any tool can show it.
- `active`: standing, healthy and seen running.
- `idle`: implemented and healthy, but not running or not standing.
- Catalogued and retired tools show no state.
- A cluster and a tier have no status of their own. They show counts (catalogued, implemented, retired, and how many of the implemented are in attention) and show attention when any tool in them does.

### Moves and lint

- Only a partner promotes or retires a tool, by a commit to the vault. An agent may propose a move, not make it.
- Each move records who, when, from, to and the evidence: the last move in the note's frontmatter, and every move as one line in an append-only log. Field names belong to ticket 05.
- Lint reports as findings: a tool that is implemented while its decision class is "Out of scope", "Unverified", "Reference / concept" or "Delay / guarded". A partner resolves each by changing one side.
- Lint reports as a to-do count, not an error: a "Core v1" tool that is still catalogued.
