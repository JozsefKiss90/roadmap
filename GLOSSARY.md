# Hermes OS tool framework

The language for the Hermes OS tool discovery framework and the map that shows it: what was catalogued, how it is classified, and how it is looked at.

## Language

### Framework

**Tool**:
Any one of the catalogued entries in the framework, whether it is a skill, a model, a standard, an app or an internal build.
_Avoid_: Item, entry, component

**Kind**:
What sort of thing a tool is, such as a skill, an MCP server, a library or a model.
_Avoid_: Type, category

**Tier**:
One of the eight abstraction levels, T7 down to T0, each built from the tiers below it.
_Avoid_: Layer, level

**Cluster**:
A capability family inside one tier; every tool belongs to exactly one.
_Avoid_: Group, category, family

**Need**:
One of the 33 capability needs taken from the AI 2027 roadmap, which tools are mapped to.
_Avoid_: Requirement, capability, gap

**Role**:
One of the three working positions in the partnership: Architect, Designer or Analyst.
_Avoid_: Persona, user type

**Partner**:
A person who holds a role.
_Avoid_: User, member, teammate

### Map

**Map**:
The interactive 3D presentation of the framework.
_Avoid_: Graph, visualisation, viewer

**Plate**:
The flat rectangle that stands for one tier in the map.
_Avoid_: Plane, layer, disc

**Cell**:
The rectangle on a plate that stands for one cluster and holds its tools.
_Avoid_: Sector, wedge, region

**Mark**:
The small shape that stands for one tool in its cell.
_Avoid_: Node, dot, point

**Distance**:
One of the three zoom steps of the map: stack, tier or cluster.
_Avoid_: Zoom level, level of detail

**Role lens**:
The lens that brings forward the tools one role uses.

**Reach**:
The tools the lens that is on brings forward, across all eight tiers; under the role lens, the tools one role uses, and under the need trace, the tools that serve the need. With no lens, every tool is in reach.
_Avoid_: Scope, coverage

**Emphasised**:
Drawn at full strength: a tool that is in reach under the lens and passes the filters. Every other tool is faded.
_Avoid_: Highlighted, active

**Need trace**:
The lens that shows one need and the tools that serve it.

**Traced**:
Serving the need the need trace shows, or a need scheduled in the phase the phase scrub shows; a traced tool's mark takes the selected fill. A selected need is always the traced need. While tools are traced, the selection is marked by an `ink` ring or outline, not by the selected fill.
_Avoid_: Highlighted, linked

**Best fit**:
A traced tool the framework recommends for the need; its mark takes a ring.
_Avoid_: Recommended, primary

**Home cell**:
The cell of the cluster a need belongs to; the lines of a need trace start from it.
_Avoid_: Source, origin

**Need list**:
The needs in the rail, grouped by phase, shown while the need trace is on; a partner picks the need to trace there. Under the phase scrub it holds the needs of the phase shown, and no other. While it is shown, the filters and the outline fold to their headings.

**Phase scrub**:
The lens that steps through the roadmap phases and shows the needs and tools each one calls for. A step shows its own phase only, and moves by hand only.
_Avoid_: Time slider, timeline

**Phase strip**:
The five steps of the phase scrub, P0 to P4, at the bottom of the map; each gives its phase's number of needs and of tools. It is on the page only while the phase scrub is on.
_Avoid_: Timeline, slider, stepper

**Depth blur**:
The slight blur on the plates under the focused one, at the tier and cluster distances. The focused plate is never blurred.
_Avoid_: Depth of field, bokeh, defocus

**Detail card**:
The side panel that describes the selected tool, cluster or need.
_Avoid_: Tooltip, inspector, sidebar

**Rail**:
The column down the left of the map that holds the title, the search box, the lens switch, the need list, the filters and the outline.
_Avoid_: Sidebar, left panel, navigation

**Outline**:
The tree of tiers, clusters and tools in the rail; it reaches everything the canvas does, by keyboard.
_Avoid_: Tree view, list, index

**Hover label**:
The small label beside the pointer that names the tool under it and its cluster.
_Avoid_: Tooltip, popup

**Overlap group**:
A named set of tools that do the same job; the detail card lists a tool's fellow members.
_Avoid_: Duplicate set, alternatives

**Lens**:
A way of re-colouring or filtering the map that leaves every tool where it is.
_Avoid_: Mode, filter (when it means a lens)

**Filter**:
One of the seven ways to narrow the map to the tools that have a chosen value; the tools it leaves out fade in place.
_Avoid_: Lens (when it means a filter)

**Legend**:
The panel at the bottom left of the map that names the four decision-class steps, and the states a lens or a filter adds to them.
_Avoid_: Key (a key is on the keyboard)

**View**:
A distinct spatial arrangement of the map.
_Avoid_: Layout, mode
