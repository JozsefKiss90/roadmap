/**
 * The contrast check for the style guide's map section.
 *
 * The map has two skins, light and dark. For each, the guide has a table of
 * contrast rows that lists every map token of the skin with the colour it
 * takes, the surface it sits on and the use it has. This module measures each
 * row's WCAG 2.x contrast ratio with the skin's own roles and reports every
 * row that falls short of the contrast contract or that the table states
 * wrongly.
 *
 * The light skin takes its roles from the light values of the "Semantic
 * roles" table, whose rows are checked by the diagram-design plugin's own
 * script. The dark skin is the map's own and takes them from the "Map roles,
 * dark skin" table.
 */

type Rgb = readonly [number, number, number];
/** A colour value as the guide writes it: three channels and an alpha. */
type Rgba = { rgb: Rgb; alpha: number };

/** The contrast contract: the least ratio each use must reach, or null for no minimum. */
const MINIMUMS = {
  text: 4.5,
  'large-text': 3,
  'non-text': 3,
  decorative: null,
  exception: null,
} as const satisfies Record<string, number | null>;

export type ContrastUse = keyof typeof MINIMUMS;

export type SkinName = 'light' | 'dark';

export interface ContrastRow {
  skin: SkinName;
  /** The map token the row measures, or a semantic role of the skin measured on its own. */
  token: string;
  /** The semantic role the token takes its colour from, such as `ink`. */
  colour: string;
  /** The opacity the colour is drawn at; 1 when the row gives none. */
  opacity: number;
  /** The semantic role of the surface behind it. */
  surface: string;
  use: ContrastUse;
  ratio: number;
  minimum: number | null;
}

export interface ContrastResult {
  rows: ContrastRow[];
  findings: string[];
}

const TOKENS_HEADING = '### Map tokens';
const TOKENS_COLUMNS = ['Token', 'Light skin', 'Dark skin', 'Use'];
const ROWS_COLUMNS = ['Token', 'Colour', 'Sits on', 'Use', 'Minimum', 'Measured'];

/** Where the guide gives a skin's roles, its values of the map tokens and its contrast rows. */
interface SkinTables {
  name: SkinName;
  rolesHeading: string;
  /** The column of the roles table that holds the skin's values, counted from 0. */
  rolesColumn: number;
  /** The column of the Map tokens table that holds the skin's values. */
  tokensColumn: number;
  rowsHeading: string;
}

const SKINS: readonly SkinTables[] = [
  {
    name: 'light',
    rolesHeading: '### Semantic roles',
    rolesColumn: 2,
    tokensColumn: 1,
    rowsHeading: '### Map contrast rows',
  },
  {
    name: 'dark',
    rolesHeading: '### Map roles, dark skin',
    rolesColumn: 1,
    tokensColumn: 2,
    rowsHeading: '### Map contrast rows, dark skin',
  },
];

/** A column of a table as a reader counts it, by its place counted from 0. */
const COLUMN_NAMES = ['first', 'second', 'third', 'fourth'];

/** What the Map tokens table says of a token that a skin does not have. */
const NOT_IN_SKIN = /^none$/i;

const HEX = /#([0-9a-f]{6})\b/i;
const RGBA = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d*\.?\d+)\s*\)/i;
const OPACITY = /^(0|1|0?\.\d+|1\.0+)$/;
const RULE_CELL = /^:?-+:?$/;

/** The first hex or rgba() colour in a table cell, or null if it holds none. */
function parseColour(cell: string): Rgba | null {
  const hex = HEX.exec(cell);
  if (hex?.[1]) {
    const value = hex[1];
    const channel = (at: number): number => parseInt(value.slice(at, at + 2), 16);
    return { rgb: [channel(0), channel(2), channel(4)], alpha: 1 };
  }
  const rgba = RGBA.exec(cell);
  if (rgba) return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: Number(rgba[4]) };
  return null;
}

interface Table {
  header: string[];
  /** False when the line under the header is not the |---| rule, so a row would be taken for it. */
  ruled: boolean;
  body: string[][];
}

