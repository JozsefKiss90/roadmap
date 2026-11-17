/**
 * tokens: the colours and line widths the map draws with, by token name.
 *
 * Scene and label code reads every colour from MAP_TOKENS, so a dark skin can
 * be added by giving ROLES a second column. The values are copied from
 * references/style-guide.md (light skin); src/tokens.test.ts fails if a role or
 * a token here disagrees with the guide.
 */
import type { DecisionStep } from './display';

/** The guide's semantic roles the map uses, in the light skin. */
export const ROLES = {
  paper: '#f6f1e7',
  'paper-2': '#ece6d8',
  ink: '#14213d',
  muted: '#46557a',
  soft: '#55638a',
  rule: 'rgba(20,33,61,0.12)',
  'rule-solid': '#c4bfb1',
  accent: '#1f4fd8',
} as const;

export type Role = keyof typeof ROLES;

/** A line or outline: its colour role and its width in pixels on screen. */
export interface LineToken {
  line: Role;
  widthPx: number;
}

/** A ring around a mark: a line that stands a gap clear of it. */
export interface RingToken extends LineToken {
  gapPx: number;
}

/** The form of a mark in one decision-class step. A `null` fill lets the plate show through. */
export interface MarkToken {
  fill: Role | null;
  outline: Role | null;
  widthPx: number;
  dashed: boolean;
}

export const MAP_TOKENS = {
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
  'map-trace-line': { line: 'accent', widthPx: 1 },
  'map-text-name': { text: 'ink' },
  'map-text-tag': { text: 'muted' },
  'map-label-leader': { line: 'soft', widthPx: 1 },
} as const satisfies Record<string, { fill: Role } | { text: Role } | LineToken | RingToken | MarkToken>;

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

const RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;

/** A role's colour, split into an opaque colour and its alpha. */
export function colourOf(role: Role): Rgba {
  const value: string = ROLES[role];
  if (value.startsWith('#')) return { hex: value, alpha: 1 };
  const parts = RGBA.exec(value);
  if (!parts) throw new Error(`The role "${role}" has a colour the map cannot read: ${value}`);
  const hex = [parts[1], parts[2], parts[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('');
  return { hex: `#${hex}`, alpha: Number(parts[4]) };
}
