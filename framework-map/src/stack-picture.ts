/**
 * stack-picture: the static picture of the stack, for a browser with no WebGL.
 *
 * A pure function of the layout, as the layout is of the graph. The build runs
 * it once and inlines the result (see vite.config.ts), so the picture is in
 * the built file and cannot fall behind the data. It draws the stack at rest,
 * seen from the front and a little from above, as the camera sees it at rest:
 * every plate with its cells and marks, each mark in the form of its
 * decision-class step, and each tier's count and name to the left.
 *
 * Every rectangle stands on whole pixels, so its lines are sharp. A mark's
 * outline is drawn inside the mark, as the scene draws it, so every mark is
 * the same size whatever its step.
 *
 * The picture carries class names and no colour. src/styles.css colours it
 * from the same tokens the scene reads.
 */
import type { GraphIndex } from './data';
import { decisionStep, tierCountText } from './display.ts';
import type { StackLayout } from './layout';
import { MARK_TOKEN_OF_STEP } from './tokens.ts';

/** The sizes the static picture is drawn with, in pixels. */
export interface PictureMetrics {
  /** The pixels one layout unit covers across the picture. */
  pixelsPerUnit: number;
  /** The pixels one layout unit of a plate's depth covers. Fewer than across, because the plates are seen at a tilt. */
  depthPixelsPerUnit: number;
  /** From the top of one plate to the top of the next. */
  rowPx: number;
  /** The column of tier names, left of the plates, and the gap between the two. */
  nameColumnPx: number;
  nameGapPx: number;
  /** The baselines of a tier's count and of its name, from the top of its row. */
  countBaselinePx: number;
  nameBaselinePx: number;
  /** How far the letters of a tier's name reach under its baseline. The last row is at least as tall as its name. */
  nameDescentPx: number;
  /** The clear space around the whole picture, so no line is cut at its edge. */
  marginPx: number;
}

/**
 * The settled sizes. They are here and not in src/constants.ts for the reason the layout's are in
 * src/layout.ts: the build draws the picture before the page runs.
 */
export const PICTURE_METRICS: PictureMetrics = {
  pixelsPerUnit: 13,
  depthPixelsPerUnit: 8,
  rowPx: 58,
  nameColumnPx: 400,
  nameGapPx: 24,
  countBaselinePx: 14,
  nameBaselinePx: 38,
  nameDescentPx: 8,
  marginPx: 2,
};

const escapeText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** A place or a length in the picture, on a whole pixel. */
const px = (value: number): string => String(Math.round(value));

/**
 * The picture as SVG markup: one `<svg>` element, `data-stack-picture`, sized in pixels by its `viewBox`.
 */
export function stackPicture(layout: StackLayout, index: GraphIndex, metrics: PictureMetrics = PICTURE_METRICS): string {
  const { pixelsPerUnit, depthPixelsPerUnit, rowPx, nameColumnPx, nameGapPx, marginPx } = metrics;
  const platesLeft = marginPx + nameColumnPx + nameGapPx;

  // The plates from the top of the stack down: one row each.
  const plates = [...layout.plates].sort((a, b) => b.y - a.y);
  const rowOf = new Map(plates.map((plate, row) => [plate.tier, row]));
  const plateDepthPx = Math.max(0, ...plates.map((plate) => plate.depth)) * depthPixelsPerUnit;

  /** The top of a tier's row in the picture. */
  const rowTop = (tier: string): number => marginPx + (rowOf.get(tier) ?? 0) * rowPx;

  /**
   * A rectangle lying on a tier's plate, as it stands in the picture.
   * @param outlinePx The width of an outline to draw inside the rectangle. Without it, the stylesheet's own line lies on the edge.
   */
  const rect = (
    className: string,
    tier: string,
    at: { x: number; z: number; width: number; depth: number },
    outlinePx = 0,
  ): string => {
    const middle = rowTop(tier) + plateDepthPx / 2;
    // Each edge is put on its own whole pixel, so a row of marks keeps an even step.
    const left = Math.round(platesLeft + (at.x - at.width / 2 - layout.bounds.min.x) * pixelsPerUnit);
    const top = Math.round(middle + (at.z - at.depth / 2) * depthPixelsPerUnit);
    const width = Math.max(1, Math.round(at.width * pixelsPerUnit));
    const height = Math.max(1, Math.round(at.depth * depthPixelsPerUnit));
    if (outlinePx <= 0) return `<rect class="${className}" x="${left}" y="${top}" width="${width}" height="${height}"/>`;
    // A line is drawn half to each side of its path, so the path stands half a line in from the edge.
    const inset = outlinePx / 2;
    return `<rect class="${className}" x="${left + inset}" y="${top + inset}" width="${width - outlinePx}" height="${height - outlinePx}" stroke-width="${outlinePx}"/>`;
  };

  const parts: string[] = [];
  for (const plate of plates) {
    const tier = index.tier(plate.tier);
    const top = rowTop(plate.tier);
    parts.push(
      `<text class="picture-count" x="${marginPx}" y="${px(top + metrics.countBaselinePx)}">${escapeText(tierCountText(plate.tier, index.toolCountOf(plate.tier)))}</text>`,
      `<text class="picture-name" x="${marginPx}" y="${px(top + metrics.nameBaselinePx)}">${escapeText(tier?.label ?? plate.tier)}</text>`,
      rect('picture-plate', plate.tier, plate),
    );
  }
  for (const cell of layout.cells) parts.push(rect('picture-cell', cell.tier, cell));
  for (const mark of layout.marks) {
    const tool = index.tool(mark.tool);
    const step = tool ? decisionStep(tool.decision_class) : 'optional';
    const token = MARK_TOKEN_OF_STEP[step];
    parts.push(
      rect(
        `picture-mark picture-mark-${step}`,
        mark.tier,
        { x: mark.x, z: mark.z, width: mark.size, depth: mark.size },
        token.outline ? token.widthPx : 0,
      ),
    );
  }

  const width = Math.ceil(platesLeft + (layout.bounds.max.x - layout.bounds.min.x) * pixelsPerUnit) + marginPx;
  const lastRowPx = Math.max(plateDepthPx, metrics.nameBaselinePx + metrics.nameDescentPx);
  const height = Math.ceil(marginPx + Math.max(0, plates.length - 1) * rowPx + lastRowPx) + marginPx;
  return (
    `<svg data-stack-picture class="stack-picture" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px(width)} ${px(height)}" width="${px(width)}" height="${px(height)}">` +
    parts.join('') +
    '</svg>'
  );
}
