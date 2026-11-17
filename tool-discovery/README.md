# tool-discovery

The data behind the map. The tool matrix CSV is the source of truth. The graph JSON is generated from it.

## Regenerate the graph

Run this from the repository root. It needs Python 3 and nothing else.

```
python tool-discovery/generate_graph.py
```

Then check the result with `npm run validate` in `framework-map/`. From that folder, `npm run generate` runs both steps.

The generator stops without writing anything if it cannot translate a cell. It names each problem and its CSV row.

## Which files are edited by hand

| File | Edited by | Holds |
| --- | --- | --- |
| `tool-matrix.csv` | Hand | One row per tool |
| `clusters.json` | Hand | The tiers, and each cluster's tier, attributes and order on its plate |
| `needs.json` | Hand | The needs: domain, phase, verdict, lead role, home cluster, approach and gap |
| `overlaps.json` | Hand | Groups of tools that do the same job, by tool ID |
| `vocabulary.json` | Hand | The allowed kind, decision class, hosting, value stream and gate values |
| `tool-framework.graph.json` | Generator | The graph the map reads. Never edit it. |
| `evidence/` | Repository check | What was read from GitHub, kept as a record |

`Hermes OS tool matrix.xlsx` at the repository root is an export of the CSV. Edits made there are lost.

## What the generator takes from where

- **Tools** come from the CSV, in row order. `Needs` and `Implements cluster` are comma-separated lists of IDs.
- **A cluster's order** on its plate is its position in `clusters.json` among the clusters of its tier.
- **A cluster's tool count** is counted from the CSV.
- **A need's phases** are read from its phase string, such as "P2", "P2-P3" or "P1, P3".
- **Every pair** of tools in an overlap group is linked.
- **The generation date** is today's. Pass `--date YYYY-MM-DD` to set it.
- **The title, the note and the axes** are fixed text in `generate_graph.py`, as are the role and value stream codes.

## Tests

```
python -m unittest discover tool-discovery
```

`npm test` in `framework-map/` runs them too. One test fails if the committed graph is not what the generator produces from the committed inputs.
