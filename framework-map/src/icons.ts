/**
 * icons: the Lucide icons the map uses, as data, and a way to draw one on a
 * 2D canvas for use in the scene. The panels make Lucide's own SVG elements
 * from the same data.
 */
import { AppWindow, BookOpen, Brain, Hammer, Package, Plug, Puzzle, Server, Sparkles, ToggleRight } from 'lucide';
import type { IconNode } from 'lucide';
import type { KindIcon } from './display';

const KIND_ICON_NODES: Readonly<Record<KindIcon, IconNode>> = {
  sparkles: Sparkles,
  puzzle: Puzzle,
  plug: Plug,
  package: Package,
  'app-window': AppWindow,
  server: Server,
  brain: Brain,
  'toggle-right': ToggleRight,
  'book-open': BookOpen,
  hammer: Hammer,
};

/** A kind icon as Lucide's data, for a panel to make an SVG element from. */
export const kindIconNode = (icon: KindIcon): IconNode => KIND_ICON_NODES[icon];

/** Lucide draws every icon on a 24 by 24 grid, with a 2-unit round stroke. */
const GRID = 24;
const STROKE = 2;

const numberOf = (value: string | number | undefined): number => Number(value ?? 0);

/** The outline of one SVG element of an icon. */
function outlineOf(tag: string, attrs: Record<string, string | number | undefined>): Path2D {
  const path = new Path2D();
  switch (tag) {
    case 'path':
      return new Path2D(String(attrs.d ?? ''));
    case 'circle':
      path.arc(numberOf(attrs.cx), numberOf(attrs.cy), numberOf(attrs.r), 0, Math.PI * 2);
      return path;
    case 'ellipse':
      path.ellipse(numberOf(attrs.cx), numberOf(attrs.cy), numberOf(attrs.rx), numberOf(attrs.ry), 0, 0, Math.PI * 2);
      return path;
    case 'rect':
      path.roundRect(
        numberOf(attrs.x),
        numberOf(attrs.y),
        numberOf(attrs.width),
        numberOf(attrs.height),
        numberOf(attrs.rx ?? attrs.ry),
      );
      return path;
    case 'line':
      path.moveTo(numberOf(attrs.x1), numberOf(attrs.y1));
      path.lineTo(numberOf(attrs.x2), numberOf(attrs.y2));
      return path;
    case 'polyline':
    case 'polygon': {
      const numbers = String(attrs.points ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        if (i === 0) path.moveTo(numbers[i]!, numbers[i + 1]!);
        else path.lineTo(numbers[i]!, numbers[i + 1]!);
      }
      if (tag === 'polygon') path.closePath();
      return path;
    }
    default:
      throw new Error(`The map cannot draw the SVG element <${tag}> of an icon.`);
  }
}

/** Draws a kind icon on a square canvas of `sizePx` pixels, in one colour. */
export function drawKindIcon(icon: KindIcon, sizePx: number, colour: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser gave no 2D canvas to draw an icon on.');
  context.scale(sizePx / GRID, sizePx / GRID);
  context.strokeStyle = colour;
  context.fillStyle = colour;
  context.lineWidth = STROKE;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const [tag, attrs] of KIND_ICON_NODES[icon]) {
    const outline = outlineOf(tag, attrs);
    if (attrs.fill !== undefined && attrs.fill !== 'none') context.fill(outline);
    context.stroke(outline);
  }
  return canvas;
}
