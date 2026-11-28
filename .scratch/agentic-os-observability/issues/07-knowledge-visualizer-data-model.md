# 07: Knowledge Visualizer data model

Type: grilling
Status: resolved
Blocked by: 03, 05
Map: [Agentic OS observability increment](../map.md)

## Question

How do galaxies, constellations and stars, and the cross-references between them, fit FounderOS's Knowledge Visualizer data model, and what has to change in it?

FounderOS's model is `KIEntity {id, kind, label, cluster, …}` and `KIEdge {a, b, kind: link|owns|mention|similar, evidence, weight}`. Settle: the entity kinds (tier, cluster, tool, need, role, note?), the edge kinds that count as cross-references (need served, overlap group, role use, wikilink, cluster-to-cluster relation), how relations between clusters are derived, which of the Network, Matrix, Timeline, Ranking and Findings sections stay, and what the graph metrics (PageRank, betweenness, articulation points) should tell a partner about the tool stack.

## Answer

Settled by grilling on 2026-11-25. Facts were read from FounderOS at commit e26392c and from the tool matrix as it stood that day.

### Ground rule

Nothing in the design may depend on a person typing markdown.

- The Knowledge Visualizer is complete with no free notes and no links outside the generated block. Everything it needs comes from the matrix snapshot and from frontmatter that commands write.
- No stack finding, lint result or to-do asks a person to write a note or a link.
- Free notes and `link` cross-references are a bonus the graph can carry, never a prerequisite.

### Nodes

- Five kinds: tier, cluster, tool, need and note. FounderOS's eight kinds are all replaced. Five is also the number of fixed slots in the copied colour palette.
- The id is the bare matrix id, or the filename for a free note. The `kind:` prefix of FounderOS is dropped, because the vault lint of ticket 05 already keeps ids unique.
- A role, a value stream and a phase are not nodes. They are fields used as filters. Architect is in `Used by` on 736 of 805 tools, so a role node would only be a hub.
- Every tool is a node whatever its status. Showing or dimming by status is a view choice for ticket 08.
- Every free note under `notes/` is a `note` node with no tier and no cluster.

| Field | On | Holds |
|---|---|---|
| `id`, `kind`, `label` | all | the id, one of the five kinds, the name |
| `tier`, `cluster` | all but notes | placement; a tier node has neither, a cluster node has `tier` only |
| `summary` | all | the capability sentence, the tier description, the need label or a note's title |
| `status`, `presence`, `best_fit`, `decision_class`, `roles` | tool | from the tool note and the snapshot |
| `stream`, `roles` | cluster | filters |
| `phase` | need | filter |
| `days` | tool | days since the last move; empty when catalogued |
| `note` | all | the vault path, so Jarvis can open the note |

- Dropped from `KIEntity`: `words`, `source`, `aliases`, `href`. `terms` survives only as the evidence on a `similar` edge.
- The node and edge shapes are one zod schema beside the note schemas, add-only like them.
- The graph carries stored facts only. Health and active readings are live and are not in it.

### Membership

- Belonging to a cluster or a tier is a field on the node, never an edge. It drives the grouping and stays out of the metrics. As an edge it would make every cluster an articulation point by construction; the framework graph has 870 such edges against about 480 cross-references.
- A need sits in its home cluster and takes that cluster and its tier as its own fields. A tool that serves a need homed elsewhere then draws a line between constellations (102 of the 322 serves links do).
- The model gains a second level: FounderOS's single flat `cluster` string becomes `tier` and `cluster`.

### Cross-references

Six kinds. FounderOS's `owns` and `mention` are removed: `owns` was membership, and `mention` matches names in prose, which would misfire on 805 tool names.

| Kind | From → to | Source | Count on 2026-11-25 |
|---|---|---|---|
| `serves` | tool → need | `Needs` column; carries best fit | 322 |
| `overlaps` | tool ↔ tool | overlap group; carries the group name | 70 |
| `implements` | tool → cluster | `Implements cluster` column | 54 |
| `home` | need → cluster | the need's home cluster | 33 |
| `replaces` | tool → tool | `replaced_by` on the tool note | 0 |
| `link` | note → note | a wikilink outside the generated block, whoever wrote it | 0 |

