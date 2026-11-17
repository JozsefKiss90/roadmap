/**
 * Sizes and spacings settled by eye. The dev-only tuning panel changes the
 * title, camera and inset values live; once a value is settled it is copied
 * back into this file by hand. The plate and label values are read once, so
 * changing one means a reload.
 *
 * The spacings of the layout itself are in src/layout.ts (STACK_METRICS),
 * because the build computes the layout before the page runs.
 */
export const constants = {
  titleSizePx: 28,

  /** The camera's vertical field of view: a narrow lens, for a near-axonometric look. */
  fieldOfViewDegrees: 3,
  /** The camera's tilt at rest, from straight down (0) toward level (90). */
  restTiltDegrees: 55,
  /** The limits on tilt. The upper one keeps the camera above every plate. */
  minTiltDegrees: 46,
  maxTiltDegrees: 72,
  /**
   * The limits on zoom, as multiples of the camera's range at rest. The tier labels
   * keep their size on screen, so the least tilt and the farthest zoom are
   * also what keeps one label clear of the next.
   */
  nearestZoom: 0.4,
  farthestZoom: 1.1,

  /** The part of the window kept clear around the stack at rest, in pixels. */
  insetTopPx: 76,
  insetRightPx: 40,
  insetBottomPx: 32,
  insetLeftPx: 296,

  /** How thick a plate is, in layout units. */
  plateThickness: 0.16,

  /** The tier labels: a column to the left of the stack. */
  labelColumnPx: 216,
  labelGapPx: 32,
  /** How far the top of a tier name sits above the middle of its plate. */
  labelRisePx: 10,
  /** From the top of a tier name up to the bottom of its count. */
  countGapPx: 7,
  /** Sizes on screen, from the style guide's "Map type" table. */
  tierNamePx: 20,
  countPx: 11,
};

export type Constants = typeof constants;
