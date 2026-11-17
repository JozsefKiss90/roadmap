# 11: Role lens

**What to build:** A partner switches on the role lens for the Architect, Designer or Analyst and sees the tools that role uses brought forward across all eight tiers, with everything else faded in place. This answers "what is in my reach".

The role lens means "used by" only; "operated by" stays a filter. One role is shown at a time. Tools shared with other roles look the same as the role's other tools; the detail card lists who else uses them. This ticket also adds the lens switch, since the role lens is the first lens. Only one lens is active at a time, and filters apply on top of it.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] A lens switch in the left rail offers no lens and the role lens; later lenses add to it
- [ ] With the role lens on, a partner picks one of the three roles
- [ ] Tools the chosen role uses keep their decision-class form at full strength; all other tools take the faded state; nothing moves
- [ ] The number of tools in reach for the chosen role is shown
- [ ] Each tier's count reflects the tools in reach on that plate while the lens is on
- [ ] The detail card of a tool lists every role that uses it
- [ ] The lens and its role are recorded in the URL fragment and restored from it
- [ ] Keys `1` and `2` switch between no lens and the role lens
- [ ] If filters from ticket 10 are present, they apply on top of the lens
- [ ] State tests cover each role, switching role, switching the lens off, and the URL round trip
- [ ] A "Designer role lens" state is in the screenshot script and runs clean
- [ ] The critique has run on the new screenshots and each finding is fixed or written under Comments
- [ ] The work is committed

## Comments
