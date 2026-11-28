# Figma blueprint

How wireframes for 3D views are structured in Figma, so the next agent can read a file through `get_metadata` and restyle it through variables.

Figma holds the **2D layer**: the stage placeholder and everything drawn over it. Camera, lighting and depth are **scene data** and live in the scene spec (below).

## Pages

- **`_Blueprints`** holds the reusable components: stage, safe zones, HUD cards, telemetry overlays. Each exposes its options as component properties (variant, boolean, text).
- **`_Wireframes`** holds the screens, built from instances of those components.

## Names

Every frame and component is named `PREFIX/Name`, with `Name` in PascalCase. The prefix is what the next agent filters on.

| Prefix | What it marks |
|---|---|
| `3D_STAGE` | The placeholder for the rendered 3D viewport |
| `SAFE_ZONE` | A region of the stage that overlays must stay inside |
| `HUD_SLOT` | A fixed position over the stage that holds a card, e.g. `HUD_SLOT/TopLeftMetrics` |
| `HUD_CARD` | A card component placed in a slot |
| `TELEMETRY` | A live-data overlay |
| `ANNOTATION` | A note or callout for readers, not part of the design |

Write the separator as a single `/` with no spaces: Figma reads it as a group path, so components sort by prefix in the assets panel.

## Layout

Auto layout is the default. Absolute positioning belongs to the direct children of a `3D_STAGE` frame and to `ANNOTATION` frames.

## Variables

Bind every spacing, radius and fill to a variable in the `Wireframe` collection. A restyle is then a mode swap on that collection. Read the current bindings with `get_variable_defs`.

## Scene spec

Camera presets, FOV, lighting, depth order and hitboxes go in a JSON scene spec kept beside the scene code that consumes it. The spec is the single source for those values.

Each `3D_STAGE` frame links to it in two ways:

- A text component property `camPreset` names the preset key in the spec.
- Shared plugin data under namespace `roadmap`, key `sceneSpec`, holds the spec's repo path. Write it with `setSharedPluginData` and read it with `getSharedPluginData`, both through `use_figma`.

Node IDs and variable values are read live from `get_metadata` and `get_variable_defs`.

## Before handing off

Run `get_metadata` on each page you touched. The work is done when:

- every frame and component on the page carries one of the prefixes above,
- every `3D_STAGE` frame has `camPreset` set to a key that exists in the spec, and `sceneSpec` pointing at a file that exists,
- every absolutely positioned node sits directly inside a `3D_STAGE` or is an `ANNOTATION`.
