/**
 * tokens: the colours and line widths the map draws with, by token name.
 *
 * The map has two skins, light and dark, and is drawn in the dark one. Each
 * skin has a column of roles and a table of tokens that name them. Scene and
 * label code reads every colour from MAP_TOKENS, the tokens of the skin the
 * map is drawn in, and never from a skin by name.
 *
 * The values are copied from references/style-guide.md: the light roles from
 * its "Semantic roles" table, the dark ones from "Map roles, dark skin", and
 * the tokens from "Map tokens". src/tokens.test.ts fails if a role or a token
 * here disagrees with the guide, or if src/styles.css gives a role of the
 * map's skin another colour.
 */
import type { DecisionStep } from './display';

/** The semantic roles each skin of the map reads, with their colours. */
export const ROLES = {
  light: {
    paper: '#f6f1e7',
    'paper-2': '#ece6d8',
    ink: '#14213d',
    muted: '#46557a',
    soft: '#55638a',
    rule: 'rgba(20,33,61,0.12)',
    'rule-solid': '#c4bfb1',
    accent: '#1f4fd8',
  },
  dark: {
    paper: '#0B0B0C',
    'paper-2': '#202024',
    'paper-3': '#0E0E10',
    ink: '#E6E2DA',
    'ink-strong': '#0B0B0C',
    muted: '#9C9890',
    soft: '#9C9890',
    rule: '#26262A',
    'rule-solid': '#3C3C44',
    edge: '#FFFFFF',
    accent: '#4DF0B4',
    count: '#F5C842',
    'class-committed': 'rgba(0, 238, 27, 0.9)',
    'class-planned': 'rgba(51, 202, 255, 0.9)',
    'class-optional': '#A49BC4',
    'class-guarded': 'rgba(255, 83, 124, 1)',
  },
} as const;

export type Skin = keyof typeof ROLES;

/** The skin the map is drawn in. src/styles.css carries the same skin's values. */
export const SKIN = 'dark' satisfies Skin;

/** A role of the skin the map is drawn in. */
export type Role = keyof (typeof ROLES)[typeof SKIN];
type LightRole = keyof (typeof ROLES)['light'];

/** A line or outline: its colour role and its width in pixels on screen. */
export interface LineToken<R extends string = Role> {
  line: R;
  widthPx: number;
}

/** A ring around a mark: a line that stands a gap clear of it. */
export interface RingToken<R extends string = Role> extends LineToken<R> {
  gapPx: number;
  /** The fill the mark takes under the ring, in a skin where the ring alone is too small to find. */
  fill?: R;
}

/** The leader of a label. The hover label has a leader in a skin that gives it a colour here. */
export interface LeaderToken<R extends string = Role> extends LineToken<R> {
  hoverLine?: R;
}

/** The underside of a plate: its fill, and how far under the plate's face it is drawn, in pixels on screen. */
export interface SideToken<R extends string = Role> {
  fill: R;
  depthPx: number;
}

/** The form of a mark in one decision-class step. A `null` fill lets the plate show through. */
export interface MarkToken<R extends string = Role> {
  fill: R | null;
  outline: R | null;
  widthPx: number;
  dashed: boolean;
}

/** A role's colour thinned to a part of its strength, as the guide writes `ink @ 0.12`. */
export interface TintToken<R extends string = Role> {
  tint: R;
  alpha: number;
}

type Token<R extends string> =
  | { fill: R }
  | { text: R }
  | LineToken<R>
  | RingToken<R>
  | LeaderToken<R>
  | SideToken<R>
  | MarkToken<R>
  | TintToken<R>;

