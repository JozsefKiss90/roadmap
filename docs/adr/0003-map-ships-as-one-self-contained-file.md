---
status: accepted
---

# The map ships as one self-contained HTML file

The two partners open the map by double-clicking a file on a mid-tier laptop, with no install, no local server and no network. A browser will not load separate scripts or JSON from `file://`, so the build (Vite with `vite-plugin-singlefile`) inlines code, graph data and fonts into a single `framework-map.html`.

## Considered Options

- **Host it at a URL.** Rejected for the first version: it needs somewhere private to host and a network connection to read.
- **A folder of files served by a small local server.** Rejected: the partners would have to run something.

## Consequences

- The map never fetches anything at run time. The graph data is fixed when the file is built, so a change to the tool matrix needs a rebuild and a new file sent to the partners.
- A shared link (the URL fragment) only reopens the same state when both people hold the same build of the file.
- The built file has a size budget of 5 MB.
