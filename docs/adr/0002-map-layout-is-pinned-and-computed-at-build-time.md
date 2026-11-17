---
status: accepted
---

# The map layout is pinned and computed at build time

The map is drawn with 3d-force-graph, a force-simulation library, but no simulation runs. One pure function turns the graph into a position for every plate, cell and mark when the map is built, and every node is pinned there. We chose this so a tool is always in the same place (links and screenshots are reproducible), so the map does not look like a graph demo, and so 752 marks stay cheap to draw.

## Considered Options

- **Live simulation with tiers pinned to heights.** This is what the framework document suggests. Rejected: positions differ between runs, and the settled result reads as a generic node-link graph.

## Consequences

- Each tier is a rectangular plate and each cluster a rectangular cell sized by its tool count. The `sector` value in the graph data is used only as the cluster's order.
- Positions are not stored in `tool-framework.graph.json`; the data stays free of map coordinates.
- Nothing ever moves a mark. Lenses, filters and focus change colour and opacity only.