/** The map tokens of each skin. A skin leaves out a token the guide gives it no value for. */
export const SKIN_TOKENS = {
  light: {
    'map-plate-fill': { fill: 'paper-2' },
    'map-plate-edge': { line: 'rule-solid', widthPx: 1 },
    'map-cell-line': { line: 'rule', widthPx: 1 },
    'map-mark-committed': { fill: 'ink', outline: null, widthPx: 0, dashed: false },
    'map-mark-planned': { fill: 'paper', outline: 'ink', widthPx: 2, dashed: false },
    'map-mark-optional': { fill: 'paper', outline: 'soft', widthPx: 1, dashed: false },
    'map-mark-guarded': { fill: null, outline: 'muted', widthPx: 1, dashed: true },
    'map-hover-ring': { line: 'ink', widthPx: 1, gapPx: 2 },
    'map-selected-fill': { fill: 'accent' },
    'map-selected-cell': { line: 'accent', widthPx: 2 },
    'map-bestfit-ring': { line: 'accent', widthPx: 2, gapPx: 2 },
    'map-home-cell': { line: 'accent', widthPx: 2 },
    'map-trace-line': { line: 'accent', widthPx: 1 },
    'map-trace-selected': { line: 'ink', widthPx: 2, gapPx: 2 },
    'map-faded': { tint: 'ink', alpha: 0.12 },
    'map-text-name': { text: 'ink' },
    'map-text-selected': { text: 'accent' },
    'map-text-tag': { text: 'muted' },
    'map-label-leader': { line: 'soft', widthPx: 1 },
  },
  dark: {
    'map-plate-fill': { fill: 'paper-2' },
    'map-plate-side': { fill: 'paper-3', depthPx: 7 },
    'map-plate-edge': { line: 'edge', widthPx: 1 },
    'map-cell-line': { line: 'edge', widthPx: 1 },
    'map-mark-committed': { fill: 'class-committed', outline: null, widthPx: 0, dashed: false },
    'map-mark-planned': { fill: null, outline: 'class-planned', widthPx: 2, dashed: false },
    'map-mark-optional': { fill: null, outline: 'class-optional', widthPx: 1, dashed: false },
    'map-mark-guarded': { fill: null, outline: 'class-guarded', widthPx: 1, dashed: true },
    'map-hover-ring': { line: 'accent', widthPx: 1, gapPx: 2, fill: 'accent' },
    'map-hover-cell': { line: 'accent', widthPx: 1 },
    'map-selected-fill': { fill: 'accent' },
    'map-selected-cell': { line: 'accent', widthPx: 2 },
    'map-bestfit-ring': { line: 'accent', widthPx: 2, gapPx: 2 },
    'map-home-cell': { line: 'accent', widthPx: 2 },
    'map-trace-line': { line: 'accent', widthPx: 1 },
    'map-trace-selected': { line: 'ink', widthPx: 2, gapPx: 2 },
    'map-faded': { tint: 'edge', alpha: 0.12 },
    'map-text-name': { text: 'ink' },
    'map-text-count': { text: 'count' },
    'map-text-selected': { text: 'accent' },
    'map-text-tag': { text: 'muted' },
    'map-label-leader': { line: 'muted', widthPx: 1, hoverLine: 'accent' },
  },
} as const satisfies { light: Record<string, Token<LightRole>>; dark: Record<string, Token<Role>> };

/** The tokens the map is drawn with: those of its skin. */
export const MAP_TOKENS = SKIN_TOKENS[SKIN];

/** The mark token of each decision-class step. */
export const MARK_TOKEN_OF_STEP: Readonly<Record<DecisionStep, MarkToken>> = {
  committed: MAP_TOKENS['map-mark-committed'],
  planned: MAP_TOKENS['map-mark-planned'],
  optional: MAP_TOKENS['map-mark-optional'],
  guarded: MAP_TOKENS['map-mark-guarded'],
};

/** The background the stack stands on. */
export const PAGE_ROLE: Role = 'paper';

export interface Rgba {
  /** As `#rrggbb`. */
  hex: string;
  /** 0 to 1. */
  alpha: number;
}

/** The colour a faded mark's coloured part turns to. */
export function fadedColour(): Rgba {
  const { tint, alpha } = MAP_TOKENS['map-faded'];
  return { hex: colourOf(tint).hex, alpha };
}

/**
 * The colour a part of a mark is drawn in. In the faded state a `paper` part
 * stays `paper` and any other turns to `map-faded` (the guide's "Map states").
 */
export function markPartColour(role: Role, faded: boolean): Rgba {
  return faded && role !== PAGE_ROLE ? fadedColour() : colourOf(role);
}

/** A colour as CSS reads it. */
export function cssOf({ hex, alpha }: Rgba): string {
  const channel = (at: number): number => parseInt(hex.slice(at, at + 2), 16);
  return alpha >= 1 ? hex : `rgba(${channel(1)}, ${channel(3)}, ${channel(5)}, ${alpha})`;
}

const RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;

/** A role's colour in the map's skin, split into an opaque colour and its alpha. */
export function colourOf(role: Role): Rgba {
  const value: string = ROLES[SKIN][role];
  if (value.startsWith('#')) return { hex: value, alpha: 1 };
  const parts = RGBA.exec(value);
  if (!parts) throw new Error(`The role "${role}" has a colour the map cannot read: ${value}`);
  const hex = [parts[1], parts[2], parts[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('');
  return { hex: `#${hex}`, alpha: Number(parts[4]) };
}
