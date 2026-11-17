# 03: Vocabulary file and graph validator

**What to build:** The build fails with a clear message whenever the graph JSON is inconsistent, so a broken map never reaches the partners. A vocabulary file declares the allowed values for kind, decision class, hosting, value stream and gate, and today's data is reconciled against it.

The data currently holds at least 14 kind values and at least 14 gate values, against 11 and 5 in the framework document; hosting also holds `n/a` for 8 tools. Nothing is patched silently: each mismatch is either added to the vocabulary or fixed in the data, and the choice is listed for the Architect.

This ticket also proposes the display groupings the map will use: about eight kind families and five gate families (none, admission review, licence check, guarded, operator approval).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A vocabulary file lists the allowed values for kind, decision class, hosting, value stream and gate
- [ ] The validator rejects a graph with an edge pointing to a missing node, or with a duplicate id
- [ ] The validator rejects a tool with no cluster, or whose tier disagrees with its cluster's tier
- [ ] The validator rejects any kind, decision class, hosting, value stream or gate value that is not in the vocabulary file
- [ ] The validator rejects a need with no serving tool, or a phase string that does not parse into phases P0 to P4
- [ ] The validator rejects metadata counts that disagree with the actual nodes and edges
- [ ] Each rejection names the fault and the offending id
- [ ] Each of the five fault types has a test using a small graph that contains only that fault
- [ ] The current graph JSON passes the validator
- [ ] A table of every raw kind and gate value, the family it is grouped into, and any value changed in the data is written under Comments, and the Architect has signed it off
- [ ] The work is committed

## Comments
