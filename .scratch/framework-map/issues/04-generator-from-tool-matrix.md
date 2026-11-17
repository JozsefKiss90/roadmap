# 04: Generator from the tool matrix CSV

**What to build:** The Architect edits the tool matrix CSV, runs one command, and gets a validated graph JSON. The CSV becomes the edited source of truth; the xlsx is treated as an export.

The generator is a Python script with no new dependencies. Its inputs are the tool matrix CSV and two small files extracted once from today's JSON: one for clusters (tier, attributes, order on the plate) and one for needs (domain, phase, verdict, lead role, home cluster, approach, gap). Its output has the same shape as today's graph JSON, without any map coordinates (ADR 0002).

No script that produced the current JSON is in the repository. Ask the Architect once whether it still exists; if it does not, write the generator from the current files.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The clusters file and the needs file exist, extracted from the current graph JSON
- [x] One command reads the CSV and the two files and writes the graph JSON
- [x] Run on today's inputs, the output has the same nodes and edges as today's graph JSON; any difference is listed under Comments and explained
- [x] The output passes the validator from ticket 03
- [x] The metadata carries the generation date and correct counts
- [x] Changing one tool's decision class in the CSV and rerunning changes that tool in the output and nothing else
- [x] A short note beside the script says which files are edited by hand and which are generated
- [x] The work is committed

## Comments

### 2026-11-17: built

The Architect was asked and the first script is gone, so the generator was written from the current files.

What exists:

- **The generator** is `tool-discovery/generate_graph.py`. It uses the standard library only.
- **The one command** is `python tool-discovery/generate_graph.py`. In `framework-map/`, `npm run generate` runs it and then the validator.
- **The clusters file** is `tool-discovery/clusters.json`. It also holds the eight tiers.
- **The needs file** is `tool-discovery/needs.json`.
- **The note** on hand-edited and generated files is `tool-discovery/README.md`.
- **The tests** are `tool-discovery/test_generate_graph.py`, run with `python -m unittest discover tool-discovery`.

#### Differences from today's graph JSON

There are none. Run on today's inputs with today's date, the output is the same as the old file byte for byte. It has 863 nodes and 1537 edges, in the same order, and it passes the validator.

#### One file more than the ticket names

The graph holds 70 `overlaps` edges in 8 groups, and the CSV records none of them. The Architect chose a third small file over a new CSV column. It is `tool-discovery/overlaps.json`, which lists each group's tool IDs. The generator links every pair in a group.

#### Choices made

1. **Map coordinates.** Today's graph already holds none. The `layout` values are a tier's number and a cluster's order on its plate, which ADR 0002 allows. They are kept, and so is each tool's `size`.
2. **Derived values are not stored.** These are computed on each run:
   - a cluster's order, from its position in the clusters file
   - a cluster's tool count, from the CSV
   - a tool's `size`, as 1 + log10(stars + 1), or 1 with no repository
   - a tool's `url`, from its repository
   - the `scheduled_in` edges, from each need's phase string
   - the `contains` edges, from each tool's `Cluster ID`
3. **The two agreements ticket 03 left unchecked now hold by construction**, because of the last two items above.
4. **The generator stops on what it cannot translate** and writes nothing. It lists every problem with its CSV row. The cases are:
   - an unknown role or value stream name
   - a `Cluster ID` that is not in the clusters file
   - a `Cluster` name that differs from the clusters file
   - a `Best fit` other than "Yes" or empty
   - a `Stars` cell that is not a whole number
   - a row with too few or too many cells
   - an ID that is repeated, or is not a lower-case slug
   - a need or cluster listed twice in one cell
   - an overlap member that is not a tool, or is listed twice
   - a cluster whose tier is not in the clusters file
   - an input file that is missing or broken
   - a phase string that does not parse
5. **Everything else is left to the validator**, such as an unknown kind or a need ID that does not exist.
6. **The title, the note and the axes are fixed text in the script.** The note and the Evidence axis both say the repository facts were read on 2026-11-17. That date must be changed in the script when the facts are read again.
7. **The generation date is today's**, so a rerun on a later day changes the `generated` line as well. `--date` sets it.
8. **A test compares the committed graph with the generator's output.** It fails if the CSV is edited and the graph is not regenerated.

#### Checks made

- **Decision class.** A test changes one tool's decision class in a copy of the CSV and reruns the command. That tool's `decision_class` is the only difference in the output.
- **Mutation.** Five faults were put into the generator one at a time, and the tests failed on each.

The tdd skill was called, and the Architect agreed two seams: the `build_graph` function and the command itself. The first two tests were written and seen to fail first. The generator was then written in one piece, and the other twelve tests followed it.

### 2026-11-17: after review

The code-review skill ran a standards review and a spec review of commit 55d8b2c. The spec review confirmed the output is byte-identical to the old graph. It repeated the decision-class check on a second tool, with the same result.

Fixed, each with a test written first:

- **A short or long CSV row** crashed the generator. It is now reported with its row.
- **Stars** accepted characters such as "²". Only plain digits pass now.
- **A missing or broken input file** gave a traceback. The generator now names the file and exits with 1.
- **Duplicate edges** could be made by a need listed twice in one cell, or a tool listed twice in an overlap group. Both are now reported.
- **Phase strings** are read as the validator reads them: "P2-P2" is refused, and repeated or unordered phases are scheduled once, in order.
- **An ID** with a space or a capital letter was accepted. It must now be a lower-case slug.
- **`--date`** accepted any text. It must now be a date.
- **A cluster in an unknown tier** is reported.

Also changed:

- `npm test` in `framework-map/` now runs the generator's tests too, so the stale-graph test runs with the rest.
- The spec's data contract now says three small files, not two.

Left as they are, for the Architect to weigh:

- **The axes text is copied from the old graph.** It uses words the glossary avoids, such as "sector", "plane" and "time slider", and describes the layout ADR 0002 rejected. Changing it would have broken the "same as today" check. The map does not read the axes.
- **"Overlap group" is not in the glossary.**
- **The 2026-11-17 evidence date** is still fixed text in the script (choice 6 above).
- **A tool's tier is not compared with its cluster's tier by the generator.** The validator reports it as `tier-mismatch`.
- **"CSV row N" counts records.** It would drift from the line number if a cell held a line break. No cell does today.
- **The status stays `ready-for-agent`**, as on tickets 01 to 03. The five labels have no value for "done".