- Typed edges are read from the snapshot. Wikilinks inside the generated block are ignored by the graph builder, so no relation is counted twice.
- Each edge has an evidence string naming the matrix column or the note it came from.
- Direction is stored. Metrics and drawing treat every edge as undirected, as FounderOS does. Weights only sort lists.
- `similar` is kept as a seventh kind that is not a cross-reference. It is computed from each tool's `Capability` sentence, is off in the drawing by default, enters no metric and no cluster relation, and feeds one stack finding. Thresholds start at FounderOS's values and are tuned on the first real run. If that run is mostly noise, the kind is cut before the spec.

### Relations between clusters

- The matrix states none, and no cluster-to-cluster edge kind is added.
- The relation between two clusters is the set of cross-references with one end in each, counted per kind, computed on request and never stored. The per-kind counts are the evidence shown on a ribbon or a matrix cell.
- The relation between two tiers is the same sum one level up.

### Metrics

They run on the whole catalogue whatever a tool's status, over the six cross-reference kinds, undirected and unweighted. They describe the shape of the catalogue and do not change when a tool is promoted.

| Metric | What it tells a partner |
|---|---|
| PageRank, shown as "authority" | How much of the catalogue points at a need or cluster. It sets a star's size and how near the centre it sits, so the tools with no cross-reference form the rim. |
| Betweenness | A tool or need that ties constellations together. |
| Articulation point | The only tie between two parts of the stack. |

On a graph this sparse (about 480 edges over about 900 nodes) PageRank mostly restates degree. It is kept because the layout is built on it. The spec should say so.

### Stack findings

FounderOS's six rules are replaced by five, one finding per rule with its targets listed. Each is fixed in the matrix or by a promote or retire.

| Stack finding | Rule | Severity |
|---|---|---|
| Uncovered need | no implemented tool serves it | high |
| Single-tool need | exactly one implemented tool serves it | medium |
| Running duplicates | two or more implemented tools in one overlap group | medium |
| Bridge | an articulation point, top 12 by betweenness | low |
| Possible overlap | a `similar` pair above the threshold that shares no overlap group | low |

- A tool with no cross-reference is unlinked, which is not a stack finding. The count of unlinked tools shows in the summary strip. About 500 tools start that way.
- On day one every need is uncovered, so the first finding lists all 33.
- A stack finding is not a lint finding: lint reports that the vault and the matrix disagree, a stack finding reports what the tools lack or double up on.

### Sections

All five stay, with the summary strip. Drift stays behind. Only the G tree is shown; the classic tree is copied only as far as the G tree imports from it.

- **Network**: a nested radial overview, one wedge per tier divided into arcs for its clusters, with free notes in a ninth wedge. Ribbons run between constellations. A focused node gets the two-hop view.
- **Matrix**: cluster by cluster, inline for the 12 most connected and all 57 in full screen.
- **Timeline**: moves per month, stacked by tier, read from the move log. File modification times and the `Last commit` column are not used. It starts empty.
- **Ranking**: name, kind, tier, cluster, status, degree, authority, betweenness, days since last move.
- **Findings**: the five rules, under the title "Stack findings".

A cluster is drawn as a mark inside its arc. A tier is a node in the data, so it can be focused, ranked and opened as a note, and is drawn only as its wedge and label.

Colour dimensions are kind, status, authority and stack findings. Recency is dropped. A fifth, the live state (attention, active, idle), joins when the health-check ticket lands; the client joins it in from its own route.

### What changes in the copied code

- The index builder is rewritten against the one read module of ticket 06. It reads no database and no file times.
- `tier` is added to the node and the radial layout nests two levels.
- One registry holds every node and edge kind: label, colour slot, hint, draw order and whether it enters the metrics. Every view reads from it. FounderOS spreads each kind over 10 to 12 places.
- The findings rules, the timeline source and the similarity input are replaced as above.
- One read-only route returns nodes, edges, metrics and stack findings, built in memory on request. Nothing is written or committed.
- The graph is cached on the snapshot's matrix hash plus the vault's file count and newest modification time.

### Left to later tickets

- Ticket 08: how status is shown or dimmed, and how a partner moves from a star to its note and to the framework map.
- Health checks: the live-state colour dimension.
