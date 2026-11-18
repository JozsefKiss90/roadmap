import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readGraph } from './data';
import { decisionStep } from './display';
import { layoutStack } from './layout';
import { stackPicture } from './stack-picture';
import type { Vocabulary } from './validate';

const inToolDiscovery = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../tool-discovery/${name}`, import.meta.url), 'utf8'));

const index = readGraph(inToolDiscovery('tool-framework.graph.json'), inToolDiscovery('vocabulary.json') as Vocabulary);
const picture = stackPicture(layoutStack(index), index);

const countOf = (pattern: RegExp): number => [...picture.matchAll(pattern)].length;
const numbersOf = (attribute: string): number[] =>
  [...picture.matchAll(new RegExp(` ${attribute}="([^"]+)"`, 'g'))].map((match) => Number(match[1]));

describe('the static picture of the stack', () => {
  it('is one SVG picture, marked as the picture of the stack', () => {
    expect(picture.startsWith('<svg data-stack-picture ')).toBe(true);
    expect(picture.endsWith('</svg>')).toBe(true);
    expect(countOf(/<svg\b/g)).toBe(1);
  });

  it('draws one plate for each tier, one cell for each cluster and one mark for each tool', () => {
    expect(countOf(/class="picture-plate"/g)).toBe(8);
    expect(countOf(/class="picture-cell"/g)).toBe(55);
    expect(countOf(/class="picture-mark picture-mark-\w+"/g)).toBe(752);
  });

  it('draws each mark in the form of its decision-class step', () => {
    const tools = index.graph.nodes.filter((node) => node.type === 'tool');
    for (const step of ['committed', 'planned', 'optional', 'guarded'] as const) {
      const expected = tools.filter((tool) => decisionStep(tool.decision_class) === step).length;
      expect(countOf(new RegExp(`picture-mark-${step}"`, 'g'))).toBe(expected);
    }
  });

  it('names every tier, with its count of tools', () => {
    expect(picture).toContain('T3 · 154 TOOLS');
    expect(picture).toContain('>Pipelines and applications<');
    expect(picture).toContain('T7 · 33 TOOLS');
    expect(countOf(/class="picture-name"/g)).toBe(8);
  });

  it('puts the top tier at the top', () => {
    expect(picture.indexOf('T7 · 33 TOOLS')).toBeGreaterThan(-1);
    const yOf = (text: string): number => Number(new RegExp(`y="([^"]+)">${text}<`).exec(picture)?.[1]);
    expect(yOf('T7 · 33 TOOLS')).toBeLessThan(yOf('T0 · 99 TOOLS'));
  });

  it('keeps everything inside its own frame', () => {
    const [, , width, height] = /viewBox="([^"]+)"/.exec(picture)![1]!.split(' ').map(Number) as [number, number, number, number];
    expect(Math.min(...numbersOf('x'), ...numbersOf('y'))).toBeGreaterThanOrEqual(0);
    const rects = [...picture.matchAll(/<rect [^>]*x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)];
    expect(rects.length).toBe(8 + 55 + 752);
    for (const [, x, y, w, h] of rects) {
      expect(Number(x) + Number(w)).toBeLessThanOrEqual(width);
      expect(Number(y) + Number(h)).toBeLessThanOrEqual(height);
    }
  });

  it('draws every mark the same size, with its outline inside it', () => {
    const marks = [...picture.matchAll(/<rect class="picture-mark [^"]+" x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"(?: stroke-width="([^"]+)")?/g)];
    const sizes = new Set(marks.map(([, width, height, line = '0']) => `${Number(width) + Number(line)}x${Number(height) + Number(line)}`));
    expect(marks).toHaveLength(752);
    expect([...sizes]).toEqual(['9x6']);
  });

  it('is the same picture each time it is drawn', () => {
    expect(stackPicture(layoutStack(index), index)).toBe(picture);
  });

  it('writes a name that holds markup as text', () => {
    const renamed = readGraph(
      JSON.parse(JSON.stringify(index.graph).replace('Pipelines and applications', 'Pipes <b>&</b> apps')),
      inToolDiscovery('vocabulary.json') as Vocabulary,
    );
    expect(stackPicture(layoutStack(renamed), renamed)).toContain('>Pipes &lt;b&gt;&amp;&lt;/b&gt; apps<');
  });
});
