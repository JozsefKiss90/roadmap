/**
 * pick: which plate and cell lie under a point of the picture. Pure
 * arithmetic on the layout, so it has no three.js in it.
 */
import type { Point, StackLayout } from './layout';

/** A line of sight: from `origin`, along `direction`. */
export interface Ray {
  origin: Point;
  direction: Point;
}

export interface StackHit {
  tier: string;
  /** The cell the ray meets, or null where it meets the plate between its cells. */
  cluster: string | null;
}

const within = (value: number, centre: number, size: number): boolean => Math.abs(value - centre) <= size / 2;

/**
 * The first plate a ray meets, and the cell it meets there. A plate that
 * `seesThrough` names is passed over, as if it were not there.
 */
export function pickOnStack(
  ray: Ray,
  layout: StackLayout,
  seesThrough: (tier: string) => boolean = () => false,
): StackHit | null {
  // A ray that runs level never meets a plate's top face.
  if (ray.direction.y === 0) return null;
  let nearest = Infinity;
  let hit: StackHit | null = null;
  for (const plate of layout.plates) {
    if (seesThrough(plate.tier)) continue;
    const along = (plate.y - ray.origin.y) / ray.direction.y;
    if (along <= 0 || along >= nearest) continue;
    const x = ray.origin.x + along * ray.direction.x;
    const z = ray.origin.z + along * ray.direction.z;
    if (!within(x, plate.x, plate.width) || !within(z, plate.z, plate.depth)) continue;
    const cell = layout.cells.find(
      (candidate) =>
        candidate.tier === plate.tier && within(x, candidate.x, candidate.width) && within(z, candidate.z, candidate.depth),
    );
    nearest = along;
    hit = { tier: plate.tier, cluster: cell?.cluster ?? null };
  }
  return hit;
}
