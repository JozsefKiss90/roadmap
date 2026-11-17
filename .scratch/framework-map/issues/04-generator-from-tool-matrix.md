# 04: Generator from the tool matrix CSV

**What to build:** The Architect edits the tool matrix CSV, runs one command, and gets a validated graph JSON. The CSV becomes the edited source of truth; the xlsx is treated as an export.

The generator is a Python script with no new dependencies. Its inputs are the tool matrix CSV and two small files extracted once from today's JSON: one for clusters (tier, attributes, order on the plate) and one for needs (domain, phase, verdict, lead role, home cluster, approach, gap). Its output has the same shape as today's graph JSON, without any map coordinates (ADR 0002).

No script that produced the current JSON is in the repository. Ask the Architect once whether it still exists; if it does not, write the generator from the current files.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The clusters file and the needs file exist, extracted from the current graph JSON
- [ ] One command reads the CSV and the two files and writes the graph JSON
- [ ] Run on today's inputs, the output has the same nodes and edges as today's graph JSON; any difference is listed under Comments and explained
- [ ] The output passes the validator from ticket 03
- [ ] The metadata carries the generation date and correct counts
- [ ] Changing one tool's decision class in the CSV and rerunning changes that tool in the output and nothing else
- [ ] A short note beside the script says which files are edited by hand and which are generated
- [ ] The work is committed

## Comments
