# 10: Filters and legend

**What to build:** A partner can narrow the map to what they care about and see how much is left. Seven filters sit in the left rail: decision class, kind family, used by, operated by, hosting, value stream and gate family. Tools that do not match fade but stay in place, and a count such as "214 of 752" shows the result. A legend explains the four decision-class steps.

Values within one filter combine as "or"; different filters combine as "and". The kind and gate families are the groupings signed off in ticket 03 and live in one display table.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The seven filters are in the left rail, each listing its values with the number of tools for each
- [ ] Choosing two values in one filter shows tools matching either; choosing values in two filters shows tools matching both
- [ ] Tools outside the filter fade to the faded state and never move or disappear
- [ ] A count shows matching tools out of 752 and updates with every change
- [ ] A "committed only" control selects Core v1, Core later and Build (327 tools) in one click, and is off by default
- [ ] One control clears all filters
- [ ] Filtered-out tools are also dimmed in the outline
- [ ] The filters are recorded in the URL fragment and restored from it
- [ ] A legend at the bottom left shows the four decision-class steps with their names
- [ ] State tests cover "or" within a filter, "and" across filters, clearing, and the URL round trip
- [ ] A "filtered" state is in the screenshot script and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
