import { describe, expect, it } from 'vitest';
import { pictureOf, placeToFitPoints, radians, rangeToFit, towardCamera, placeToFit } from './camera';
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

describe('pictureOf', () => {
  const place: CameraPlace = { target: { x: 4, y: 7, z: -2 }, range: 900, tiltDegrees: 64, turnDegrees: 20 };

  it('draws the point the camera looks at in the middle of the picture', () => {
    const at = pictureOf(place.target, place, picture, FIELD_OF_VIEW);
    expect(at.x).toBeCloseTo(picture.width / 2, 6);
    expect(at.y).toBeCloseTo(picture.height / 2, 6);
  });

  it('draws a higher point higher, and a point to the right of the camera further right', () => {
    const above = pictureOf({ ...place.target, y: place.target.y + 5 }, place, picture, FIELD_OF_VIEW);
    expect(above.x).toBeCloseTo(picture.width / 2, 6);
    expect(above.y).toBeLessThan(picture.height / 2);
    // At a turn of 20 degrees the camera's right is mostly along x.
    const across = pictureOf({ ...place.target, x: place.target.x + 5 }, place, picture, FIELD_OF_VIEW);
    expect(across.x).toBeGreaterThan(picture.width / 2);
  });

  it('draws a point nearer the camera larger: further from the middle for the same step across', () => {
    const out = towardCamera(place.tiltDegrees, place.turnDegrees);
    const step = (toward: number): Point => ({
      x: place.target.x + toward * out.x + 5 * Math.cos(radians(place.turnDegrees)),
      y: place.target.y + toward * out.y,
      z: place.target.z + toward * out.z - 5 * Math.sin(radians(place.turnDegrees)),
    });
    const far = pictureOf(step(0), place, picture, FIELD_OF_VIEW).x - picture.width / 2;
    const near = pictureOf(step(450), place, picture, FIELD_OF_VIEW).x - picture.width / 2;
    expect(near).toBeCloseTo(2 * far, 6);
  });
});

