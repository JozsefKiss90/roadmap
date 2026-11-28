# 05: Vault note schema and layout

Type: grilling
Status: resolved
Blocked by: 01, 04
Map: [Agentic OS observability increment](../map.md)

## Question

What notes does the vault hold, how are they laid out, and which parts of each note are generated from the tool matrix and which are owned by hand?

Settle: the note kinds (tool, cluster, tier, need, role?), folder layout, file naming and the identity key that ties a note to its tool matrix row, the frontmatter fields, how generated sections are fenced so regeneration never overwrites hand-written ones (FounderOS's `brain-docs.ts` uses a `generated:` marker), and which markdown features the round trip from ticket 01 lets a note use.

## Answer

Settled by grilling on 2026-11-25, and tightened by a second grilling the same day.

### Notes and layout

- Four note types: tool (805), cluster (57), tier (8) and need (33). A role gets no note; it is a frontmatter value on the tool note.
- The vault is the `vault/` folder at the root of the Agentic OS repo, opened in Obsidian as the vault. Moves are found by `git log -- vault/`. It can be split into its own repo later.
- Folders are flat by note type. Tier and cluster are frontmatter and wikilinks, never folders, so a reclassification moves no file. It changes the tool's own note and the member lists of the two cluster notes, all of it generated.

```
vault/
  index.md      generated; lists the tiers
  log.md        the move log
  tools/        <id>.md, one per tool
  clusters/     7A.md …
  tiers/        T7.md …
  needs/        N01.md …
  notes/        free notes
  .obsidian/
```

- The identity key is the matrix id, reused as it stands: `ID` for a tool, `Cluster ID` for a cluster, `T0`–`T7`, `N01`–`N33`. No new ids are minted. The id is immutable: renaming a tool changes `name`, never `ID`. The file is `<id>.md`. `ib_async` keeps its underscore.
- Every tool has a note from the first generator run, with `status: catalogued`. A matrix row without a note is always an error.

### Ownership

- One file per thing. Every frontmatter key has one owner, the generator or a partner. The body has one generated block, between `<!-- generated:start -->` and `<!-- generated:end -->`; everything outside it is the partner's.
- The generator splices only its keys and its block (the splice rule of ticket 01) and leaves every other byte alone.
- The matrix wins for its own keys. An edit to a generated key or inside the fence is reported as a finding naming the note and the key, and the next generator run restores the matrix value.
- A fence comment that is missing, duplicated or out of order: the generator writes nothing to that note, reports it and carries on with the rest.

### Tool note frontmatter

Generator-owned, in this order. Values are plain ids, not wikilinks. Nothing volatile (stars, last commit, verification date) and nothing descriptive is copied.

| Key | Holds |
|---|---|
| `type` | `tool` |
| `id` | the matrix `ID` |
| `name` | the tool's name |
| `aliases` | a list holding the name, so Obsidian finds the note by it |
| `kind` | the kind as the matrix has it |
| `tier` | `T0`–`T7` |
| `cluster` | the cluster id |
| `needs` | list of need ids |
| `used_by` | list of roles |
| `decision_class` | the decision class, for the lint of ticket 04 |

Partner-owned, in this order. Every key except `status` is absent until it applies; lint enforces the last column. The generator writes `status: catalogued` once, when it creates a note, and never touches the key again.

| Key | Holds | Required when |
|---|---|---|
| `status` | catalogued, implemented or retired | always |
| `evidence` | the pointer that makes the tool findable, as one prefixed string: `path:…`, `config:…` or `url:…` | implemented |
| `invoke` | the call with no side effects (version, help, ping), as a list of arguments | implemented |
| `usable_by`, `usable_on` | the handle of the partner who attested real use, and the date | implemented |
| `presence` | standing or triggered, as an override of the derived value | never |
| `probe` | what to watch, as one prefixed string: `process:…`, `port:…`, `http:…` or `file:…` | see below |
| `active_declared` | yes or no | see below |
| `moved_by`, `moved_on`, `moved_from` | the last move; "to" is `status` itself; `moved_by` is a partner handle | not catalogued |
| `retired_reason`, `replaced_by` | why, and the id of the replacing tool | retired (`replaced_by` optional) |

- `evidence` and `probe` hold one value each, and the schema checks the prefix. A tool with two pointers records the one a check can verify; the rest goes in the body.
- `invoke` is run without a shell. Its first argument must resolve to the tool's own `evidence` path or to a name on an allow-list. The allow-list and the rest of the execution policy belong to the health-check ticket.
- An implemented standing tool has exactly one of `probe` and `active_declared`. A catalogued or retired tool needs neither. Either key on a triggered tool is a finding.
- `replaced_by` holds the id of an existing tool other than the note's own. The replacement may have any status.
- A partner handle comes from the partner list (see Schema and settings).

Normal form: generator keys first, then partner keys, each in the order above; lists in the style Obsidian's Properties editor writes; dates as `YYYY-MM-DD`. The normalising pass of ticket 01 applies it, and lint reports a note that is not in it. An edit made in Obsidian is then already normal apart from key order.

To confirm before the schema is written: that Obsidian writes lists in block style (one `- item` per line). This is believed, not tested. If it holds, `needs` reads as a block list, not `[N09, N14]`.

### Note bodies

- Tool note: the generated block comes first and holds an H1 with the name, the capability sentence, wikilinks to the tier, the cluster, the needs and the fellow members of its overlap group, and the repository link. The body below the fence is free: no required headings, and an empty one is valid.
- Cluster, tier and need notes: generated frontmatter (`type`, `id`, `name`, `aliases` and the parent: `tier` on a cluster, `home_cluster` and `phase` on a need), a generated block listing the members as wikilinks (a tier's clusters, a cluster's tools, a need's tools with best fit marked) and a free body below. No partner-owned keys. Status counts are never written to a note; Jarvis computes them.
- Free notes live only under `notes/`, with `type: note` and a `title`. They follow the same feature list and link lint, and the generator never touches them.
- A wikilink is a bare id with a display alias: `[[7A|Autonomous research and experiment loops]]`. No id collides across note types today. Lint fails on an id that exists twice in the vault and on a link that resolves to nothing. Ids are compared without regard to case, as Obsidian resolves them.
- Lint fails on a free note whose filename equals any id, `index` or `log`.
- An alias that equals a different note's id is a finding, fixed by renaming a tool in the matrix. There is one today: the tool named "Agent-Reach" has the id `agent-reach-2`, and another tool holds the id `agent-reach`.
- Inside a table the pipe of an alias is escaped: `[[7A\|Autonomous research and experiment loops]]`. That is the normal form there.
- A link to a heading (`[[7A#Notes]]`) is allowed, and lint resolves the note part only. A link to a block (`[[7A#^abc]]`) is not allowed in this increment, because Obsidian writes the block marker into the target note.

### Presence

Standing or triggered is derived from the kind family in `vocabulary.json`, with the per-tool `presence` override.

| Presence | Kind families |
|---|---|
| Standing | Platform or infrastructure, Model, MCP server |
| Triggered | App or CLI, Library or framework, Skill or command, Standard or reference, Plug-in, subagent or hook, Internal build, Feature or capability |

Three kinds are standing whatever their family: `App (self-hosted)`, `Agent runtime` and `Messaging gateway`.

### Move log

- `log.md` at the vault root, one line per move, newest last:
  `- 2026-11-25 · [[autoresearch]] · catalogued → implemented · <partner> · <evidence or reason>`
- The partner is named by handle. Where the commit is available, lint checks that its author maps to that handle.
- Lint checks that a note's `moved_*` keys match its last log line, and that no line present at the merge base with the main branch was changed or removed.
- `.gitattributes` gives `log.md` a union merge, so two branches that each add a move merge without conflict. The order is therefore merge order: dates may be out of order by a few lines, and lint accepts that.

### Markdown features

- Allowed: flat YAML frontmatter, headings, paragraphs, emphasis, lists, task lists, tables, code spans and fenced code, links, and wikilinks with an alias or a heading.
- Not allowed in this increment, reported by lint: embeds (`![[…]]`), block links, callouts, raw HTML other than the two fence comments, Dataview and other plugin blocks, footnotes, and hard line breaks.

### Schema and settings

- One zod schema per note type in the Markdown Engine is the single declaration. The generator, the lint and Jarvis all read notes through it.
- An unknown frontmatter key is a lint error. The schema is add-only: keys are added, never renamed or removed.
- The presence table sits beside the schemas as data, not in the vault.
- The partner list sits beside the schemas too: one data file that maps a short handle to the git author emails that count as that partner. Emails stay out of the notes.
- `.obsidian/` commits only the settings the schema depends on (wikilinks on, new links by shortest path, new notes created in `notes/`). Workspace and plugin state are ignored. No community plugin is needed to read the vault.

### Generator and lint

- The generator first runs the matrix validation. If it fails, the generator writes nothing.
- Its output is already in normal form, so the vault needs no normalising commit, and a second run changes no byte. Both are tested on every note.
- `index.md` records the matrix commit hash in its frontmatter and nothing time-based, so it changes only when the matrix does.
- The generator never deletes or edits a tool note whose id is missing from the matrix. Lint reports it.
- Check mode writes nothing and lists every note and key the generator would change. Lint is check mode plus the schema, link and log checks: one command for a partner and for continuous integration.
- Two local commands, `promote <id>` and `retire <id>`, write a move to the note and to `log.md` and leave the commit to the partner. Editing by hand stays valid.

### Left to later tickets

- Health checks: the allow-list for `invoke` and how each prefix of `evidence` and `probe` is checked.
