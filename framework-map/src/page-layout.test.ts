import { describe, expect, it } from 'vitest';
import { constants as tuned } from './constants';
import type { Constants } from './constants';
import {
  barPxAt,
  cardRoomAt,
  clusterNamesFitAt,
  hasBar,
  namesFitFor,
  pageLayoutAt,
  phaseStripStackedAt,
  pictureMarginsAt,
  pictureRoomAt,
  railPxAt,
  restInsetsAt,
  toolNamesFitAt,
} from './page-layout';

/**
 * The sizes these tests stand on, spelled out: a size tuned by eye in src/constants.ts changes the
 * map, and not what the arithmetic is expected to make of these.
 */
const constants: Constants = {
  ...tuned,
  compactBelowPx: 1366,
  narrowBelowPx: 1024,
  uprightBelowPx: 480,
  railPx: 240,
  railIconsPx: 56,
  barRowPx: 52,
  crumbRowPx: 44,
  detailCardPx: 360,
  cardHeightShare: 0.45,
  insetTopPx: 76,
  insetRightPx: 40,
  insetBottomPx: 64,
  insetLeftPx: 512,
  underBarEdgePx: 16,
  underBarTopPx: 44,
  annotationTopPx: 88,
  nearInsetSidePx: 48,
  tierInsetRightPx: 260,
  phaseStripPx: 60,
  phaseStripSidePx: 16,
  phaseStripSideBySidePx: 624,
  phaseStripStackedPx: 16,
  phaseStripUnderBarPx: 80,
  legendSecondRowPx: 24,
  clusterRowPx: 19,
  clusterNameGapPx: 12,
  toolRowPx: 20,
  toolListMostRows: 20,
  toolListGapPx: 30,
  toolColumnGapPx: 40,
  listEdgePx: 24,
  toolIconPx: 14,
  toolPartGapPx: 7,
  toolNameLeastPx: 80,
  toolBadgeGapPx: 12,
  toolBadgeRoomPx: 60,
  leastPlateWidthPx: 320,
  leastPlateHeightPx: 96,
  leastCellHeightPx: 72,
};

const at = (width: number, height: number) => ({ width, height });
const shut = { card: false, strip: false };

describe('the page layout a window gets', () => {
  it('is the full layout at 1366 pixels and wider', () => {
    expect(pageLayoutAt(at(1366, 768), constants)).toBe('full');
    expect(pageLayoutAt(at(1920, 1080), constants)).toBe('full');
  });

  it('is the compact layout from 1024 pixels wide, whatever the height', () => {
    expect(pageLayoutAt(at(1280, 720), constants)).toBe('compact');
    expect(pageLayoutAt(at(1365, 768), constants)).toBe('compact');
    expect(pageLayoutAt(at(1024, 768), constants)).toBe('compact');
    expect(pageLayoutAt(at(1024, 1366), constants)).toBe('compact');
  });

  it('is the narrow layout below 1024 pixels, in a window wider than it is tall', () => {
    expect(pageLayoutAt(at(1023, 700), constants)).toBe('narrow');
    expect(pageLayoutAt(at(844, 390), constants)).toBe('narrow');
    expect(pageLayoutAt(at(640, 360), constants)).toBe('narrow');
    expect(pageLayoutAt(at(568, 320), constants)).toBe('narrow');
  });

  it('is the upright layout below 1024 pixels, in a window at least as tall as it is wide', () => {
    expect(pageLayoutAt(at(768, 1024), constants)).toBe('upright');
    expect(pageLayoutAt(at(390, 844), constants)).toBe('upright');
    expect(pageLayoutAt(at(360, 640), constants)).toBe('upright');
    expect(pageLayoutAt(at(700, 700), constants)).toBe('upright');
  });

  it('is the upright layout below 480 pixels, where a detail card at the side would be too narrow to read', () => {
    expect(pageLayoutAt(at(479, 320), constants)).toBe('upright');
    expect(pageLayoutAt(at(360, 300), constants)).toBe('upright');
  });

  it('has the bar in the narrow and the upright layout only', () => {
    expect(['full', 'compact', 'narrow', 'upright'].filter((layout) => hasBar(layout as 'full'))).toEqual(['narrow', 'upright']);
  });
});

describe('the room the rail and the bar take from the canvas', () => {
  it('is the whole rail at the left in the full layout, and its column of icons in the compact one', () => {
    expect(railPxAt(at(1366, 768), constants)).toBe(240);
    expect(railPxAt(at(1280, 720), constants)).toBe(56);
    expect(barPxAt(at(1366, 768), constants)).toBe(0);
    expect(barPxAt(at(1280, 720), constants)).toBe(0);
  });

  it('is one row at the top in the narrow layout, which holds the icons and the breadcrumb', () => {
    expect(railPxAt(at(844, 390), constants)).toBe(0);
    expect(barPxAt(at(844, 390), constants)).toBe(52);
  });

  it('is two rows at the top in the upright layout: the icons, and the breadcrumb under them', () => {
    expect(railPxAt(at(360, 640), constants)).toBe(0);
    expect(barPxAt(at(360, 640), constants)).toBe(96);
  });
});

