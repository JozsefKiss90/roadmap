/**
 * camera: where the camera stands for each distance. Pure arithmetic, so it
 * has no three.js in it.
 *
 * Angles follow the orbit controls: tilt is measured from straight down on the
 * stack (0) toward level (90), and turn is the angle around the vertical axis.
 */
import type { Point } from './layout';

export interface Frame {
  /** The picture the camera draws, in pixels. */
  width: number;
  height: number;
  /** The margins the stack must stay clear of, in pixels. */
  inset: { top: number; right: number; bottom: number; left: number };
}

/** A rectangle of the picture, in pixels from its top left corner. */
export interface Region {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Where the camera stands: it looks at `target` from `range` away, at a tilt and a turn. */
export interface CameraPlace {
  target: Point;
  range: number;
  tiltDegrees: number;
  turnDegrees: number;
}

export interface Box {
  min: Point;
  max: Point;
}

export const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The four corners of a rectangle that lies flat, as steps from its centre along x and along z. */
export const FLAT_CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** The unit vector from the orbit target toward the camera. */
export function towardCamera(tiltDegrees: number, turnDegrees: number): Point {
  const tilt = radians(tiltDegrees);
  const turn = radians(turnDegrees);
  return { x: Math.sin(tilt) * Math.sin(turn), y: Math.cos(tilt), z: Math.sin(tilt) * Math.cos(turn) };
}

/** The camera's right and up, for a camera that keeps the vertical axis upright. */
function acrossAndUp(tiltDegrees: number, turnDegrees: number): { out: Point; right: Point; up: Point } {
  const out = towardCamera(tiltDegrees, turnDegrees);
  const turn = radians(turnDegrees);
  const right = { x: Math.cos(turn), y: 0, z: -Math.sin(turn) };
  const up = {
    x: out.y * right.z - out.z * right.y,
    y: out.z * right.x - out.x * right.z,
    z: out.x * right.y - out.y * right.x,
  };
  return { out, right, up };
}

/** The corners of a box, measured from its centre. */
function cornersOf(box: Box): Point[] {
  const half = {
    x: (box.max.x - box.min.x) / 2,
    y: (box.max.y - box.min.y) / 2,
    z: (box.max.z - box.min.z) / 2,
  };
  const corners: Point[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) corners.push({ x: sx * half.x, y: sy * half.y, z: sz * half.z });
    }
  }
  return corners;
}

/**
 * How far a set of points reaches across the picture and from top to bottom, in layout units,
 * seen from so far off that the lens narrows nothing. With the map's narrow field of view it is
 * within a few hundredths of what the camera draws.
 */
export function spanFromAfar(points: readonly Point[], tiltDegrees: number, turnDegrees: number): { across: number; up: number } {
  if (points.length === 0) return { across: 0, up: 0 };
  const { right, up } = acrossAndUp(tiltDegrees, turnDegrees);
  const across = points.map((point) => dot(point, right));
  const upward = points.map((point) => dot(point, up));
  return { across: Math.max(...across) - Math.min(...across), up: Math.max(...upward) - Math.min(...upward) };
}

/** How many pixels of the picture one unit of tangent covers. */
export const pixelsPerTangent = (pictureHeight: number, fieldOfViewDegrees: number): number =>
  pictureHeight / 2 / Math.tan(radians(fieldOfViewDegrees) / 2);

/** Where a point is drawn with the camera at a place, in pixels from the picture's top left corner. */
export function pictureOf(
  point: Point,
  place: CameraPlace,
  picture: { width: number; height: number },
  fieldOfViewDegrees: number,
): { x: number; y: number } {
  const { out, right, up } = acrossAndUp(place.tiltDegrees, place.turnDegrees);
  const from = { x: point.x - place.target.x, y: point.y - place.target.y, z: point.z - place.target.z };
  const pixelsPerUnit = pixelsPerTangent(picture.height, fieldOfViewDegrees) / (place.range - dot(from, out));
  return { x: picture.width / 2 + dot(from, right) * pixelsPerUnit, y: picture.height / 2 - dot(from, up) * pixelsPerUnit };
}

