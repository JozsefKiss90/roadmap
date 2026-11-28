# 06: Writing operational state back to the inventory

Type: grilling
Status: resolved
Blocked by: 05
Map: [Agentic OS observability increment](../map.md)

## Question

How does operational state owned by the vault reach the tool matrix, and how does a change to the tool matrix reach the vault, without either side overwriting what the other owns?

Settle: whether state lands in a new column of `Agentic OS tool matrix.xlsx` and `tool-matrix.csv` or in a sidecar file next to them; which direction runs when, and on what trigger; what happens when a tool is added, renamed, moved between clusters or removed in the matrix while its note holds state; and how a mismatch is reported.

## Answer

Settled by grilling on 2026-11-25.

### Form

- State reaches the roadmap repo as one generated file, `tool-discovery/tool-state.json`: the tool state file. It is listed in the `tool-discovery` README as generator-owned and is never edited by hand.
- `tool-matrix.csv` gets no new column and stays hand-only. `Agentic OS tool matrix.xlsx` gets nothing new.
- In this increment the roadmap repo uses the file for validation only. The map does not read it. A later status lens on the map reads the same file.

### The tool state file

- One entry per tool that is not catalogued, keyed by id, in id order. A catalogued tool is implied by its absence.
- Each entry holds `status`, `moved_on`, the effective presence (standing or triggered, after the override) and `replaced_by` where set.
- The file also holds a `version` number, the vault commit hash and the matrix commit hash it was built against. It holds nothing time-based, so a second run changes no byte.
- Left out: health and active readings (live, never stored), partner handles, `evidence`, `invoke` and `probe`.
- The shape is add-only, like the note schema.

### Matrix to vault

- The Agentic OS repo holds a matrix snapshot: a committed copy of the five matrix inputs (`tool-matrix.csv`, `clusters.json`, `needs.json`, `overlaps.json`, `vocabulary.json`) in a `matrix/` folder, with the roadmap commit hash it was taken from. That hash is the one `index.md` records.
- `sync-matrix --from <roadmap checkout>` takes the snapshot. It refuses a roadmap checkout with uncommitted changes.
- The generator and lint read only the snapshot, so continuous integration needs no second repo.

### Vault to matrix

- `export-state --out <path>` writes the tool state file. A partner points it at the roadmap checkout and commits the file there.
- It runs lint first and writes nothing on an error. Findings and to-do counts do not block it.
- It refuses uncommitted changes under `vault/`, so the vault hash it records is true.

### Commands and triggers

- `sync-matrix`, `generate`, `export-state` and `prune` all live in the Agentic OS repo, beside the schemas.
- A partner runs each by hand and commits the result in the receiving repo. There are no hooks, watchers or scheduled runs.
- Staleness is caught by lint, not prevented.
- The roadmap repo gains one thing: a validation rule in `generate_graph.py`.

### A change in the matrix

| Change | What happens in the vault |
|---|---|
| Tool added | The generator creates its note with `status: catalogued` (ticket 05). |
| Tool renamed | `name` and `aliases` change. `aliases` holds the current name only. |
| Tool moved between clusters | The tool note and the two cluster notes change, all generated (ticket 05). |
| Tool removed, note catalogued and empty | The note is kept and reported until a partner prunes it. |
| Tool removed, note holds state | Not allowed. See the two guards below. |
| `ID` cell changed | One removal and one addition. There is no re-key command. |
| Cluster, tier or need removed or re-keyed | Its note is pruned if it holds nothing, and reported otherwise. |

- A note holds state when its status is not catalogued, or it has any partner key besides `status`, or its body outside the fence is not empty.
- A tool whose note holds state is never removed from the matrix. It is retired in the vault and its row stays for good.
- Two rows found to be the same tool: retire one with `replaced_by` if it was implemented, or remove its row if it was catalogued.
- A retired tool's row changes nothing in the matrix or on the map. No "retired" column or decision class is added. A partner may change the row's decision class, and the lint of ticket 04 reports the conflict if they do not.
- A hand-written link that shows an old name (`[[7A|Old cluster name]]`) still resolves and is not a finding. The generator rewrites only the links inside its own block.

### The two guards

- **Roadmap repo**: `generate_graph.py` refuses a matrix that lacks an id the tool state file lists. It reads only `id` and `status` and ignores keys it does not know. A missing file means no tool holds state. A `version` it cannot read stops it with a clear message. The graph JSON does not depend on the file, so the drift test is untouched.
- **Agentic OS repo**: `sync-matrix` refuses an incoming matrix that lacks the id of any tool note that holds state. It names each one and copies nothing. This guard holds even when the tool state file is stale.
- Either way the fix is on the matrix side: restore the row.

### Prune

- `prune <id>` deletes a note only when all of these hold: the id is absent from the snapshot, `status` is catalogued, there is no other partner key, the body outside the fence is empty and no other note links to it. Otherwise it refuses and says which condition failed.
- For a cluster, tier or need note the conditions are an absent id, an empty body and no incoming links.
- It writes no line to the move log, because a catalogued tool never moved.
- `prune` with no id lists every note that qualifies.
- A partner who wants to keep text from a note moves it to a free note under `notes/` first.
- The generator still never deletes a note.

### Reporting a mismatch

Everything comes from the one `lint` command of ticket 05, in three grades.

| Grade | Exit | Examples |
|---|---|---|
| Error | non-zero | A matrix row with no note; a note that fails the schema; a refused sync or export |
| Finding | zero | A note awaiting prune; an edit to a generated key; the decision-class conflicts of ticket 04 |
| To-do count | zero | "Core v1" tools still catalogued |

- Lint prints the matrix hash of the snapshot.
- Given `--roadmap <path>`, lint compares the snapshot and the tool state file against that checkout. It reports "snapshot is N commits behind" or "tool state file was built from an older vault" as findings. Without the flag it says nothing about staleness.
- Jarvis shows the snapshot's matrix hash and nothing else about sync.

### Database

- A database was considered in place of the CSV, the spreadsheet and the JSON files. The matrix and the vault stay text in git: review by diff, moves by commit, the merge-base check on the move log and the Obsidian view all need that.
- A database is a derived index only: built from the text files, never committed, never edited by hand and safe to delete.
- It is SQLite, not Neo4j. SQLite is one file with no server, and Python's standard library reads it. Neo4j is a server that must be kept running.
- The index is planned for the next increment, as the first use of storage. This increment parses the notes in memory.
- One rule holds now so the index stays possible: every read of the matrix snapshot or the vault goes through one module in the Markdown Engine.

### Left to later tickets

- Status in the 3D framework map: a lens that reads the tool state file.
- The SQLite index: its tables, when it is rebuilt and which routes read it.