describe('the room an open detail card takes', () => {
  it('is its width at the right in the full and the compact layout', () => {
    expect(cardRoomAt(at(1920, 1080), constants)).toEqual({ right: 360, bottom: 0 });
    expect(cardRoomAt(at(1024, 768), constants)).toEqual({ right: 360, bottom: 0 });
  });

  it('is at the right in the narrow layout, and never more than half the window', () => {
    expect(cardRoomAt(at(844, 390), constants)).toEqual({ right: 360, bottom: 0 });
    expect(cardRoomAt(at(640, 360), constants)).toEqual({ right: 320, bottom: 0 });
    expect(cardRoomAt(at(568, 320), constants)).toEqual({ right: 284, bottom: 0 });
  });

  it('is a little under half the height at the bottom in the upright layout', () => {
    expect(cardRoomAt(at(360, 640), constants)).toEqual({ right: 0, bottom: 288 });
    expect(cardRoomAt(at(768, 1024), constants)).toEqual({ right: 0, bottom: 461 });
  });
});

describe('the room the panels leave the picture', () => {
  it('runs from the rail to the window edge, or to an open detail card', () => {
    expect(pictureRoomAt(at(1280, 720), constants, shut)).toEqual({ left: 56, top: 0, right: 1280, bottom: 720 });
    expect(pictureRoomAt(at(1280, 720), constants, { card: true, strip: false })).toEqual({ left: 56, top: 0, right: 920, bottom: 720 });
    expect(pictureRoomAt(at(1366, 768), constants, { card: true, strip: false })).toEqual({ left: 240, top: 0, right: 1006, bottom: 768 });
  });

  it('ends above the phase strip, and above the second row the legend may take beside a detail card', () => {
    expect(pictureRoomAt(at(1280, 720), constants, { card: false, strip: true }).bottom).toBe(660);
    expect(pictureRoomAt(at(1280, 720), constants, { card: true, strip: true }).bottom).toBe(636);
  });

  it('starts under the bar in the narrow layout, and ends at a detail card at the right', () => {
    expect(pictureRoomAt(at(844, 390), constants, shut)).toEqual({ left: 0, top: 52, right: 844, bottom: 390 });
    expect(pictureRoomAt(at(844, 390), constants, { card: true, strip: false })).toEqual({ left: 0, top: 52, right: 484, bottom: 390 });
  });

  it('starts under the bar in the upright layout, and ends above a detail card at the bottom', () => {
    expect(pictureRoomAt(at(360, 640), constants, shut)).toEqual({ left: 0, top: 96, right: 360, bottom: 640 });
    expect(pictureRoomAt(at(360, 640), constants, { card: true, strip: false })).toEqual({ left: 0, top: 96, right: 360, bottom: 352 });
  });

  it('ends above the phase strip in the two layouts with the bar, where the strip stands over the card', () => {
    expect(pictureRoomAt(at(360, 640), constants, { card: false, strip: true }).bottom).toBe(560);
    expect(pictureRoomAt(at(360, 640), constants, { card: true, strip: true }).bottom).toBe(272);
    expect(pictureRoomAt(at(844, 390), constants, { card: true, strip: true }).bottom).toBe(310);
  });

  it('leaves the strip less room where its counts stand side by side, and more where they stand one over the other', () => {
    expect(pictureRoomAt(at(844, 390), constants, { card: false, strip: true }).bottom).toBe(326);
    expect(pictureRoomAt(at(768, 1024), constants, { card: false, strip: true }).bottom).toBe(960);
    expect(pictureRoomAt(at(1024, 768), constants, { card: true, strip: true }).bottom).toBe(668);
  });
});

describe('whether the two counts of a step of the phase strip stand one over the other', () => {
  it('never do at the sizes the map is designed for', () => {
    expect(phaseStripStackedAt(at(1366, 768), constants, true)).toBe(false);
    expect(phaseStripStackedAt(at(1280, 720), constants, true)).toBe(false);
    expect(phaseStripStackedAt(at(1920, 1080), constants, false)).toBe(false);
  });

  it('do beside an open detail card at the least width of the compact layout, where five steps have no room side by side', () => {
    expect(phaseStripStackedAt(at(1024, 768), constants, false)).toBe(false);
    expect(phaseStripStackedAt(at(1024, 768), constants, true)).toBe(true);
  });

  it('do on a phone, and beside the detail card of a phone on its side', () => {
    expect(phaseStripStackedAt(at(360, 640), constants, false)).toBe(true);
    expect(phaseStripStackedAt(at(390, 844), constants, true)).toBe(true);
    expect(phaseStripStackedAt(at(844, 390), constants, true)).toBe(true);
  });

  it('do not on a tablet held upright, or on a phone on its side with no card', () => {
    expect(phaseStripStackedAt(at(768, 1024), constants, true)).toBe(false);
    expect(phaseStripStackedAt(at(844, 390), constants, false)).toBe(false);
  });
});