describe('placeToFitPoints', () => {
  /** The rectangle a set of points covers in the picture. */
  const coverOfPoints = (points: readonly Point[], place: CameraPlace): Region => {
    const at = points.map((point) => inPicture(point, place));
    return {
      left: Math.min(...at.map(({ x }) => x)),
      right: Math.max(...at.map(({ x }) => x)),
      top: Math.min(...at.map(({ y }) => y)),
      bottom: Math.max(...at.map(({ y }) => y)),
    };
  };
  /** The corners of a flat plate, as wide to one side of the origin as to the other. */
  const plateAt = (y: number, halfWidth: number): Point[] =>
    [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * halfWidth, y, z: z * 3 })));
  /** A stack of three plates that share their left edge, as the map's do. The longest is the middle one. */
  const stack: Point[] = [
    ...plateAt(0, 30).map((corner) => (corner.x > 0 ? { ...corner, x: -10 } : corner)),
    ...plateAt(7, 30),
    ...plateAt(14, 30).map((corner) => (corner.x > 0 ? { ...corner, x: 5 } : corner)),
  ];
  const origin: Point = { x: 0, y: 7, z: 0 };
  /** A region centred on the picture, and one that is also too short for the stack to fill it across. */
  const whole: Region = { left: 300, top: 76, right: 1100, bottom: 736 };
  const short: Region = { left: 100, top: 250, right: 1300, bottom: 550 };
  const fit = (points: Point[], beside: Point[], within: Region, tilt: number, turn: number): CameraPlace =>
    placeToFitPoints(points, beside, origin, picture, within, FIELD_OF_VIEW, tilt, turn);

  it('puts every point inside the region, at any tilt and turn', () => {
    for (const [tilt, turn] of [
      [55, 0],
      [55, 20],
      [64, -35],
      [46, 160],
    ] as const) {
      const cover = coverOfPoints(stack, fit(stack, [], region, tilt, turn));
      expect(cover.left).toBeGreaterThanOrEqual(region.left - 0.01);
      expect(cover.right).toBeLessThanOrEqual(region.right + 0.01);
      expect(cover.top).toBeGreaterThanOrEqual(region.top - 0.01);
      expect(cover.bottom).toBeLessThanOrEqual(region.bottom + 0.01);
    }
  });

  it('stands as near as the region allows: the points reach two opposite sides of it', () => {
    for (const turn of [0, 20, 70]) {
      const cover = coverOfPoints(stack, fit(stack, [], region, 55, turn));
      const acrossLeft = region.right - region.left - (cover.right - cover.left);
      const downLeft = region.bottom - region.top - (cover.bottom - cover.top);
      expect(Math.min(acrossLeft, downLeft)).toBeCloseTo(0, 6);
    }
  });

  it('centres the points in the region, across and from top to bottom', () => {
    const cover = coverOfPoints(stack, fit(stack, [], region, 55, 20));
    // To within a pixel: the lens is narrow, not flat, so the far side is drawn a hair smaller than the near one.
    expect((cover.left + cover.right) / 2).toBeCloseTo((region.left + region.right) / 2, 0);
    expect((cover.top + cover.bottom) / 2).toBeCloseTo((region.top + region.bottom) / 2, 0);
  });

  it('comes nearer than the fit of the box around the points, when the stack is seen at a turn', () => {
    const box: Box = { min: { x: -30, y: 0, z: -3 }, max: { x: 30, y: 14, z: 3 } };
    // The box has a corner under the right end of the bottom plate, where that plate is short.
    const ofPoints = fit(stack, [], short, 55, 20);
    expect(ofPoints.range).toBeLessThan(placeToFit(box, picture, short, FIELD_OF_VIEW, 55, 20).range * 0.95);
  });

  it('keeps the target on the vertical line through the origin, where the region is centred on the picture', () => {
    const place = fit(stack, [], whole, 55, 20);
    // The widest plate is as wide to one side as to the other. The lens is narrow, not flat, so a hair is left.
    expect(Math.hypot(place.target.x - origin.x, place.target.z - origin.z)).toBeLessThan(0.5);
    // Seen from any other side the stack is still in the middle of the region across.
    const turned = coverOfPoints(stack, { ...place, turnDegrees: 200 });
    expect((turned.left + turned.right) / 2).toBeCloseTo((whole.left + whole.right) / 2, -1);
  });

  it('moves the target off that line to centre the points in a region that is off centre', () => {
    const place = fit(stack, [], region, 55, 20);
    expect(Math.hypot(place.target.x - origin.x, place.target.z - origin.z)).toBeGreaterThan(2);
  });

  it('holds the points beside the region between its top and bottom, and not between its sides', () => {
    // A label at the left end of the top plate, which runs on up and to the left of it.
    const label: Point[] = [
      { x: -50, y: 16, z: 0 },
      { x: -32, y: 16, z: 0 },
    ];
    const without = fit(stack, [], short, 55, 20);
    const place = fit(stack, label, short, 55, 20);
    expect(coverOfPoints(label, without).top).toBeLessThan(short.top);
    const all = coverOfPoints([...stack, ...label], place);
    expect(all.top).toBeCloseTo(short.top, 6);
    expect(all.bottom).toBeCloseTo(short.bottom, 6);
    expect(coverOfPoints(label, place).left).toBeLessThan(coverOfPoints(stack, place).left);
    expect(coverOfPoints(stack, place).left).toBeGreaterThanOrEqual(short.left - 0.01);
    expect(place.range).toBeGreaterThan(without.range);
  });

  it('gives a single point, or none, a camera that is somewhere', () => {
    for (const points of [[{ x: 1, y: 2, z: 3 }], []]) {
      const place = fit(points, [], region, 55, 20);
      expect(place.range).toBeGreaterThan(0);
      expect(Number.isFinite(place.target.x + place.target.y + place.target.z)).toBe(true);
    }
  });
});
