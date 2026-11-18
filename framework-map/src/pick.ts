/**
 * pick: which plate, cell and mark lie under a point of the picture. Pure
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
  /** The tool whose mark the ray meets, or null where it meets the cell between its marks. */
  tool: string | null;
}

const within = (value: number, centre: number, size: number): boolean => Math.abs(value - centre) <= size / 2;

/** How far a point lies from a square, along the axis where it lies further. Zero or less inside it. */
const awayFrom = (x: number, z: number, square: { x: number; z: number; size: number }): number =>
  Math.max(Math.abs(x - square.x), Math.abs(z - square.z)) - square.size / 2;

/**
 * The first plate a ray meets, and the cell and the mark it meets there. A plate that
 * `seesThrough` names is passed over, as if it were not there.
 * @param markReach How far from a mark the ray may land and still meet it, in layout units: the
 *   width of a finger, which is no point. The nearest mark of the cell within reach is met.
 */
export function pickOnStack(
  ray: Ray,
  layout: StackLayout,
  seesThrough: (tier: string) => boolean = () => false,
  markReach = 0,
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
    let tool: string | null = null;
    let away = markReach;
    for (const mark of cell ? layout.marks : []) {
      if (mark.cluster !== cell!.cluster) continue;
      const from = awayFrom(x, z, mark);
      // The mark the ray lands on is nearer than any neighbour, so the first mark at the least distance is the one.
      if (from <= 0 || from < away) {
        tool = mark.tool;
        away = from;
        if (from <= 0) break;
      }
    }
    nearest = along;
    hit = { tier: plate.tier, cluster: cell?.cluster ?? null, tool };
  }
  return hit;
}