/** The first table under a heading, or null if the heading is absent or has no table. */
function tableUnder(markdown: string, heading: string): Table | null {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return null;
  const table: string[][] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      if (table.length > 0 || trimmed.startsWith('#')) break;
      continue;
    }
    table.push(
      trimmed
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
  }
  const [header, rule, ...body] = table;
  if (!header) return null;
  const ruled = rule !== undefined && rule.every((cell) => RULE_CELL.test(cell));
  return { header, ruled, body: ruled ? body : [] };
}

const hasColumns = (table: Table, columns: string[]): boolean =>
  table.ruled && columns.every((column, at) => table.header[at] === column);

/** Every name written in backticks in a cell, without any `@ opacity` that follows it. */
const namesIn = (cell: string): string[] =>
  [...cell.matchAll(/`([^`]*)`/g)].map((match) => (match[1] ?? '').split('@')[0]?.trim() ?? '');

/** The text inside a cell's first pair of backticks, or the whole cell if it has none. */
const quoted = (cell: string): string => /`([^`]*)`/.exec(cell)?.[1]?.trim() ?? cell.trim();

function channelLuminance(value: number): number {
  const fraction = value / 255;
  return fraction <= 0.04045 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return 0.2126 * channelLuminance(rgb[0]) + 0.7152 * channelLuminance(rgb[1]) + 0.0722 * channelLuminance(rgb[2]);
}

function contrast(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Flattens a translucent colour onto an opaque background. */
function composite(rgb: Rgb, alpha: number, background: Rgb): Rgb {
  const blend = (at: 0 | 1 | 2): number => rgb[at] * alpha + background[at] * (1 - alpha);
  return [blend(0), blend(1), blend(2)];
}

/** A ratio as the guide writes it, such as `12.84:1`. */
export const ratioText = (ratio: number): string => `${ratio.toFixed(2)}:1`;
/** A minimum as the guide writes it: `3:1`, `4.5:1` or `none`. */
export const minimumText = (minimum: number | null): string => (minimum === null ? 'none' : `${minimum}:1`);

const isUse = (use: string): use is ContrastUse => Object.hasOwn(MINIMUMS, use);

/** A skin's value of each of its semantic roles, by role name. */
function rolesOf(markdown: string, skin: SkinTables, findings: string[]): Map<string, Rgba> {
  const roles = new Map<string, Rgba>();
  const table = tableUnder(markdown, skin.rolesHeading);
  if (!table) return roles;
  if (!table.ruled || !new RegExp(skin.name, 'i').test(table.header[skin.rolesColumn] ?? '')) {
    findings.push(
      `the "${skin.rolesHeading}" table must have its ${skin.name} values in the ${COLUMN_NAMES[skin.rolesColumn]} column`,
    );
    return roles;
  }
  for (const cells of table.body) {
    const value = parseColour(cells[skin.rolesColumn] ?? '');
    if (value) roles.set(quoted(cells[0] ?? ''), value);
  }
  return roles;
}

/** The body of a map table, or a finding if the table is absent, empty or has other columns. */
function mapTable(markdown: string, heading: string, columns: string[], findings: string[]): string[][] {
  const table = tableUnder(markdown, heading);
  if (!table) findings.push(`the style guide has no "${heading}" table`);
  else if (!hasColumns(table, columns)) {
    findings.push(`the "${heading}" table must have the columns ${columns.join(' | ')}`);
  } else if (table.body.length === 0) findings.push(`the "${heading}" table has no rows`);
  else return table.body;
  return [];
}

/**
 * Measures every contrast row of one skin, with the skin's own roles.
 * @param tokenRows The body of the Map tokens table. It is empty if the table is at fault.
 */
function checkSkin(markdown: string, skin: SkinTables, tokenRows: string[][], rows: ContrastRow[], findings: string[]): void {
  const faultsBefore = findings.length;
  const roles = rolesOf(markdown, skin, findings);
  if (findings.length > faultsBefore) return;
  const paper = roles.get('paper');
  if (!paper || paper.alpha < 1) {
    findings.push(`the "${skin.rolesHeading}" table has no opaque \`paper\` to measure against`);
    return;
  }

  const contrastRows = mapTable(markdown, skin.rowsHeading, ROWS_COLUMNS, findings);
  if (tokenRows.length === 0 || contrastRows.length === 0) return;
  const fault = (finding: string): void => void findings.push(`${skin.name} skin: ${finding}`);

  /** The colours each map token of the skin is defined to take, by token name. */
  const defined = new Map(
    tokenRows
      .filter((cells) => !NOT_IN_SKIN.test(cells[skin.tokensColumn] ?? ''))
      .map((cells) => [quoted(cells[0] ?? ''), namesIn(cells[skin.tokensColumn] ?? '')]),
  );
  const covered = new Set<string>();

  for (const cells of contrastRows) {
    const token = quoted(cells[0] ?? '');
    const colourCell = quoted(cells[1] ?? '');
    const at = colourCell.indexOf('@');
    const colourName = (at < 0 ? colourCell : colourCell.slice(0, at)).trim();
    const opacityText = at < 0 ? null : colourCell.slice(at + 1).trim();
    const surfaceName = quoted(cells[2] ?? '');
    const use = cells[3] ?? '';
    const rowName = `\`${token}\` on \`${surfaceName}\``;

    covered.add(token);
    // A row may measure a role on its own, such as the text on a filled control.
    const measuresRole = !defined.has(token) && roles.has(token);
    const definedColours = defined.get(token);
    if (!definedColours && !measuresRole) fault(`\`${token}\` has a contrast row but is not in the Map tokens table`);

    const colour = roles.get(colourName);
    const surface = roles.get(surfaceName);
    const opacityIsValid = opacityText === null || OPACITY.test(opacityText);
    if (!colour) fault(`\`${token}\` takes its colour from \`${colourName}\`, which is not a semantic role`);
    else if (measuresRole && colourName !== token) {
      fault(`\`${token}\` is a semantic role, so its contrast row measures \`${token}\` and not \`${colourName}\``);
    } else if (definedColours && !definedColours.includes(colourName)) {
      fault(
        `\`${token}\` has a contrast row for \`${colourName}\`, but its value in the Map tokens table does not name \`${colourName}\``,
      );
    }
    if (!surface) fault(`\`${token}\` sits on \`${surfaceName}\`, which is not a semantic role`);
    if (!opacityIsValid) {
      fault(`\`${token}\` has the opacity "${opacityText}", which is not a number from 0 to 1`);
    }
    if (!isUse(use)) fault(`${rowName} has the unknown use "${use}"`);
    if (!colour || !surface || !opacityIsValid || !isUse(use)) continue;

    const opacity = opacityText === null ? 1 : Number(opacityText);
    const minimum = MINIMUMS[use];
    const background = composite(surface.rgb, surface.alpha, paper.rgb);
    const ratio = contrast(composite(colour.rgb, colour.alpha * opacity, background), background);
    rows.push({ skin: skin.name, token, colour: colourName, opacity, surface: surfaceName, use, ratio, minimum });

    const statedMinimum = cells[4] ?? '';
    if (statedMinimum !== minimumText(minimum)) {
      fault(`${rowName} states a minimum of ${statedMinimum}, but ${use} needs ${minimumText(minimum)}`);
    }
    const statedRatio = cells[5] ?? '';
    if (statedRatio !== ratioText(ratio)) {
      fault(`${rowName} is written as ${statedRatio}, but measures ${ratioText(ratio)}`);
    }
    if (minimum !== null && ratio < minimum) {
      fault(`\`${token}\` as ${use} is ${ratioText(ratio)} on \`${surfaceName}\`, below ${minimumText(minimum)}`);
    }
  }

  for (const token of defined.keys()) {
    if (!covered.has(token)) fault(`\`${token}\` is a map token with no contrast row`);
  }
}

/**
 * Measures every row of the guide's contrast tables, one for each skin of the
 * map. A finding is a row below its minimum, a row the table states wrongly,
 * or a map token of a skin with no row in that skin's table.
 */
export function checkMapContrast(markdown: string): ContrastResult {
  const rows: ContrastRow[] = [];
  const findings: string[] = [];
  const tokenRows = mapTable(markdown, TOKENS_HEADING, TOKENS_COLUMNS, findings);
  for (const skin of SKINS) checkSkin(markdown, skin, tokenRows, rows, findings);
  return { rows, findings };
}
