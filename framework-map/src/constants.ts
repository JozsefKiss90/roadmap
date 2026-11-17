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

  /** The left rail's width. The picture, its names and the camera all keep right of it. */
  railPx: 240,

  /**
   * The part of the window kept clear around the stack at rest, in pixels. The
   * left one holds the rail and, beside it, the column of tier names. The
   * bottom one holds the legend.
   */
  insetTopPx: 76,
  insetRightPx: 40,
  insetBottomPx: 64,
  insetLeftPx: 512,

  /**
   * The camera at the tier and cluster distances. It tilts toward top-down,
   * and comes no closer than a number of pixels for each layout unit, so a
   * short plate or a small cell is not blown up to fill the window.
   */
  tierTiltDegrees: 32,
  tierMostPixelsPerUnit: 30,
  clusterTiltDegrees: 24,
  clusterMostPixelsPerUnit: 40,
  /** The limits at those two distances: tilt, turn to either side, and zoom as multiples of the range. */
  focusTiltSlackDegrees: 10,
  focusMaxTiltDegrees: 60,
  focusTurnDegrees: 30,
  focusNearestZoom: 0.7,
  focusFarthestZoom: 1.3,
  /** The window's margins at those two distances, the left one from the rail. The right one at the tier distance is room for cluster names. */
  nearInsetSidePx: 48,
  tierInsetRightPx: 260,
  /** The detail card's width. While it is open, the tier and cluster distances keep clear of it. */
  detailCardPx: 360,
  /** Where the names above a focused plate or cell begin, from the top of the window. */
  annotationTopPx: 88,

  /** How opaque the plates above the focused one are. */
  fadedPlateOpacity: 0.04,
  /** Durations, from the style guide's "Map motion" table. */
  flightMs: 700,
  fadeMs: 250,

  /** How thick a plate is, in layout units. */
  plateThickness: 0.16,

  /** The tier labels: a column to the left of the stack. */
  labelColumnPx: 216,
  labelGapPx: 32,
  /** How far the top of a tier name sits above the middle of its plate. */
  labelRisePx: 10,
  /** From the top of a tier name up to the bottom of its count. */
  countGapPx: 7,
  /** The least clear space between one tier's label and the next. With less, the names are left out and the counts stay. */
  tierLabelGapPx: 4,
  /** Sizes on screen, from the style guide's "Map type" table. */
  tierNamePx: 20,
  clusterNamePx: 13,
  toolNamePx: 12,
  tagPx: 11,

  /** Cluster names: a staircase above the focused plate. One row for each name, and a gap under the lowest. */
  clusterRowPx: 19,
  clusterNameGapPx: 12,
  /** From a cluster name's leader line to its first letter. */
  clusterNameIndentPx: 6,

  /** Tool names: a list in columns above the focused cell. */
  toolRowPx: 20,
  toolListMostRows: 20,
  toolColumnGapPx: 40,
  /** From the foot of the list down to the cell. */
  toolListGapPx: 30,
  /** The least space between the list and the rail, and the edge of the window or of the open detail card. */
  listEdgePx: 24,
  /** A name too long for the list's room is cut short with an ellipsis, but never below this width. */
  toolNameLeastPx: 80,
  /** The kind icon, and the space between an icon, a name and a gate badge. */
  toolIconPx: 14,
  toolPartGapPx: 7,
  /** The least space between a name and its gate badge. */
  toolBadgeGapPx: 12,

  /** The hover label: how far it stands from the pointer, to the right and above. */
  hoverLabelOffsetPx: 12,
  /** Where the link to the tool matrix leads: the export that sits beside the map's file. */
  toolMatrixHref: 'Hermes%20OS%20tool%20matrix.xlsx',
};

export type Constants = typeof constants;
