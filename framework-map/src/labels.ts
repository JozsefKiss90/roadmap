/**
 * labels: text in the scene, by distance.
 *
 * - Stack distance: each tier's name and tool count, in a column to the left
 *   of the stack, each at the height of its plate. Under the bar, in the
 *   narrow and the upright page layout, there is no room for the column:
 *   each tier's count stands over its plate, and the names are left out.
 * - Tier distance: the names of the focused tier's clusters, as a staircase
 *   above its plate. Each name stands on a leader line that rises from its
 *   cell's back left corner.
 * - Cluster distance: the names of the focused cluster's tools, as a list in
 *   columns above its cell, each with its kind icon and, where the tool is
 *   gated, a gate badge. The list is in the order the cell's grid is filled.
 *   A bracket runs along the cell's back edge, with a stem up to the list, to
 *   show which cell the list belongs to.
 *
 * Under the bar, the names of a tier's clusters and of a cluster's tools are
 * left out where they have no room (see src/page-layout.ts). No name is ever
 * drawn smaller to make it fit.
 *
 * Every label keeps its size on screen. A label is anchored to a point of the
 * stack and offset from it in pixels, so it follows its plate or cell as the
 * camera moves. The labels read the distance and focus from the state store,
 * and write to it when the partner clicks a name: a tier name goes to its
 * tier, and a cluster or tool name selects what it names.
 */
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import SpriteText from 'three-spritetext';
import { Text } from 'troika-three-text';
import toolNameFontUrl from '@fontsource/geist/files/geist-latin-500-normal.woff?url';
import clusterNameFontUrl from '@fontsource/geist/files/geist-latin-600-normal.woff?url';
import tierNameFontUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff?url';
import { FLAT_CORNERS, radians } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { gateBadge, kindIcon, tierCountText as countText } from './display';
import type { KindIcon } from './display';
import { drawKindIcon } from './icons';
import { listLayout, nameCap, staircaseRise } from './label-layout';
import type { PlateLayout, StackLayout } from './layout';
import { namesFitFor, openPanelsOf, pictureRoomAt, underBarAt } from './page-layout';
import type { Stage } from './scene';
import { narrows } from './state';
import type { MapState, Store } from './state';
import { MAP_TOKENS, colourOf } from './tokens';

/** The face the counts and badges are drawn in. main.ts loads it before any label is made. */
const TAG_FAMILY = 'Geist Mono';
const TAG_WEIGHT = '500';
export const TAG_FONT = `${TAG_WEIGHT} 1em "${TAG_FAMILY}"`;

/** How many canvas pixels a count, badge or icon is drawn with for each pixel it takes on screen. */
const OVERSAMPLING = 2;
/** Names stand above their plate or cell, so they are drawn over whatever lies behind them. */
const OVER_THE_STACK = 2;

/** A tier's count while a lens is on: the tools in reach on its plate, out of all it holds. */
const reachText = (tierId: string, inReach: number, tools: number): string =>
  `${tierId} · ${inReach} of ${tools} in reach`.toUpperCase();

/** A rectangle of the window, in pixels from its top left corner. */
export interface LabelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Labels {
  /** Resolves once every label of the current distance has been typeset and placed. */
  settled(): Promise<void>;
  /** The labels on screen now, one rectangle each. The screenshot script checks them. */
  rects(): LabelRect[];
}

/** A label: a group whose units are pixels on screen, anchored to a point of the stack. */
interface Label {
  group: Group;
  anchor: Vector3;
  /** From the anchor to the group's origin, in pixels to the right and up. */
  dx: number;
  dy: number;
  /** What the label covers, in pixels to the right of and above the group's origin. */
  box: { left: number; bottom: number; right: number; top: number };
  /** What a click on the label does. */
  action?: () => void;
}

/** A text material that is not hidden by plates. Every name shares it; troika derives its own from it. */
const overStackMaterial = new MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true });

/** What a typeset text covers, in pixels from its anchor: left, bottom, right, top. */
function blockOf(text: Text): [number, number, number, number] {
  return text.textRenderInfo?.blockBounds ?? [0, 0, 0, 0];
}

