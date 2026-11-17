# 09: Outline, search and keyboard

**What to build:** A partner can reach every tool without the mouse. The left rail holds an outline of tiers, clusters and tools that stays in step with the selection, and a search box finds any tool, cluster or need by a remembered word and flies to it.

The outline is the accessible equivalent of the canvas: everything the canvas can do must be reachable through the outline, the search and the panels. Search uses MiniSearch over tool names and capabilities, cluster names and need names.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The left rail (240 pixels) shows an outline tree of 8 tiers, 55 clusters and 752 tools, with clusters collapsed by default
- [ ] Selecting a row in the outline selects it on the map and flies to it; selecting on the map expands and highlights the matching row
- [ ] The outline is exposed to assistive technology as a tree; arrow keys move within it and Enter selects
- [ ] Selection changes are announced to assistive technology
- [ ] Typing in the search box lists results grouped as tools, clusters and needs
- [ ] Search matches on tool capability text as well as names, and tolerates a small typo
- [ ] Choosing a result flies to it and opens its detail card
- [ ] `/` focuses the search box; `?` shows the list of keys
- [ ] Keyboard focus is always visible, using the focus outline from the style guide
- [ ] A partner can go from opening the file to reading a chosen tool's detail card using the keyboard alone
- [ ] Search tests cover a name match, a capability match and a no-result query
- [ ] The critique has run on new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
