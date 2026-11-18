import { describe, expect, it } from 'vitest';
import { buildIdOf, describeBuildId, showDataDate } from './build-stamp';

describe('the build identifier', () => {
  it('is the short commit for a build from a clean commit', () => {
    expect(buildIdOf('67c51f1', false)).toBe('67c51f1');
  });

  it('differs between two commits', () => {
    expect(buildIdOf('67c51f1', false)).not.toBe(buildIdOf('3f687ef', false));
  });

  it('is marked when the sources hold changes the commit does not', () => {
    expect(buildIdOf('67c51f1', true)).toBe('67c51f1+');
  });

  it('says so when the build could read no commit', () => {
    expect(buildIdOf(null, false)).toBe('no commit');
    expect(buildIdOf('', true)).toBe('no commit');
  });
});

describe('what the build identifier means, in words', () => {
  it('names the commit of a clean build', () => {
    expect(describeBuildId('67c51f1')).toBe('Built from commit 67c51f1.');
  });

  it('says that a marked build holds changes that are not committed', () => {
    expect(describeBuildId('67c51f1+')).toBe('Built from commit 67c51f1, with changes that are not committed.');
  });

  it('says that the commit is not known', () => {
    expect(describeBuildId('no commit')).toBe('The commit this file was built from is not known.');
  });

  it('says that the dev server is not a build', () => {
    expect(describeBuildId('dev')).toBe('Served by the dev server, not built.');
  });
});

describe('the data date', () => {
  it('is shown as day, month and year', () => {
    expect(showDataDate('2026-11-17')).toBe('17 Nov 2026');
    expect(showDataDate('2027-01-05')).toBe('5 Jan 2027');
  });

  it('is shown as it stands when it is not a date', () => {
    expect(showDataDate('last week')).toBe('last week');
    expect(showDataDate('2026-13-01')).toBe('2026-13-01');
  });
});
