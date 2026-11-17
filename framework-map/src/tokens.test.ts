import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAP_TOKENS, ROLES, colourOf, cssOf, fadedColour, markPartColour } from './tokens';

const guide = readFileSync(new URL('../../references/style-guide.md', import.meta.url), 'utf8');

/** The rows of the table under a heading, keyed by the name in their first cell. */
function tableUnder(heading: string): Map<string, string[]> {
  const start = guide.indexOf(`### ${heading}`);
  if (start < 0) throw new Error(`The style guide has no "${heading}" section`);
  const rows = new Map<string, string[]>();
  let inTable = false;
  for (const line of guide.slice(start).split(/\r?\n/).slice(1)) {
    if (!line.startsWith('|')) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const name = /^`([^`]+)`$/.exec(cells[0] ?? '')?.[1];
    if (name) rows.set(name, cells);
  }
  return rows;
}

const namedIn = (cell: string): string[] => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');

describe('tokens', () => {
  it('gives every role the colour the style guide gives it in the light skin', () => {
    const roles = tableUnder('Semantic roles');
    for (const [role, colour] of Object.entries(ROLES)) {
      const light = roles.get(role)?.[2] ?? '';
      expect(namedIn(light)[0], `role ${role}`).toBe(colour);
    }
  });

  it('gives every map token the roles and the width its row in the style guide names', () => {
    const tokens = tableUnder('Map tokens');
    for (const [name, token] of Object.entries(MAP_TOKENS)) {
      const value = tokens.get(name)?.[1];
      expect(value, `the guide's row for ${name}`).toBeDefined();
      // A thinned role is written as the guide writes it: `ink @ 0.12`.
      const roles =
        'tint' in token
          ? [`${token.tint} @ ${token.alpha}`]
          : Object.values(token).filter((part): part is string => typeof part === 'string');
      expect(namedIn(value!).sort(), `roles of ${name}`).toEqual([...roles].sort());
      if ('widthPx' in token && token.widthPx > 0) expect(value, `width of ${name}`).toContain(`${token.widthPx}px`);
      if ('dashed' in token) expect(/dashed/.test(value!), `dash of ${name}`).toBe(token.dashed);
      if ('fill' in token && token.fill === null) expect(value).toMatch(/No fill/);
      if ('outline' in token && token.outline === null) expect(value).toMatch(/no outline/);
    }
  });

  it('turns every part of a faded mark but a paper one to map-faded', () => {
    expect(fadedColour()).toEqual({ hex: '#14213d', alpha: 0.12 });
    expect(markPartColour('soft', true)).toEqual(fadedColour());
    expect(markPartColour('paper', true)).toEqual({ hex: '#f6f1e7', alpha: 1 });
    expect(markPartColour('soft', false)).toEqual({ hex: '#55638a', alpha: 1 });
    expect(cssOf(fadedColour())).toBe('rgba(20, 33, 61, 0.12)');
    expect(cssOf(colourOf('ink'))).toBe('#14213d');
  });

  it('splits a translucent role into a colour and an alpha', () => {
    expect(colourOf('rule')).toEqual({ hex: '#14213d', alpha: 0.12 });
    expect(colourOf('ink')).toEqual({ hex: '#14213d', alpha: 1 });
  });
});
