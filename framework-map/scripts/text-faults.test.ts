import { describe, expect, it } from 'vitest';
import { contrastOf, textFaults } from './text-faults.mjs';

type Rgb = [number, number, number];

// The light values of the style guide's semantic roles, and the ratios its contrast rows give for them.
const PAPER: Rgb = [0xf6, 0xf1, 0xe7];
const PAPER_2: Rgb = [0xec, 0xe6, 0xd8];
const INK: Rgb = [0x14, 0x21, 0x3d];
const MUTED: Rgb = [0x46, 0x55, 0x7a];
const SOFT: Rgb = [0x55, 0x63, 0x8a];
const RULE_SOLID: Rgb = [0xc4, 0xbf, 0xb1];

const text = (
  name: string,
  changes: Partial<{ colour: Rgb; surface: Rgb; sizePx: number; weight: number; mono: boolean }> = {},
) => ({ name, colour: INK, surface: PAPER, sizePx: 13, weight: 400, mono: false, ...changes });

describe('contrastOf', () => {
  it("gives the ratios the style guide's contrast rows state", () => {
    expect(contrastOf(INK, PAPER).toFixed(2)).toBe('14.19');
    expect(contrastOf(MUTED, PAPER_2).toFixed(2)).toBe('5.94');
    expect(contrastOf(SOFT, PAPER).toFixed(2)).toBe('5.27');
    expect(contrastOf(RULE_SOLID, PAPER).toFixed(2)).toBe('1.63');
  });

  it('is the same whichever of the two colours is named first', () => {
    expect(contrastOf(PAPER, INK)).toBe(contrastOf(INK, PAPER));
  });
});

describe('textFaults', () => {
  it('passes text at 4.5 to 1 and at the text floor: 12 pixels for a name, 11 for a tag in the mono face', () => {
    expect(textFaults([text('a dimmed row', { colour: SOFT, surface: PAPER_2, sizePx: 12 }), text('a tag', { colour: MUTED, sizePx: 11, mono: true })])).toEqual([]);
  });

  it('reports text below 4.5 to 1, with its name and its ratio', () => {
    expect(textFaults([text('a faint row', { colour: RULE_SOLID })])).toEqual(['text is below 4.5 to 1: "a faint row", 1.63 to 1']);
  });

  it('lets large text pass at 3 to 1, as the contrast contract sets it: 24 pixels, or 18.7 pixels at weight 600', () => {
    // 3.56 to 1 on paper, worked out apart from this code: above 3 and below 4.5.
    const grey: Rgb = [0x7a, 0x7f, 0x8c];
    expect(contrastOf(grey, PAPER).toFixed(2)).toBe('3.56');
    expect(textFaults([text('the title', { colour: grey, sizePx: 28 }), text('a card name', { colour: grey, sizePx: 20, weight: 600 })])).toEqual([]);
    expect(textFaults([text('a card name', { colour: grey, sizePx: 20, weight: 500 })])).toEqual([
      'text is below 4.5 to 1: "a card name", 3.56 to 1',
    ]);
    expect(textFaults([text('the title', { colour: RULE_SOLID, sizePx: 28 })])).toEqual(['text is below 3 to 1: "the title", 1.63 to 1']);
  });

  it('reports a name under 12 pixels and a tag under 11', () => {
    expect(textFaults([text('a note', { sizePx: 11 }), text('a count', { sizePx: 10, mono: true })])).toEqual([
      'text is below the text floor of 12 pixels: "a note", 11 pixels',
      'text is below the text floor of 11 pixels: "a count", 10 pixels',
    ]);
  });

  it('reports each kind of text once, however many of it there are', () => {
    const faint = text('a faint row', { colour: RULE_SOLID });
    expect(textFaults([faint, faint, faint])).toEqual(['text is below 4.5 to 1: "a faint row", 1.63 to 1 (and 2 more like it)']);
  });

  it('says so when the page reported no text', () => {
    expect(textFaults(null)).toEqual(['the page did not report its text']);
    expect(textFaults([])).toEqual(['the page did not report its text']);
  });
});