export function addLabels(
  stage: Stage,
  index: GraphIndex,
  layout: StackLayout,
  constants: Constants,
  store: Store,
): Labels {
  const nameColour = colourOf(MAP_TOKENS['map-text-name'].text).hex;
  const tagColour = colourOf(MAP_TOKENS['map-text-tag'].text).hex;
  const selectedColour = colourOf(MAP_TOKENS['map-text-selected'].text).hex;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const tagResolution = (sizePx: number): number => Math.round(sizePx * pixelRatio * OVERSAMPLING);

  const typeset = (text: Text): Promise<void> => new Promise((resolve) => text.sync(() => resolve()));

  function tag(text: string): SpriteText {
    const sprite = new SpriteText(text.toUpperCase(), constants.tagPx, tagColour);
    sprite.fontFace = TAG_FAMILY;
    sprite.fontWeight = TAG_WEIGHT;
    sprite.fontSize = tagResolution(constants.tagPx);
    return sprite;
  }

  // Stack distance: tier names and counts.
  const halfWidth = (layout.bounds.max.x - layout.bounds.min.x) / 2;
  const axis = {
    x: (layout.bounds.min.x + layout.bounds.max.x) / 2,
    z: (layout.bounds.min.z + layout.bounds.max.z) / 2,
  };
  const middle = new Vector3(axis.x, (layout.bounds.min.y + layout.bounds.max.y) / 2, axis.z);
  const pending: Promise<void>[] = [];
  /**
   * Each tier's name and count, with its label and how far its name reaches down and across, to set
   * them again for a lens, and to leave the names out where the plates stand too close for them.
   */
  const tierCounts: {
    tier: string;
    plate: PlateLayout;
    name: Text;
    count: SpriteText;
    label: Label;
    nameRight: number;
    nameBottom: number;
  }[] = [];
  const tierCountText = (tierId: string, lens: MapState['lens']): string =>
    narrows(lens)
      ? reachText(tierId, index.toolCountOf(tierId, lens), index.toolCountOf(tierId))
      : countText(tierId, index.toolCountOf(tierId));
  /** A tier with no tool in reach has its name in the colour of a tag, as its row in the outline is dimmed. */
  const tierNameColour = (tierId: string, lens: MapState['lens']) =>
    narrows(lens) && index.toolCountOf(tierId, lens) === 0 ? tagColour : nameColour;

  const tierLabels: Label[] = index.tiers.map((tier) => {
    const plate = layout.plates.find((candidate) => candidate.tier === tier.id);
    if (!plate) throw new Error(`The layout has no plate for the tier "${tier.id}".`);
    const group = new Group();

    const name = new Text();
    name.text = tier.label;
    name.font = tierNameFontUrl;
    name.fontSize = constants.tierNamePx;
    name.lineHeight = 1.2;
    name.maxWidth = constants.labelColumnPx;
    name.anchorX = 'left';
    name.anchorY = 'top';
    name.color = tierNameColour(tier.id, store.get().lens);
    group.add(name);

    const count = tag(tierCountText(tier.id, store.get().lens));
    count.center.set(0, 0);
    count.position.set(0, constants.countGapPx, 0);
    group.add(count);

    const label: Label = {
      group,
      anchor: new Vector3(axis.x, plate.y, axis.z),
      dx: 0,
      dy: constants.labelRisePx,
      box: { left: 0, bottom: 0, right: count.scale.x, top: constants.countGapPx + count.scale.y },
      action: () => store.focusTier(tier.id),
    };
    const counted = { tier: tier.id, plate, name, count, label, nameRight: 0, nameBottom: 0 };
    tierCounts.push(counted);
    pending.push(
      typeset(name).then(() => {
        const [, bottom, right] = blockOf(name);
        counted.nameBottom = bottom;
        counted.nameRight = right;
        boxTierLabels();
      }),
    );
    stage.add(group);
    return label;
  });

  // Tier distance: cluster names, one staircase for each tier.
  const leaderColour = colourOf(MAP_TOKENS['map-label-leader'].line);
  const leaderMaterial = new LineBasicMaterial({
    color: leaderColour.hex,
    transparent: true,
    opacity: leaderColour.alpha,
    depthTest: false,
  });
  const clusterLabels = new Map<string, Label[]>();
  for (const tier of index.tiers) {
    const cells = layout.cells.filter((cell) => cell.tier === tier.id).sort((a, b) => a.x - b.x);
    const labels = cells.map((cell, position) => {
      const cluster = index.cluster(cell.cluster);
      if (!cluster) throw new Error(`The layout places "${cell.cluster}", which is not a cluster in the graph.`);
      const rise = staircaseRise(position, cells.length, constants.clusterRowPx, constants.clusterNameGapPx);
      const group = new Group();
      group.visible = false;

      const name = new Text();
      name.text = cluster.label;
      name.font = clusterNameFontUrl;
      name.fontSize = constants.clusterNamePx;
      name.anchorX = 'left';
      name.anchorY = 'bottom';
      name.color = nameColour;
      name.material = overStackMaterial;
      name.renderOrder = OVER_THE_STACK;
      name.position.set(constants.clusterNameIndentPx, 0, 0);
      group.add(name);

      // The leader: from the cell's corner up the left side of the name.
      const leader = new BufferGeometry();
      leader.setAttribute(
        'position',
        new Float32BufferAttribute([0, -rise, 0, 0, constants.clusterNamePx + 1, 0], 3),
      );
      const leaderLine = new Line(leader, leaderMaterial);
      leaderLine.renderOrder = OVER_THE_STACK;
      group.add(leaderLine);

      const label: Label = {
        group,
        anchor: new Vector3(cell.x - cell.width / 2, cell.y, cell.z - cell.depth / 2),
        dx: 0,
        dy: rise,
        box: { left: 0, bottom: 0, right: 0, top: constants.clusterRowPx },
        action: () => store.select(cluster.id),
      };
      pending.push(
        typeset(name).then(() => {
          label.box.right = constants.clusterNameIndentPx + blockOf(name)[2];
        }),
      );
      stage.add(group);
      return label;
    });
    clusterLabels.set(tier.id, labels);
  }

  // Cluster distance: tool names. They are made when a cluster is focused and thrown away after.
  const iconTextures = new Map<KindIcon, CanvasTexture>();
  function iconMaterial(icon: KindIcon): SpriteMaterial {
    let texture = iconTextures.get(icon);
    if (!texture) {
      texture = new CanvasTexture(drawKindIcon(icon, tagResolution(constants.toolIconPx), tagColour));
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      iconTextures.set(icon, texture);
    }
    return new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  }

  // The bracket under the list: the focused cell's back edge, and a stem from its middle up to the list.
  const bracketCorners = new Float32BufferAttribute(new Float32Array(12), 3);
  const bracket = new LineSegments(new BufferGeometry().setAttribute('position', bracketCorners), leaderMaterial);
  bracket.renderOrder = OVER_THE_STACK;
  bracket.frustumCulled = false;
  bracket.visible = false;
  stage.add(bracket);
  let bracketEnds: [Vector3, Vector3] | null = null;

  /** Whether the tier names are left out, because the plates stand too close on screen for them. */
  let tierNamesOut = false;
  /** Whether each tier's count stands over its plate, as under the bar, and not in the column beside the stack. */
  let countsOverPlates = false;
  /** Whether the counts over the plates are left out as well, because the plates stand closer on screen than a count is tall. */
  let tierCountsOut = false;

  /** Whether the window's page layout has the bar: the narrow or the upright one. */
  const underBar = (): boolean => underBarAt(stage.window, constants);
  const corner = new Vector3();

  /**
   * Sets what each tier label covers: its count, and its name unless the names are left out.
   * A count on its own stands level with the middle of its plate, where the name would begin.
   */
  function boxTierLabels(): void {
    for (const { name, count, label, nameRight, nameBottom } of tierCounts) {
      // Under the bar a count stands over its plate, close under the plate above, and is drawn over both.
      // In the column beside the stack it is part of the scene, as it was.
      count.material.depthTest = !countsOverPlates;
      count.material.depthWrite = !countsOverPlates;
      count.renderOrder = countsOverPlates ? OVER_THE_STACK : 0;
      name.visible = !tierNamesOut;
      label.dy = tierNamesOut ? -(constants.countGapPx + count.scale.y / 2) : constants.labelRisePx;
      label.box.bottom = tierNamesOut ? constants.countGapPx : nameBottom;
      label.box.right = tierNamesOut ? count.scale.x : Math.max(count.scale.x, nameRight);
    }
  }

  /** Sets each tier's count for the lens: the tools in reach on its plate, or all of its tools with no lens. */
  function showTierCounts(lens: MapState['lens']): void {
    for (const { tier, name, count } of tierCounts) {
      name.color = tierNameColour(tier, lens);
      count.text = tierCountText(tier, lens);
    }
    boxTierLabels();
  }

  let toolLabels: Label[] = [];
  /** The names in the list, by tool, so that the selected one can be told apart. */
  let toolNames = new Map<string, Text>();

  /**
   * Gives the selected tool's name its colour, a name the lens or the filters
   * leave out the colour of a tag, and every other name the colour of a name.
   */
  function showSelectedName(): void {
    const state = store.get();
    const selected = state.selection?.type === 'tool' ? state.selection.id : null;
    const emphasised = index.emphasised(state);
    for (const [tool, name] of toolNames) {
      name.color = tool === selected ? selectedColour : emphasised.has(tool) ? nameColour : tagColour;
    }
  }

  let toolsShown: string | null = null;
  /** The room the list was last set in, and whether any name had to be cut to fit it. */
  let toolsRoom = 0;
  let toolsCut = false;
  let toolsNaturalWidth = 0;

  /** The room for the list of tool names: between the rail and the window's edge, or the open detail card at the right. */
  const listRoom = (): number => {
    const room = pictureRoomAt(stage.window, constants, openPanelsOf(store.get()));
    return room.right - room.left - 2 * constants.listEdgePx;
  };

  /** Whether the window has room for the names a state's distance calls for. */
  const namesFit = (state: MapState): boolean => namesFitFor(state, index, stage.window, constants);

  /** A name cut to about a part of its length, with an ellipsis. */
  const cut = (label: string, part: number): string => {
    // By whole characters, so that none is split.
    const letters = Array.from(label);
    return `${letters.slice(0, Math.max(1, Math.floor(letters.length * part) - 1)).join('').trimEnd()}…`;
  };
  let disposeTools: (() => void)[] = [];
  let toolsReady: Promise<void> = Promise.resolve();

  function clearToolLabels(): void {
    for (const label of toolLabels) stage.remove(label.group);
    for (const dispose of disposeTools) dispose();
    toolLabels = [];
    toolNames = new Map();
    disposeTools = [];
    toolsShown = null;
    bracket.visible = false;
    bracketEnds = null;
  }

  function showToolLabels(clusterId: string): void {
    clearToolLabels();
    toolsShown = clusterId;
    const cell = layout.cells.find((candidate) => candidate.cluster === clusterId);
    if (!cell) return;
    const anchor = new Vector3(cell.x, cell.y, cell.z - cell.depth / 2);
    const nameLeft = constants.toolIconPx + constants.toolPartGapPx;

    // The layout lists a cell's marks in the order its grid is filled.
    const rows = layout.marks
      .filter((mark) => mark.cluster === clusterId)
      .map((mark) => {
        const tool = index.tool(mark.tool);
        if (!tool) throw new Error(`The layout places "${mark.tool}", which is not a tool in the graph.`);
        const group = new Group();
        group.visible = false;

        const icon = new Sprite(iconMaterial(kindIcon(index.kindFamilyOf(tool.kind))));
        icon.scale.set(constants.toolIconPx, constants.toolIconPx, 1);
        icon.center.set(0, 0.5);
        icon.renderOrder = OVER_THE_STACK;
        group.add(icon);
        disposeTools.push(() => icon.material.dispose());

        const name = new Text();
        name.text = tool.label;
        name.font = toolNameFontUrl;
        name.fontSize = constants.toolNamePx;
        name.anchorX = 'left';
        name.anchorY = 'middle';
        name.color = nameColour;
        name.material = overStackMaterial;
        name.renderOrder = OVER_THE_STACK;
        name.position.set(nameLeft, 0, 0);
        group.add(name);
        disposeTools.push(() => name.dispose());

        const word = gateBadge(index.gateFamilyOf(tool.gate));
        let badge: SpriteText | null = null;
        if (word) {
          badge = tag(word);
          badge.borderWidth = 1;
          badge.borderColor = tagColour;
          badge.borderRadius = 3;
          badge.padding = [4, 1.5];
          badge.center.set(0, 0.5);
          badge.material.depthTest = false;
          badge.material.depthWrite = false;
          badge.renderOrder = OVER_THE_STACK;
          group.add(badge);
          const made = badge;
          disposeTools.push(() => {
            made.material.map?.dispose();
            made.material.dispose();
          });
        }
        stage.add(group);
        return { group, name, badge, tool: tool.id };
      });

    const labels: Label[] = rows.map(({ group, tool }) => ({
      group,
      anchor,
      dx: 0,
      dy: 0,
      box: { left: 0, bottom: -constants.toolRowPx / 2, right: 0, top: constants.toolRowPx / 2 },
      action: () => store.select(tool),
    }));
    toolLabels = labels;
    toolNames = new Map(rows.map(({ tool, name }) => [tool, name]));
    showSelectedName();

    const room = listRoom();
    toolsRoom = room;
    toolsCut = false;
    // Not known until the names are typeset; the room is looked at again then.
    toolsNaturalWidth = 0;
    /** What each row holds beside its name: the icon, and the badge with its gap. */
    const extras = rows.map(({ badge }) => nameLeft + (badge ? constants.toolBadgeGapPx + badge.scale.x : 0));

    /**
     * Cuts the longest names short where the list is wider than its room. A cut
     * is by letters, so it is measured again and cut again if it is still too wide.
     */
    async function fitNames(): Promise<void> {
      await Promise.all(rows.map(({ name }) => typeset(name)));
      if (toolLabels !== labels) return;
      toolsNaturalWidth = listLayout(
        rows.map(({ name }, i) => blockOf(name)[2] + extras[i]!),
        constants.toolListMostRows,
        constants.toolRowPx,
        constants.toolColumnGapPx,
      ).width;
      for (let pass = 0; pass < 4 && toolLabels === labels; pass += 1) {
        const names = rows.map(({ name }) => blockOf(name)[2]);
        const cap = nameCap(names, extras, constants.toolListMostRows, constants.toolColumnGapPx, room, constants.toolNameLeastPx);
        const tooLong = rows.filter((_row, i) => names[i]! > cap + 0.5);
        if (tooLong.length === 0) return;
        toolsCut = true;
        // Only a name whose text has changed is typeset again; any other would never report back.
        await Promise.all(
          tooLong.map(({ name }) => {
            const shorter = cut(name.text, cap / blockOf(name)[2]);
            if (shorter === name.text) return undefined;
            name.text = shorter;
            return typeset(name);
          }),
        );
      }
    }

    // A name thrown away while it is being typeset never reports back, so a list that is
    // cleared counts as done.
    const cleared = new Promise<void>((resolve) => disposeTools.push(resolve));
    toolsReady = Promise.race([fitNames(), cleared]).then(() => {
      // The partner may have moved on while the names were being typeset.
      if (toolLabels !== labels) return;
      // The room may have changed while the names were being typeset: the list is then set again.
      if (!listSuitsRoom()) {
        showToolLabels(clusterId);
        return;
      }
      const widths = rows.map(({ name }, i) => blockOf(name)[2] + extras[i]!);
      const list = listLayout(widths, constants.toolListMostRows, constants.toolRowPx, constants.toolColumnGapPx);
      // The badges of a column start on one line, set by the widest badge in it.
      const widestBadgeAt = new Map<number, number>();
      rows.forEach(({ badge }, i) => {
        const x = list.slots[i]!.x;
        if (badge) widestBadgeAt.set(x, Math.max(widestBadgeAt.get(x) ?? 0, badge.scale.x));
      });
      labels.forEach((label, i) => {
        const slot = list.slots[i]!;
        const columnWidth = list.columnWidths[i]!;
        label.dx = slot.x - list.width / 2;
        label.dy = constants.toolListGapPx + list.height - slot.y - constants.toolRowPx / 2;
        const badge = rows[i]!.badge;
        if (badge) badge.position.set(columnWidth - (widestBadgeAt.get(slot.x) ?? 0), 0, 0);
        label.box.right = badge ? columnWidth - (widestBadgeAt.get(slot.x) ?? 0) + badge.scale.x : widths[i]!;
        label.group.visible = true;
      });
      bracketEnds = [
        new Vector3(cell.x - cell.width / 2, cell.y, cell.z - cell.depth / 2),
        new Vector3(cell.x + cell.width / 2, cell.y, cell.z - cell.depth / 2),
      ];
      bracket.visible = true;
      place();
    });
  }

  /**
   * Whether the list on show is still right for its room. The room changes when
   * the detail card opens or closes and when the window does. The list is set
   * again where names were cut for a room that has changed, or now need to be.
   */
  const listSuitsRoom = (): boolean => {
    const room = listRoom();
    return room === toolsRoom || (!toolsCut && toolsNaturalWidth <= room);
  };

  /** The labels on screen for the current state. */
  function shown(): Label[] {
    const state = store.get();
    const labels =
      state.distance === 'stack' ? tierLabels : state.distance === 'tier' ? (clusterLabels.get(state.tier ?? '') ?? []) : toolLabels;
    return labels.filter((label) => label.group.visible);
  }

  /**
   * Puts on screen the names a state's distance calls for. The window is asked each time, so a
   * window that changes size or is turned gets the names it now has room for.
   */
  function show(state: MapState): void {
    for (const label of tierLabels) label.group.visible = state.distance === 'stack';
    for (const [tier, labels] of clusterLabels) {
      const on = state.distance === 'tier' && state.tier === tier && namesFit(state);
      for (const label of labels) label.group.visible = on;
    }
    if (state.distance !== 'cluster' || !state.cluster || !namesFit(state)) clearToolLabels();
    else if (toolsShown !== state.cluster || !listSuitsRoom()) showToolLabels(state.cluster);
    showSelectedName();
    place();
  }

  const right = new Vector3();
  const up = new Vector3();
  const forward = new Vector3();
  const fromCamera = new Vector3();
  function place(): void {
    const { camera, frame } = stage;
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    camera.getWorldDirection(forward);
    const tanHalfField = Math.tan(radians(camera.fov) / 2);
    const unitsPerPixelAt = (point: Vector3): number =>
      (2 * fromCamera.copy(point).sub(camera.position).dot(forward) * tanHalfField) / frame.height;

    // The tier column's distance from the axis is set in pixels, measured at
    // the middle of the stack, so every tier label starts at the same place
    // across the screen.
    const columnReachPx = halfWidth / unitsPerPixelAt(middle) + constants.labelGapPx + constants.labelColumnPx;
    for (const label of tierLabels) label.dx = -columnReachPx;

    // Where the stack stands back, as it does beside a need's detail card in a narrow window, the
    // plates come closer on screen than a name is tall. The names are then left out, and each
    // tier keeps its count, which begins with the tier's code. Under the bar there is no room for
    // the column at all: the names are left out, and each count stands over its plate.
    const over = underBar();
    const heights = tierCounts.map(({ label }) => stage.toPicture(label.anchor).y);
    const out =
      over ||
      tierCounts.some(
        ({ label, nameBottom }, at) => at > 0 && heights[at]! - heights[at - 1]! < label.box.top - nameBottom + constants.tierLabelGapPx,
      );
    if (out !== tierNamesOut || over !== countsOverPlates) {
      tierNamesOut = out;
      countsOverPlates = over;
      boxTierLabels();
    }
    tierCountsOut = false;
    if (over) {
      // A count begins at the left end of what its plate covers in the picture, and stands a little over its highest point.
      for (const { plate, label } of tierCounts) {
        const anchor = stage.toPicture(label.anchor);
        let left = Infinity;
        let top = Infinity;
        for (const [alongX, alongZ] of FLAT_CORNERS) {
          const at = stage.toPicture(
            corner.set(plate.x + (alongX * plate.width) / 2, plate.y, plate.z + (alongZ * plate.depth) / 2),
          );
          left = Math.min(left, at.x);
          top = Math.min(top, at.y);
        }
        label.dx = left - anchor.x;
        label.dy = anchor.y - top + constants.countOverPlatePx - constants.countGapPx;
      }
      // Beside a detail card and the phase strip a phone leaves the stack so little room that a count
      // would lie on the plate over its own. The counts are then left out too; the outline counts each
      // tier. The room is measured as it is with the stack face on, so turning the stack hides no count.
      const countPx = (tierCounts[0]?.count.scale.y ?? 0) + constants.countOverPlatePx;
      tierCountsOut = tierCounts.some(({ plate, label }, at) => {
        if (at === 0) return false;
        const deepPx = (plate.depth * Math.abs(forward.y)) / unitsPerPixelAt(label.anchor);
        return Math.abs(heights[at]! - heights[at - 1]!) - deepPx < countPx;
      });
    }
    const atStack = store.get().distance === 'stack';
    for (const label of tierLabels) label.group.visible = atStack && !tierCountsOut;

    for (const { group, anchor, dx, dy } of shown()) {
      const unitsPerPixel = unitsPerPixelAt(anchor);
      group.position.copy(anchor).addScaledVector(right, dx * unitsPerPixel).addScaledVector(up, dy * unitsPerPixel);
      group.quaternion.copy(camera.quaternion);
      group.scale.setScalar(unitsPerPixel);
    }

    // The list is centred on its cell. Where that would take it under the rail, out of
    // the window or under the open detail card, the whole list moves across to stay in view.
    if (toolLabels.length > 0 && toolLabels[0]!.group.visible) {
      const room = pictureRoomAt(stage.window, constants, openPanelsOf(store.get()));
      const least = room.left + constants.listEdgePx;
      const most = room.right - constants.listEdgePx;
      let left = Infinity;
      let rightmost = -Infinity;
      for (const label of toolLabels) {
        const at = stage.toPicture(label.group.position).x + stage.origin.x;
        left = Math.min(left, at + label.box.left);
        rightmost = Math.max(rightmost, at + label.box.right);
      }
      const across = left < least ? least - left : rightmost > most ? Math.max(most - rightmost, least - left) : 0;
      if (across !== 0) {
        for (const { group, anchor } of toolLabels) group.position.addScaledVector(right, across * unitsPerPixelAt(anchor));
      }
    }

    if (bracketEnds) {
      // The bracket is drawn where it lies in the scene, so it has no group of its own.
      const [left, backRight] = bracketEnds;
      const foot = left.clone().add(backRight).multiplyScalar(0.5);
      const stemPx = constants.toolListGapPx - constants.toolRowPx / 4;
      const top = foot.clone().addScaledVector(up, stemPx * unitsPerPixelAt(foot));
      bracketCorners.setXYZ(0, left.x, left.y, left.z);
      bracketCorners.setXYZ(1, backRight.x, backRight.y, backRight.z);
      bracketCorners.setXYZ(2, foot.x, foot.y, foot.z);
      bracketCorners.setXYZ(3, top.x, top.y, top.z);
      bracketCorners.needsUpdate = true;
    }
  }

  /** What each label on screen covers, in pixels of the picture, with the label it belongs to. */
  function covers(): { label: Label; rect: LabelRect }[] {
    return shown().map((label) => {
      const at = stage.toPicture(label.group.position);
      return {
        label,
        rect: {
          left: at.x + label.box.left,
          right: at.x + label.box.right,
          top: at.y - label.box.top,
          bottom: at.y - label.box.bottom,
        },
      };
    });
  }

  stage.addPickable((x, y) => {
    for (const { label, rect } of covers()) {
      if (label.action && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return label.action;
    }
    return null;
  });

  show(store.get());
  store.subscribe((state, before) => {
    if (state.lens !== before.lens) showTierCounts(state.lens);
    show(state);
  });
  let shownIn = { ...stage.window };
  stage.onCameraChange(() => {
    // A window that has changed size may have changed the room for the names, or the list's room.
    const { width, height } = stage.window;
    if (width === shownIn.width && height === shownIn.height) {
      place();
      return;
    }
    shownIn = { width, height };
    show(store.get());
  });
  const namesReady = Promise.all(pending).then(place);

  return {
    async settled() {
      await namesReady;
      // The list may be set again while it is awaited, for a room that has changed.
      let awaited: Promise<void>;
      do {
        awaited = toolsReady;
        await awaited;
      } while (awaited !== toolsReady);
    },
    rects: () =>
      covers().map(({ rect }) => ({
        left: rect.left + stage.origin.x,
        right: rect.right + stage.origin.x,
        top: rect.top + stage.origin.y,
        bottom: rect.bottom + stage.origin.y,
      })),
  };
}
