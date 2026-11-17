import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkMapContrast } from './contrast.ts';

/** A style guide holding the given semantic roles (light value only matters) and map tables. */
const guide = (options: { roles?: string[]; tokens?: string[]; rows?: string[] }): string =>
  [
    '### Semantic roles',
    '',
    '| Role | Purpose | Default (light) | Default (dark) |',
    '|---|---|---|---|',
    ...(options.roles ?? [
      '| `paper` | Page | `#ffffff` (white) | `#000000` |',
      '| `ink` | Text | `#000000` | `#ffffff` |',
      '| `pale` | Too light to read | `#eeeeee` | `#111111` |',
      '| `veil` | A tint | `rgba(0,0,0,0.5)` | `rgba(255,255,255,0.5)` |',
    ]),
    '',
    '### Map tokens',
    '',
    '| Token | Value | Use |',
    '|---|---|---|',
    ...(options.tokens ?? ['| `map-mark` | `ink`, `pale` or `veil` fill | A mark |']),
    '',
    '### Map contrast rows',
    '',
    '| Token | Colour | Sits on | Use | Minimum | Measured |',
    '|---|---|---|---|---|---|',
    ...(options.rows ?? ['| `map-mark` | `ink` | `paper` | non-text | 3:1 | 21.00:1 |']),
    '',
  ].join('\n');

