import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAP_TOKENS, ROLES, SKIN, SKIN_TOKENS, colourOf, cssOf, fadedColour, markPartColour } from './tokens';
import type { Skin } from './tokens';

const guide = readFileSync(new URL('../../references/style-guide.md', import.meta.url), 'utf8');
const stylesheet = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** The rows of the table under a heading, keyed by the name in their first cell. */
function tableUnder(heading: string): Map<string, string[]> {
  const start = guide.indexOf(`### ${heading}\n`);
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

/** Where the guide gives each skin: its table of roles with the column of its values, and its column of the Map tokens table. */
const IN_THE_GUIDE: Record<Skin, { roles: string; rolesColumn: number; tokensColumn: number }> = {
  light: { roles: 'Semantic roles', rolesColumn: 2, tokensColumn: 1 },
  dark: { roles: 'Map roles, dark skin', rolesColumn: 1, tokensColumn: 2 },
};
const SKINS = Object.keys(IN_THE_GUIDE) as Skin[];

describe('tokens', () => {
  it.each(SKINS)('gives every role of the %s skin the colour the style guide gives it', (skin) => {
    const { roles, rolesColumn } = IN_THE_GUIDE[skin];
    const inGuide = tableUnder(roles);
    for (const [role, colour] of Object.entries(ROLES[skin])) {
      const value = inGuide.get(role)?.[rolesColumn] ?? '';
      expect(namedIn(value)[0], `role ${role}`).toBe(colour);
    }
  });

  it('has every role the guide gives the dark skin', () => {
    expect(Object.keys(ROLES.dark).sort()).toEqual([...tableUnder('Map roles, dark skin').keys()].sort());
  });

  it.each(SKINS)('gives every map token of the %s skin the roles and the width its value in the style guide names', (skin) => {
    const tokens = tableUnder('Map tokens');
    for (const [name, token] of Object.entries(SKIN_TOKENS[skin])) {
      const value = tokens.get(name)?.[IN_THE_GUIDE[skin].tokensColumn];
      expect(value, `the guide's row for ${name}`).toBeDefined();
      // A thinned role is written as the guide writes it: `ink @ 0.12`.
      const roles =
        'tint' in token
          ? [`${token.tint} @ ${token.alpha}`]
          : Object.values(token).filter((part): part is string => typeof part === 'string');
      expect(namedIn(value!).sort(), `roles of ${name}`).toEqual([...roles].sort());
      for (const part of roles) if (!part.includes('@')) expect(ROLES[skin], `${part}, in ${name}`).toHaveProperty(part);
      if ('widthPx' in token && token.widthPx > 0) expect(value, `width of ${name}`).toContain(`${token.widthPx}px`);
      if ('depthPx' in token) expect(value, `depth of ${name}`).toContain(`${token.depthPx}px deep`);
      if ('dashed' in token) expect(/dashed/.test(value!), `dash of ${name}`).toBe(token.dashed);
      if ('fill' in token && token.fill === null) expect(value).toMatch(/No fill/);
      if ('outline' in token && token.outline === null) expect(value).toMatch(/no outline/);
    }
  });

  it.each(SKINS)('has no token the guide says the %s skin lacks', (skin) => {
    for (const [name, cells] of tableUnder('Map tokens')) {
      if (cells[IN_THE_GUIDE[skin].tokensColumn] === 'None') expect(SKIN_TOKENS[skin], name).not.toHaveProperty(name);
    }
  });

  it('draws the map in the dark skin, as the guide says', () => {
    expect(guide).toContain('The map has two skins. It is drawn in the dark one.');
    expect(SKIN).toBe('dark');
    expect(MAP_TOKENS).toBe(SKIN_TOKENS.dark);
  });

  it('gives the stylesheet every role of the skin the map is drawn in', () => {
    const root = /:root \{([^}]*)\}/.exec(stylesheet)?.[1] ?? '';
    for (const [role, colour] of Object.entries(ROLES[SKIN])) {
      expect(root, `--${role}`).toContain(`--${role}: ${colour};`);
    }
  });

  it('draws the dark skin with no fill but the committed one, and each step in a colour of its own', () => {
    expect(MAP_TOKENS['map-mark-committed']).toEqual({ fill: 'class-committed', outline: null, widthPx: 0, dashed: false });
    expect(MAP_TOKENS['map-mark-planned']).toEqual({ fill: null, outline: 'class-planned', widthPx: 2, dashed: false });
    expect(MAP_TOKENS['map-mark-optional']).toEqual({ fill: null, outline: 'class-optional', widthPx: 1, dashed: false });
    expect(MAP_TOKENS['map-mark-guarded']).toEqual({ fill: null, outline: 'class-guarded', widthPx: 1, dashed: true });
  });

  it('turns the class colour of a faded mark to map-faded', () => {
    expect(fadedColour()).toEqual({ hex: '#FFFFFF', alpha: 0.12 });
    expect(markPartColour('class-optional', true)).toEqual(fadedColour());
    expect(markPartColour('class-optional', false)).toEqual({ hex: '#A49BC4', alpha: 1 });
    expect(cssOf(fadedColour())).toBe('rgba(255, 255, 255, 0.12)');
    expect(cssOf(colourOf('ink'))).toBe('#E6E2DA');
  });

  it('splits a translucent role into a colour and an alpha', () => {
    expect(colourOf('class-committed')).toEqual({ hex: '#00ee1b', alpha: 0.9 });
    expect(colourOf('class-guarded')).toEqual({ hex: '#ff537c', alpha: 1 });
    expect(colourOf('ink')).toEqual({ hex: '#E6E2DA', alpha: 1 });
  });
});
