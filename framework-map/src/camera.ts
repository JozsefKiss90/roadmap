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

/** How many pixels of the picture one unit of tangent covers. */
const pixelsPerTangent = (pictureHeight: number, fieldOfViewDegrees: number): number =>
  pictureHeight / 2 / Math.tan(radians(fieldOfViewDegrees) / 2);

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