/**
 * How far from the centre of a box the camera must be for the whole box to fit
 * inside the frame's insets, when it looks at the centre.
 */
export function rangeToFit(
  box: Box,
  frame: Frame,
  fieldOfViewDegrees: number,
  tiltDegrees: number,
  turnDegrees: number,
): number {
  const { out, right, up } = acrossAndUp(tiltDegrees, turnDegrees);
  const pixelsPerTan = pixelsPerTangent(frame.height, fieldOfViewDegrees);
  // A window too small to hold the insets still gets a finite answer.
  const tanAcross = Math.max(1, frame.width - frame.inset.left - frame.inset.right) / 2 / pixelsPerTan;
  const tanUp = Math.max(1, frame.height - frame.inset.top - frame.inset.bottom) / 2 / pixelsPerTan;

  let range = 0;
  for (const corner of cornersOf(box)) {
    const depth = dot(corner, out);
    range = Math.max(
      range,
      depth + Math.abs(dot(corner, right)) / tanAcross,
      depth + Math.abs(dot(corner, up)) / tanUp,
    );
  }
  return range;
}

/**
 * The place that fits a set of points inside a region of the picture, as near as the camera can
 * stand. Unlike `placeToFit` it takes the points as they are, and not the box around them, so it
 * suits a stack seen at a turn: there the box's corners reach well past the plates.
 *
 * The points are centred in the region, across and from top to bottom. The camera's target
 * keeps on the vertical line through `origin` wherever the region is centred on the picture
 * and the points are as wide to one side of `origin` as to the other, so the stack still
 * turns about its own axis.
 *
 * @param points The points to hold inside the region.
 * @param beside Points that stand in a margin kept for them beside the region, as the tier labels
 *   do. They are held between the region's top and bottom, and not between its sides.
 * @param origin The point the others are measured from: the middle of the stack.
 * @param tiltDegrees More than 0: a camera straight above has no height to slide its target along.
 */
export function placeToFitPoints(
  points: readonly Point[],
  beside: readonly Point[],
  origin: Point,
  picture: { width: number; height: number },
  region: Region,
  fieldOfViewDegrees: number,
  tiltDegrees: number,
  turnDegrees: number,
): CameraPlace {
  // With no point there is nothing to fit, and the camera looks at the origin.
  if (points.length === 0) return { target: { ...origin }, range: Number.EPSILON, tiltDegrees, turnDegrees };
  const { out, right, up } = acrossAndUp(tiltDegrees, turnDegrees);
  const pixelsPerTan = pixelsPerTangent(picture.height, fieldOfViewDegrees);
  // The region's sides as tangents from the middle of the picture: to the right, and upward.
  // A region with no size still gets a finite answer.
  const least = 1 / pixelsPerTan;
  const tanLeft = (region.left - picture.width / 2) / pixelsPerTan;
  const tanRight = Math.max((region.right - picture.width / 2) / pixelsPerTan, tanLeft + least);
  const tanBottom = (picture.height / 2 - region.bottom) / pixelsPerTan;
  const tanTop = Math.max((picture.height / 2 - region.top) / pixelsPerTan, tanBottom + least);

  // With the camera at `side` across, `rise` up and `back` out from the origin, a point at
  // (a, depth) is drawn at the tangent (a - side) / (back - depth). Held under a tangent `most`,
  // that is side >= a + most * depth - most * back: a straight line in `back`. So each side of the
  // region gives one such line, and the nearest camera stands where the lines of two opposite
  // sides meet.
  let farthestRight = -Infinity;
  let farthestLeft = Infinity;
  let highest = -Infinity;
  let lowest = Infinity;
  let nearest = -Infinity;
  const measure = (point: Point): { a: number; b: number; depth: number } => {
    const from = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
    return { a: dot(from, right), b: dot(from, up), depth: dot(from, out) };
  };
  for (const point of points) {
    const { a, depth } = measure(point);
    farthestRight = Math.max(farthestRight, a + tanRight * depth);
    farthestLeft = Math.min(farthestLeft, a + tanLeft * depth);
  }
  for (const point of [...points, ...beside]) {
    const { b, depth } = measure(point);
    highest = Math.max(highest, b + tanTop * depth);
    lowest = Math.min(lowest, b + tanBottom * depth);
    nearest = Math.max(nearest, depth);
  }
  const back = Math.max(
    (farthestRight - farthestLeft) / (tanRight - tanLeft),
    (highest - lowest) / (tanTop - tanBottom),
    // The camera stands in front of every point, and a single point still gets a camera that is somewhere.
    nearest + Number.EPSILON,
    Number.EPSILON,
  );
  const side = (farthestRight - tanRight * back + (farthestLeft - tanLeft * back)) / 2;
  const rise = (highest - tanTop * back + (lowest - tanBottom * back)) / 2;

  // The camera looks along `out`, so its target may be any point on that line. The one at the
  // height `rise / sin(tilt)` above the origin has no step toward the camera in it: the vertical
  // axis is `up` and `out` mixed by the tilt.
  const tilt = radians(tiltDegrees);
  const lift = rise / Math.sin(tilt);
  return {
    target: { x: origin.x + right.x * side, y: origin.y + lift, z: origin.z + right.z * side },
    range: back - lift * Math.cos(tilt),
    tiltDegrees,
    turnDegrees,
  };
}

