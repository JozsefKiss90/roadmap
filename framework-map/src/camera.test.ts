import { describe, expect, it } from 'vitest';
import { radians, rangeToFit, towardCamera, placeToFit } from './camera';
import type { Box, Region, CameraPlace } from './camera';
import type { Point } from './layout';

const picture = { width: 1400, height: 800 };
const FIELD_OF_VIEW = 3;

/** Where a point lands in the picture for a place, in pixels from the top left corner. */
function inPicture(point: Point, place: CameraPlace): { x: number; y: number } {
  const out = towardCamera(place.tiltDegrees, place.turnDegrees);
  const turn = radians(place.turnDegrees);
  const right = { x: Math.cos(turn), y: 0, z: -Math.sin(turn) };
  const up = {
    x: out.y * right.z - out.z * right.y,
    y: out.z * right.x - out.x * right.z,
    z: out.x * right.y - out.y * right.x,
  };
  const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y + a.z * b.z;
  const fromTarget = {
    x: point.x - place.target.x,
    y: point.y - place.target.y,
    z: point.z - place.target.z,
  };
  const pixelsPerTan = picture.height / 2 / Math.tan(radians(FIELD_OF_VIEW) / 2);
  const depth = place.range - dot(fromTarget, out);
  return {
    x: picture.width / 2 + (dot(fromTarget, right) * pixelsPerTan) / depth,
    y: picture.height / 2 - (dot(fromTarget, up) * pixelsPerTan) / depth,
  };
}

/** The rectangle a box covers in the picture. */
function coverOf(box: Box, place: CameraPlace): Region {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const at = inPicture({ x, y, z }, place);
        xs.push(at.x);
        ys.push(at.y);
      }
    }
  }
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

/** A flat rectangle lying off to one side, like a plate or a cell. */
const plate: Box = { min: { x: -30, y: 10, z: -3 }, max: { x: 10, y: 10, z: 3 } };
const region: Region = { left: 48, top: 300, right: 1100, bottom: 760 };

describe('placeToFit', () => {
  it('puts the whole box inside the region', () => {
    for (const [tilt, turn] of [
      [30, 0],
      [55, 0],
      [25, 20],
    ] as const) {
      const cover = coverOf(plate, placeToFit(plate, picture, region, FIELD_OF_VIEW, tilt, turn));
      expect(cover.left).toBeGreaterThanOrEqual(region.left - 1);
      expect(cover.right).toBeLessThanOrEqual(region.right + 1);
      expect(cover.top).toBeGreaterThanOrEqual(region.top - 1);
      expect(cover.bottom).toBeLessThanOrEqual(region.bottom + 1);
    }
  });

  it('fills the region across when the box is wider than it is deep', () => {
    const cover = coverOf(plate, placeToFit(plate, picture, region, FIELD_OF_VIEW, 30, 0));
    expect(cover.right - cover.left).toBeGreaterThan((region.right - region.left) * 0.97);
  });

  it('centres the box in the region', () => {
    const cover = coverOf(plate, placeToFit(plate, picture, region, FIELD_OF_VIEW, 30, 0));
    expect((cover.left + cover.right) / 2).toBeCloseTo((region.left + region.right) / 2, 0);
    expect((cover.top + cover.bottom) / 2).toBeCloseTo((region.top + region.bottom) / 2, -1);
  });

  it('can stand the box against the top of the region instead', () => {
    const cover = coverOf(plate, placeToFit(plate, picture, region, FIELD_OF_VIEW, 30, 0, { align: 'top' }));
    expect(cover.top).toBeCloseTo(region.top, 0);
    expect((cover.left + cover.right) / 2).toBeCloseTo((region.left + region.right) / 2, 0);
  });

  it('comes no closer than the most pixels a unit may cover', () => {
    const small: Box = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 0, z: 4 } };
    const free = coverOf(small, placeToFit(small, picture, region, FIELD_OF_VIEW, 30, 0));
    const held = coverOf(
      small,
      placeToFit(small, picture, region, FIELD_OF_VIEW, 30, 0, { mostPixelsPerUnit: 40, align: 'top' }),
    );
    expect(free.right - free.left).toBeGreaterThan(200);
    // Two units across, at 40 pixels each. The near edge is drawn a little larger.
    expect(held.right - held.left).toBeGreaterThan(79);
    expect(held.right - held.left).toBeLessThan(82);
    expect(held.top).toBeCloseTo(region.top, 0);
  });

  it('agrees with rangeToFit when the region is the frame inside its insets', () => {
    const inset = { top: 76, right: 40, bottom: 76, left: 40 };
    const whole: Region = {
      left: inset.left,
      top: inset.top,
      right: picture.width - inset.right,
      bottom: picture.height - inset.bottom,
    };
    const stack: Box = { min: { x: -28, y: 0, z: -3 }, max: { x: 28, y: 35, z: 3 } };
    const place = placeToFit(stack, picture, whole, FIELD_OF_VIEW, 55, 0);
    expect(place.range).toBeCloseTo(rangeToFit(stack, { ...picture, inset }, FIELD_OF_VIEW, 55, 0), 6);
    expect(place.target.x).toBeCloseTo(0, 6);
    expect(place.target.y).toBeCloseTo(17.5, 6);
    expect(place.target.z).toBeCloseTo(0, 6);
  });

  it('gives a box with no size a camera that is somewhere', () => {
    const point: Box = { min: { x: 1, y: 2, z: 3 }, max: { x: 1, y: 2, z: 3 } };
    const place = placeToFit(point, picture, region, FIELD_OF_VIEW, 30, 0);
    expect(place.range).toBeGreaterThan(0);
    expect(Number.isFinite(place.target.x + place.target.y + place.target.z)).toBe(true);
  });
});
