/**
 * display: the map's display table.
 *
 * The ten decision-class values group into the four steps a mark's form shows
 * (spec, "Encodings"). Kind and gate families are grouped in the vocabulary
 * file itself; the steps are grouped here. The table also gives each kind
 * family its icon and each gate family the word on its badge, and names the
 * decision classes of the "committed only" control.
 */

/** The four steps, from most to least committed. A cell lists its marks in this order. */
export const DECISION_STEPS = ['committed', 'planned', 'optional', 'guarded'] as const;

export type DecisionStep = (typeof DECISION_STEPS)[number];

const STEP_OF_DECISION_CLASS: Readonly<Record<string, DecisionStep>> = {
  'Core v1': 'committed',
  Adapter: 'committed',
  'Skill / rule': 'committed',
  'Core later': 'planned',
  Build: 'planned',
  'Optional / benchmark': 'optional',
  'Reference / concept': 'optional',
  'Out of scope': 'optional',
  Unverified: 'optional',
  'Delay / guarded': 'guarded',
};

/** The step a decision class is drawn in. Throws for a value the table lacks. */
export function decisionStep(decisionClass: string): DecisionStep {
  const step = Object.hasOwn(STEP_OF_DECISION_CLASS, decisionClass)
    ? STEP_OF_DECISION_CLASS[decisionClass]
    : undefined;
  if (!step) throw new Error(`The display table has no step for the decision class "${decisionClass}".`);
  return step;
}

/** The name of each step, as the legend gives it. */
export const STEP_NAMES: Readonly<Record<DecisionStep, string>> = {
  committed: 'Committed',
  planned: 'Planned',
  optional: 'Optional',
  guarded: 'Guarded',
};

/**
 * The decision classes the "committed only" control chooses (spec, "Spatial
 * model"). They are not the committed step: the control takes in what is
 * planned and built, and leaves out adapters, skills and rules.
 */
export const COMMITTED_ONLY: readonly string[] = ['Core v1', 'Core later', 'Build'];

/** The Lucide icons the map draws for kind families, by Lucide's own names. */
export const KIND_ICONS = [
  'sparkles',
  'puzzle',
  'plug',
  'package',
  'app-window',
  'server',
  'brain',
  'toggle-right',
  'book-open',
  'hammer',
] as const;

export type KindIcon = (typeof KIND_ICONS)[number];

const ICON_OF_KIND_FAMILY: Readonly<Record<string, KindIcon>> = {
  'Skill or command': 'sparkles',
  'Plug-in, subagent or hook': 'puzzle',
  'MCP server': 'plug',
  'Library or framework': 'package',
  'App or CLI': 'app-window',
  'Platform or infrastructure': 'server',
  Model: 'brain',
  'Feature or capability': 'toggle-right',
  'Standard or reference': 'book-open',
  'Internal build': 'hammer',
};

/** The icon of a kind family. Throws for a family the table lacks. */
export function kindIcon(kindFamily: string): KindIcon {
  const icon = Object.hasOwn(ICON_OF_KIND_FAMILY, kindFamily) ? ICON_OF_KIND_FAMILY[kindFamily] : undefined;
  if (!icon) throw new Error(`The display table has no icon for the kind family "${kindFamily}".`);
  return icon;
}

/** The word on the badge of each gate family. A tool with no gate carries no badge. */
const BADGE_OF_GATE_FAMILY: Readonly<Record<string, string | null>> = {
  None: null,
  'Admission review': 'Review',
  'Licence check': 'Licence',
  Guarded: 'Guarded',
  'Operator approval': 'Approval',
};

/** The word on a gated tool's badge, or null for a tool with no gate. Throws for a family the table lacks. */
export function gateBadge(gateFamily: string): string | null {
  if (!Object.hasOwn(BADGE_OF_GATE_FAMILY, gateFamily)) {
    throw new Error(`The display table has no badge for the gate family "${gateFamily}".`);
  }
  return BADGE_OF_GATE_FAMILY[gateFamily] ?? null;
}
