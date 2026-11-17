/**
 * display: the map's display table for decision classes.
 *
 * The ten decision-class values group into the four steps a mark's form shows
 * (spec, "Encodings"). Kind and gate families are grouped in the vocabulary
 * file itself; the steps are grouped here.
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