describe('the margins the picture keeps inside its room', () => {
  it('are the settled ones at the stack distance in the full layout', () => {
    expect(restInsetsAt(at(1366, 768), constants)).toEqual({ top: 76, right: 40, bottom: 64, left: 512 });
  });

  it('give the stack at rest the room the rail gave up in the compact layout', () => {
    expect(restInsetsAt(at(1280, 720), constants)).toEqual({ top: 76, right: 40, bottom: 64, left: 328 });
  });

  it('are small in the two layouts with the bar, where no column of tier names stands beside the stack', () => {
    expect(restInsetsAt(at(360, 640), constants)).toEqual({ top: 140, right: 16, bottom: 16, left: 16 });
    expect(restInsetsAt(at(844, 390), constants)).toEqual({ top: 96, right: 16, bottom: 16, left: 16 });
  });

  it('are the settled ones close in, and small in the two layouts with the bar', () => {
    expect(pictureMarginsAt(at(1280, 720), constants)).toEqual({ top: 88, side: 48, bottom: 64 });
    expect(pictureMarginsAt(at(360, 640), constants)).toEqual({ top: 44, side: 16, bottom: 16 });
  });
});

describe('whether the names of a tier’s clusters have room above its plate', () => {
  it('always have, in the full and the compact layout', () => {
    expect(clusterNamesFitAt(at(1280, 720), constants, { card: true, strip: true }, 11)).toBe(true);
    expect(clusterNamesFitAt(at(1024, 768), constants, { card: true, strip: false }, 11)).toBe(true);
  });

  it('have none in a phone held upright, where the plate would be left a sliver beside them', () => {
    expect(clusterNamesFitAt(at(360, 640), constants, shut, 5)).toBe(false);
    expect(clusterNamesFitAt(at(390, 844), constants, shut, 11)).toBe(false);
  });

  it('have room in a tablet held upright, beside its open detail card too', () => {
    expect(clusterNamesFitAt(at(768, 1024), constants, shut, 11)).toBe(true);
    expect(clusterNamesFitAt(at(768, 1024), constants, { card: true, strip: false }, 11)).toBe(true);
  });

  it('have room in a phone on its side while few, and none once they are too many for its height', () => {
    expect(clusterNamesFitAt(at(844, 390), constants, shut, 5)).toBe(true);
    expect(clusterNamesFitAt(at(844, 390), constants, shut, 11)).toBe(false);
  });

  it('have none in a phone on its side beside an open detail card', () => {
    expect(clusterNamesFitAt(at(844, 390), constants, { card: true, strip: false }, 5)).toBe(false);
  });
});

describe('whether the names of a cluster’s tools have room above its cell', () => {
  it('always have, in the full and the compact layout', () => {
    expect(toolNamesFitAt(at(1280, 720), constants, { card: true, strip: true }, { columns: 3, rows: 19 })).toBe(true);
  });

  it('have room in a phone held upright while they are one short column', () => {
    expect(toolNamesFitAt(at(360, 640), constants, shut, { columns: 1, rows: 9 })).toBe(true);
  });

  it('have none in a phone held upright in two columns, or beside the rows of an open detail card', () => {
    expect(toolNamesFitAt(at(360, 640), constants, shut, { columns: 2, rows: 15 })).toBe(false);
    expect(toolNamesFitAt(at(360, 640), constants, { card: true, strip: false }, { columns: 1, rows: 9 })).toBe(false);
  });

  it('have room in a tablet held upright, in three columns', () => {
    expect(toolNamesFitAt(at(768, 1024), constants, shut, { columns: 3, rows: 19 })).toBe(true);
  });

  it('have none in a phone on its side once the list is taller than the window leaves', () => {
    expect(toolNamesFitAt(at(844, 390), constants, shut, { columns: 1, rows: 8 })).toBe(true);
    expect(toolNamesFitAt(at(844, 390), constants, shut, { columns: 1, rows: 16 })).toBe(false);
  });
});

describe('whether the names a distance calls for have room', () => {
  /** A graph in which every tier has eleven clusters and every cluster nine tools. */
  const index = { clustersOf: () => Array.from({ length: 11 }), toolsOf: () => Array.from({ length: 9 }) } as never;
  const state = (distance: 'stack' | 'tier' | 'cluster', selected = false) => ({
    distance,
    tier: distance === 'stack' ? null : 'T3',
    cluster: distance === 'cluster' ? '3A' : null,
    selection: selected ? { type: 'cluster' as const, id: '3A' } : null,
    lens: null,
  });

  it('is asked of the tier’s clusters at the tier distance', () => {
    expect(namesFitFor(state('tier'), index, at(768, 1024), constants)).toBe(true);
    expect(namesFitFor(state('tier'), index, at(360, 640), constants)).toBe(false);
  });

  it('is asked of the cluster’s tools at the cluster distance, with the detail card that may be open', () => {
    expect(namesFitFor(state('cluster'), index, at(360, 640), constants)).toBe(true);
    expect(namesFitFor(state('cluster', true), index, at(360, 640), constants)).toBe(false);
  });

  it('is yes at the stack distance, which calls for no such names, and in every layout without the bar', () => {
    expect(namesFitFor(state('stack'), index, at(360, 640), constants)).toBe(true);
    expect(namesFitFor(state('tier'), index, at(1280, 720), constants)).toBe(true);
  });
});
