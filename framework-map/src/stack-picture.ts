/**
 * stack-picture: the static picture of the stack, for a browser with no WebGL.
 *
 * A pure function of the layout, as the layout is of the graph. The build runs
 * it once and inlines the result (see vite.config.ts), so the picture is in
 * the built file and cannot fall behind the data. It draws the stack at rest,
 * seen from the front and a little from above, as the camera sees it at rest:
 * every plate with its cells and marks, each mark in the form of its
 * decision-class step, and each tier's count and name beside its plate.
 *
 * The picture is one block with a row for each tier. A row holds the tier's
 * count and name, as text of the page, and a drawing of its plate. So a window
 * too small for the drawings can draw them smaller and leave the names at
 * their size: a name is never drawn below the text floor. Every drawing has
 * the same frame, so the plates share their left edge at any size.
 *
 * Every rectangle stands on whole pixels, so its lines are sharp. A mark's
 * outline is drawn inside the mark, as the scene draws it, so every mark is
 * the same size whatever its step.
 *
 * The picture carries class names and no colour. src/styles.css colours it
 * from the same tokens the scene reads, and sets the rows out.
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
  /** From the top of one plate to the top of the next, where the names stand beside the plates. */
  rowPx: number;
  /** The column of tier names, left of the plates, and the gap between the two. */
  nameColumnPx: number;
  nameGapPx: number;
  /** The clear space around a drawing, so no line is cut at its edge. */
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
  marginPx: 2,
};

const escapeText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** A place or a length in the picture, on a whole pixel. */
const px = (value: number): string => String(Math.round(value));

/**
 * The picture as markup: one `<div>` element, `data-stack-picture`, with a row for each tier from the top
 * of the stack down. A row is the tier's count and name, and an `<svg>` drawing of its plate, sized in
 * pixels by its `viewBox`.
 */
export function stackPicture(layout: StackLayout, index: GraphIndex, metrics: PictureMetrics = PICTURE_METRICS): string {
  const { pixelsPerUnit, depthPixelsPerUnit, marginPx } = metrics;

  // The plates from the top of the stack down: one row each.
  const plates = [...layout.plates].sort((a, b) => b.y - a.y);
  const plateDepthPx = Math.max(0, ...plates.map((plate) => plate.depth)) * depthPixelsPerUnit;
  // Every drawing is as wide as the widest plate, with the clear space at its sides.
  const width = Math.ceil((layout.bounds.max.x - layout.bounds.min.x) * pixelsPerUnit) + 2 * marginPx;
  const height = Math.ceil(plateDepthPx) + 2 * marginPx;

  /**
   * A rectangle lying on a plate, as it stands in its tier's drawing.
   * @param outlinePx The width of an outline to draw inside the rectangle. Without it, the stylesheet's own line lies on the edge.
   */
  const rect = (className: string, at: { x: number; z: number; width: number; depth: number }, outlinePx = 0): string => {
    const middle = marginPx + plateDepthPx / 2;
    // Each edge is put on its own whole pixel, so a row of marks keeps an even step.
    const left = Math.round(marginPx + (at.x - at.width / 2 - layout.bounds.min.x) * pixelsPerUnit);
    const top = Math.round(middle + (at.z - at.depth / 2) * depthPixelsPerUnit);
    const wide = Math.max(1, Math.round(at.width * pixelsPerUnit));
    const deep = Math.max(1, Math.round(at.depth * depthPixelsPerUnit));
    if (outlinePx <= 0) return `<rect class="${className}" x="${left}" y="${top}" width="${wide}" height="${deep}"/>`;
    // A line is drawn half to each side of its path, so the path stands half a line in from the edge.
    const inset = outlinePx / 2;
    return `<rect class="${className}" x="${left + inset}" y="${top + inset}" width="${wide - outlinePx}" height="${deep - outlinePx}" stroke-width="${outlinePx}"/>`;
  };

  const rows = plates.map((plate) => {
    const tier = index.tier(plate.tier);
    const parts = [rect('picture-plate', plate)];
    for (const cell of layout.cells) if (cell.tier === plate.tier) parts.push(rect('picture-cell', cell));
    for (const mark of layout.marks) {
      if (mark.tier !== plate.tier) continue;
      const tool = index.tool(mark.tool);
      const step = tool ? decisionStep(tool.decision_class) : 'optional';
      const token = MARK_TOKEN_OF_STEP[step];
      parts.push(
        rect(
          `picture-mark picture-mark-${step}`,
          { x: mark.x, z: mark.z, width: mark.size, depth: mark.size },
          token.outline ? token.widthPx : 0,
        ),
      );
    }
    return (
      '<div class="picture-tier">' +
      '<p class="picture-label">' +
      `<span class="picture-count">${escapeText(tierCountText(plate.tier, index.toolCountOf(plate.tier)))}</span>` +
      `<span class="picture-name">${escapeText(tier?.label ?? plate.tier)}</span>` +
      '</p>' +
      `<svg class="picture-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px(width)} ${px(height)}" width="${px(width)}" height="${px(height)}" aria-hidden="true">` +
      parts.join('') +
      '</svg>' +
      '</div>'
    );
  });

  return `<div data-stack-picture>${rows.join('')}</div>`;
}
