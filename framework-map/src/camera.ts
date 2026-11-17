/**
 * camera: where the camera rests. Pure arithmetic, so it has no three.js in it.
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

export const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The unit vector from the orbit target toward the camera. */
export function towardCamera(tiltDegrees: number, turnDegrees: number): Point {
  const tilt = radians(tiltDegrees);
  const turn = radians(turnDegrees);
  return { x: Math.sin(tilt) * Math.sin(turn), y: Math.cos(tilt), z: Math.sin(tilt) * Math.cos(turn) };
}

/**
 * How far from the centre of a box the camera must be for the whole box to fit
 * inside the frame's insets, when it looks at the centre.
 */
export function rangeToFit(
  box: { min: Point; max: Point },
  frame: Frame,
  fieldOfViewDegrees: number,
  tiltDegrees: number,
  turnDegrees: number,
): number {
  const out = towardCamera(tiltDegrees, turnDegrees);
  // The camera's right and up, for a camera that keeps the vertical axis upright.
  const turn = radians(turnDegrees);
  const right = { x: Math.cos(turn), y: 0, z: -Math.sin(turn) };
  const up = {
    x: out.y * right.z - out.z * right.y,
    y: out.z * right.x - out.x * right.z,
    z: out.x * right.y - out.y * right.x,
  };
  const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y + a.z * b.z;

  const tanHalfField = Math.tan(radians(fieldOfViewDegrees) / 2);
  const pixelsPerTan = frame.height / 2 / tanHalfField;
  // A window too small to hold the insets still gets a finite answer.
  const tanAcross = Math.max(1, frame.width - frame.inset.left - frame.inset.right) / 2 / pixelsPerTan;
  const tanUp = Math.max(1, frame.height - frame.inset.top - frame.inset.bottom) / 2 / pixelsPerTan;

  const half = {
    x: (box.max.x - box.min.x) / 2,
    y: (box.max.y - box.min.y) / 2,
    z: (box.max.z - box.min.z) / 2,
  };
  let range = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const corner = { x: sx * half.x, y: sy * half.y, z: sz * half.z };
        const depth = dot(corner, out);
        range = Math.max(
          range,
          depth + Math.abs(dot(corner, right)) / tanAcross,
          depth + Math.abs(dot(corner, up)) / tanUp,
        );
      }
    }
  }
  return range;
}