describe('checkMapContrast', () => {
  it('measures a row against the surface it sits on and passes it', () => {
    const { rows, findings } = checkMapContrast(guide({}));

    expect(findings).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ token: 'map-mark', colour: 'ink', surface: 'paper', use: 'non-text', minimum: 3 });
    expect(rows[0]?.ratio).toBeCloseTo(21, 2);
  });

  /** The findings for a guide whose only contrast row is the given one. */
  const findingsFor = (row: string, tokens?: string[]): string[] => checkMapContrast(guide({ rows: [row], tokens })).findings;

  it('blends a colour drawn at an opacity over its surface before measuring', () => {
    // Black at 50% on white is the grey 127.5, unrounded. It sits between
    // #7f7f7f (4.00:1 on white) and #808080 (3.98:1), at 3.98:1.
    const { rows, findings } = checkMapContrast(
      guide({ rows: ['| `map-mark` | `ink @ 0.5` | `paper` | non-text | 3:1 | 3.98:1 |'] }),
    );

    expect(findings).toEqual([]);
    expect(rows[0]?.ratio).toBeCloseTo(3.98, 2);
    expect(rows[0]?.opacity).toBe(0.5);
  });

  it('blends a translucent semantic role the same way', () => {
    expect(findingsFor('| `map-mark` | `veil` | `paper` | non-text | 3:1 | 3.98:1 |')).toEqual([]);
  });

  it('reports a row that falls below the minimum for its use', () => {
    // #eeeeee on white is 1.16:1.
    expect(findingsFor('| `map-mark` | `pale` | `paper` | text | 4.5:1 | 1.16:1 |')).toEqual([
      '`map-mark` as text is 1.16:1 on `paper`, below 4.5:1',
    ]);
  });

  it('holds text to 4.5:1 where a mark would pass at 3:1', () => {
    expect(findingsFor('| `map-mark` | `veil` | `paper` | text | 4.5:1 | 3.98:1 |')).toEqual([
      '`map-mark` as text is 3.98:1 on `paper`, below 4.5:1',
    ]);
  });

  it.each(['decorative', 'exception'])('sets no minimum for a %s row', (use) => {
    expect(findingsFor(`| \`map-mark\` | \`pale\` | \`paper\` | ${use} | none | 1.16:1 |`)).toEqual([]);
  });

  it('reports a Minimum cell that disagrees with the contract for the row\'s use', () => {
    expect(findingsFor('| `map-mark` | `ink` | `paper` | text | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` on `paper` states a minimum of 3:1, but text needs 4.5:1',
    ]);
    expect(findingsFor('| `map-mark` | `ink` | `paper` | decorative | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` on `paper` states a minimum of 3:1, but decorative needs none',
    ]);
  });

  it('reports a Measured cell that disagrees with the ratio it computes', () => {
    expect(findingsFor('| `map-mark` | `ink` | `paper` | non-text | 3:1 | 12.00:1 |')).toEqual([
      '`map-mark` on `paper` is written as 12.00:1, but measures 21.00:1',
    ]);
  });

  it('reports a use the contract does not know', () => {
    expect(findingsFor('| `map-mark` | `ink` | `paper` | glow | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` on `paper` has the unknown use "glow"',
    ]);
  });

  it('reports a colour or surface that is not a semantic role', () => {
    expect(findingsFor('| `map-mark` | `inc` | `paper` | non-text | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` takes its colour from `inc`, which is not a semantic role',
    ]);
    expect(findingsFor('| `map-mark` | `ink` | `plate` | non-text | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` sits on `plate`, which is not a semantic role',
    ]);
  });

  it('reports an opacity that is not a number from 0 to 1', () => {
    expect(findingsFor('| `map-mark` | `ink @ 12%` | `paper` | non-text | 3:1 | 21.00:1 |')).toEqual([
      '`map-mark` has the opacity "12%", which is not a number from 0 to 1',
    ]);
  });

  it('reports a map token that has no contrast row', () => {
    expect(
      findingsFor('| `map-mark` | `ink` | `paper` | non-text | 3:1 | 21.00:1 |', [
        '| `map-mark` | `ink` fill | A mark |',
        '| `map-ring` | `ink` ring | Hover |',
      ]),
    ).toEqual(['`map-ring` is a map token with no contrast row']);
  });

  it('reports a contrast row for a token the map section does not define', () => {
    expect(findingsFor('| `map-halo` | `ink` | `paper` | non-text | 3:1 | 21.00:1 |')).toEqual([
      '`map-halo` has a contrast row but is not in the Map tokens table',
      '`map-mark` is a map token with no contrast row',
    ]);
  });

  it('reports a guide with a table missing or empty', () => {
    const whole = guide({});
    expect(checkMapContrast(whole.replace('### Map contrast rows', '### Other')).findings).toEqual([
      'the style guide has no "### Map contrast rows" table',
    ]);
    expect(checkMapContrast(whole.replace('### Map tokens', '### Other')).findings).toEqual([
      'the style guide has no "### Map tokens" table',
    ]);
    expect(checkMapContrast(guide({ rows: [], tokens: [] })).findings).toEqual([
      'the "### Map tokens" table has no rows',
      'the "### Map contrast rows" table has no rows',
    ]);
    expect(checkMapContrast(guide({ roles: [] })).findings).toEqual([
      'the "### Semantic roles" table has no opaque `paper` to measure against',
    ]);
  });

  it('reports a contrast row whose colour the token does not take in the Map tokens table', () => {
    expect(
      findingsFor('| `map-mark` | `pale` | `paper` | decorative | none | 1.16:1 |', ['| `map-mark` | `ink` fill | A mark |']),
    ).toEqual([
      '`map-mark` has a contrast row for `pale`, but its value in the Map tokens table does not name `pale`',
    ]);
  });

  it.each(['0x1', '1e-1', '.', '0.5 @ 0.5'])('reports the opacity "%s"', (opacity) => {
    expect(findingsFor(`| \`map-mark\` | \`ink @ ${opacity}\` | \`paper\` | non-text | 3:1 | 21.00:1 |`)).toEqual([
      `\`map-mark\` has the opacity "${opacity}", which is not a number from 0 to 1`,
    ]);
  });

  it('reports a table whose columns are not the ones it reads', () => {
    const whole = guide({});
    expect(
      checkMapContrast(whole.replace('| Token | Colour | Sits on |', '| Token | Sits on | Colour |')).findings,
    ).toEqual(['the "### Map contrast rows" table must have the columns Token | Colour | Sits on | Use | Minimum | Measured']);
    expect(
      checkMapContrast(whole.replace('| Default (light) | Default (dark) |', '| Default (dark) | Default (light) |'))
        .findings,
    ).toEqual(['the "### Semantic roles" table must have its light values in the third column']);
  });

  it('reports a table with no rule under its header, so that no row is taken for the rule', () => {
    const whole = guide({}).replace(/\|---\|---\|---\|---\|---\|---\|\n/, '');
    expect(checkMapContrast(whole).findings).toEqual([
      'the "### Map contrast rows" table must have the columns Token | Colour | Sits on | Use | Minimum | Measured',
    ]);
  });

  describe('on the real style guide', () => {
    const { rows, findings } = checkMapContrast(
      readFileSync(new URL('../../references/style-guide.md', import.meta.url), 'utf8'),
    );

    it('finds no fault in the map section', () => {
      expect(findings).toEqual([]);
    });

    it('measures the four decision-class steps and the four states', () => {
      const measured = new Set(rows.map((row) => row.token));
      for (const token of [
        'map-mark-committed',
        'map-mark-planned',
        'map-mark-optional',
        'map-mark-guarded',
        'map-hover-ring',
        'map-selected-fill',
        'map-focus-outline',
        'map-faded',
      ]) {
        expect(measured, token).toContain(token);
      }
    });

    it('holds every mark on a plate to 3:1, except the faded one', () => {
      const short = rows.filter((row) => row.token.startsWith('map-mark-') && row.ratio < 3);
      expect(short).toEqual([]);
      expect(rows.filter((row) => row.use === 'exception').map((row) => row.token)).toEqual(['map-faded']);
    });

    it('lets only the plate and the cell line go unmeasured as decorative', () => {
      expect(rows.filter((row) => row.use === 'decorative').map((row) => row.token)).toEqual([
        'map-plate-fill',
        'map-plate-edge',
        'map-cell-line',
      ]);
    });
  });
});
