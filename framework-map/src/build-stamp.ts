/**
 * build-stamp: what tells a partner how current their copy of the map is. The
 * map ships as one file (ADR 0003), so a partner can hold an old one.
 *
 * The stamp has two parts. The data date comes from the graph's metadata. The
 * build identifier comes from the commit the file was built from: the build
 * reads it (see vite.config.ts) and inlines it as `__BUILD_ID__`.
 */
import { element } from './dom';

/** What stands in for the commit when the build could not read one, as outside a git checkout. */
export const NO_COMMIT = 'no commit';

/**
 * The build identifier: the short commit. A build that holds changes its
 * commit does not ends in "+", so it is never taken for a build of that commit.
 * @param commit The short commit, or null where the build could read none.
 * @param changed Whether the map's sources differ from that commit.
 */
export function buildIdOf(commit: string | null, changed: boolean): string {
  if (!commit) return NO_COMMIT;
  return changed ? `${commit}+` : commit;
}

/** The identifier the dev server shows: it serves the sources as they stand, and builds nothing. */
export const DEV_BUILD = 'dev';

/** A build identifier in a sentence, for the text the stamp shows on hover. */
export function describeBuildId(buildId: string): string {
  if (buildId === DEV_BUILD) return 'Served by the dev server, not built.';
  if (buildId === NO_COMMIT) return 'The commit this file was built from is not known.';
  return buildId.endsWith('+')
    ? `Built from commit ${buildId.slice(0, -1)}, with changes that are not committed.`
    : `Built from commit ${buildId}.`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The data date as a partner reads it: "17 Nov 2026". It is read as text, not
 * as a moment in time, so no time zone can move it by a day. A value that is
 * not a date is shown as it stands.
 * @param generated The graph's `meta.generated`, as YYYY-MM-DD.
 */
export function showDataDate(generated: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(generated);
  if (!parts) return generated;
  const month = MONTHS[Number(parts[2]) - 1];
  const day = Number(parts[3]);
  if (!month || day < 1 || day > 31) return generated;
  return `${day} ${month} ${parts[1]}`;
}

/**
 * The build stamp as the page shows it: the data date over the build identifier.
 * @param generated The graph's `meta.generated`.
 * @param compact For the rail's column of icons, which is too narrow for the stamp's two lines. The
 *   names "Data" and "Build" are then for assistive technology only, and the year stands under the day.
 */
export function buildStamp(generated: string, buildId: string, compact = false): HTMLElement {
  const date = showDataDate(generated);
  // "17 Nov 2026" breaks before its year. A value that is not a date stays on one line.
  const year = compact ? /^(.+) (\d{4})$/.exec(date) : null;
  const row = (name: string, className: string, ...value: string[]): HTMLElement =>
    element(
      'div',
      null,
      element('dt', compact ? 'visually-hidden' : null, name),
      element('dd', className, ...value.map((line) => element('span', null, line))),
    );
  const stamp = element(
    'dl',
    compact ? 'build-stamp build-stamp-compact' : 'build-stamp',
    row('Data', 'build-stamp-date', ...(year ? [year[1]!, year[2]!] : [date])),
    row('Build', 'build-stamp-id', buildId),
  );
  stamp.title = `The framework data is of ${showDataDate(generated)}. ${describeBuildId(buildId)}`;
  return stamp;
}