export interface FitOptions {
  /** The closest the camera may come, as the pixels one layout unit covers at the target. */
  mostPixelsPerUnit?: number;
  /** Where the box sits in the region from top to bottom. Across, it is always centred. */
  align?: 'middle' | 'top';
}

/**
 * The place that fits a box inside a region of the picture. The region need not
 * be centred on the picture: the camera looks a little to the side of the box
 * so that the box lands in the region.
 */
export function placeToFit(
  box: Box,
  picture: { width: number; height: number },
  region: Region,
  fieldOfViewDegrees: number,
  tiltDegrees: number,
  turnDegrees: number,
  { mostPixelsPerUnit = Infinity, align = 'middle' }: FitOptions = {},
): CameraPlace {
  const { out, right, up } = acrossAndUp(tiltDegrees, turnDegrees);
  const pixelsPerTan = pixelsPerTangent(picture.height, fieldOfViewDegrees);
  const frame: Frame = {
    width: picture.width,
    height: picture.height,
    inset: {
      left: region.left,
      top: region.top,
      right: picture.width - region.right,
      bottom: picture.height - region.bottom,
    },
  };
  const range = Math.max(
    rangeToFit(box, frame, fieldOfViewDegrees, tiltDegrees, turnDegrees),
    pixelsPerTan / mostPixelsPerUnit,
    // A box with no size still gets a camera that is somewhere.
    Number.EPSILON,
  );

  // How far the box reaches above its centre in the picture, in pixels.
  let reachUp = 0;
  for (const corner of cornersOf(box)) {
    reachUp = Math.max(reachUp, (dot(corner, up) * pixelsPerTan) / (range - dot(corner, out)));
  }

  // Where the box's centre belongs, in pixels right of and below the middle of the picture.
  const across = (region.left + region.right) / 2 - picture.width / 2;
  const down = (align === 'top' ? region.top + reachUp : (region.top + region.bottom) / 2) - picture.height / 2;
  const unitsPerPixel = range / pixelsPerTan;
  const centre = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };
  const shift = (axis: 'x' | 'y' | 'z'): number =>
    centre[axis] - right[axis] * across * unitsPerPixel + up[axis] * down * unitsPerPixel;
  return { target: { x: shift('x'), y: shift('y'), z: shift('z') }, range, tiltDegrees, turnDegrees };
}
