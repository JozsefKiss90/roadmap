/**
 * Sizes, spacings and durations settled by eye. The dev-only tuning panel changes the
 * title, camera, inset, motion and depth-blur values live; once a value is settled it is copied
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
  /** The rail as a column of icons, in the compact layout. */
  railIconsPx: 56,
  /**
   * The window widths where the page layout changes (see src/page-layout.ts). Below
   * the first the rail is a column of icons. Below the second it is a bar across
   * the top: the narrow layout in a window wider than it is tall, and otherwise the
   * upright one. Below the third the layout is upright whatever the window's shape.
   */
  compactBelowPx: 1366,
  narrowBelowPx: 1024,
  uprightBelowPx: 480,
  /**
   * The bar: its row, which is an icon and 4 pixels over and under it, and the row the breadcrumb
   * takes under it in the upright layout. Then an icon of the bar, which is the least a finger
   * needs, the gap between two, and the clear space at the bar's ends.
   */
  barRowPx: 52,
  crumbRowPx: 44,
  barIconPx: 44,
  barGapPx: 4,
  barEdgePx: 8,
  /** The width of a part of the rail that is open on its own under the bar. A narrower window leaves 40 pixels of the canvas beside it. */
  railPartPx: 320,
  /** The share of the window's height the detail card takes at the bottom, in the upright layout. */
  cardHeightShare: 0.45,

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
   * The same in the two layouts with the bar, where no column of tier names stands beside the
   * stack and the legend opens on request: the margin at the sides and the bottom, and the room
   * under the bar for the line that says what to choose, with the count over the top plate under it.
   */
  underBarEdgePx: 16,
  underBarTopPx: 44,
  /** The stack's tilt at rest in those two layouts: a little more level, so each tier's count has room over its plate. */
  underBarRestTiltDegrees: 64,
  /** The room the phase strip takes above the legend, while the phase scrub is on. The stack keeps clear of it. */
  phaseStripPx: 60,
  /** The clear space at each side of the strip: from the rail or the window's edge, and from an open detail card. */
  phaseStripSidePx: 16,
  /**
   * A step's two counts stand side by side where the strip is at least this wide, and one over the
   * other where it is not: on a phone, and beside a detail card in a window too narrow for both.
   * The second line of counts makes the strip this much taller.
   */
  phaseStripSideBySidePx: 624,
  phaseStripStackedPx: 16,
  /** The strip's room in the two layouts with the bar, with its counts one over the other. */
  phaseStripUnderBarPx: 80,
  /** What a second row of the legend adds to that room, beside an open detail card. The strip is lifted by as much. */
  legendSecondRowPx: 24,

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
  /**
   * Durations, from the style guide's "Map motion" table: a camera flight; a
   * change of lens or filters, and the fading of a plate; a panel opening or
   * closing; and a step of the phase strip. With reduced motion on, all are zero.
   */
  flightMs: 700,
  fadeMs: 250,
  panelMs: 200,
  phaseStepMs: 300,

  /**
   * Depth blur, at the tier and cluster distances: the plates under the
   * focused one are blurred a little. `depthBlur` is the one switch that turns
   * it off, for a machine whose frames run slow.
   */
  depthBlur: true,
  /** The widest the blur spreads, in pixels on screen. */
  depthBlurPx: 1,
  /** How far under the focused plate the blur is at its widest, in layout units. Plates stand 6.5 apart. */
  depthBlurFullAt: 13,

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
  /** Under the bar, where each tier's count stands over its plate: from the plate's highest point up to the count. */
  countOverPlatePx: 2,
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
  /** The room a gate badge is given when the list's least width is worked out. */
  toolBadgeRoomPx: 60,
  /**
   * In the two layouts with the bar, names that have no room are left out. The cluster names need
   * this much left for the plate: across, beside the room of the last name, and down, under the
   * names. The tool names need this much left under them for the cell.
   */
  leastPlateWidthPx: 320,
  leastPlateHeightPx: 96,
  leastCellHeightPx: 72,
  /** The kind icon, and the space between an icon, a name and a gate badge. */
  toolIconPx: 14,
  toolPartGapPx: 7,
  /** The least space between a name and its gate badge. */
  toolBadgeGapPx: 12,

  /** The hover label: how far it stands from the pointer, to the right and above. */
  hoverLabelOffsetPx: 12,
  /** The same for a finger held in place, which covers more of the picture than a pointer does. */
  fingerLabelOffsetPx: 28,

  /**
   * A press on the canvas (see src/press.ts). A press that moves further than the slop is a drag,
   * not a click; a finger is less steady than a mouse. A finger that rests in place this long is a hold.
   */
  clickSlopPx: 5,
  touchSlopPx: 10,
  holdMs: 500,
  /** A finger's tap passes over a mark drawn smaller than this, and lands on its cell. */
  fingerMarkPx: 10,
  /** How far from a mark a finger may land and still meet it: with a tap, and with a hold. */
  fingerTapReachPx: 8,
  fingerHoldReachPx: 14,
  /** The clear space at each side of the fallback page: beside the picture at its own size, and in a window too narrow for that. */
  fallbackSidePx: 32,
  fallbackSideStackedPx: 16,

  /** Where the link to the tool matrix leads: the export that sits beside the map's file. */
  toolMatrixHref: 'Hermes%20OS%20tool%20matrix.xlsx',
};

export type Constants = typeof constants;
