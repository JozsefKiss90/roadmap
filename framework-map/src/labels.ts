/**
 * labels: text in the scene, by distance.
 *
 * - Stack distance: each tier's tool count and name, at the left end of its
 *   plate. The label stands in the scene, upright, and runs along its plate,
 *   so it turns and tilts with the stack as the plate does. Under the bar, in
 *   the narrow and the upright page layout, there is no room beside the
 *   stack: one tag stands on the far edge of each plate and gives its tier's
 *   code and name, with no count. A name that would run out of the window
 *   is cut short.
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
 * Every label keeps its size as the camera comes closer or stands back. A
 * label is anchored to a point of the stack and offset from it in pixels, so
 * it follows its plate or cell as the camera moves. A cluster's or a tool's
 * name faces the camera. A tier's label does not: it is drawn at its own size
 * at rest, and from another angle it is seen as its plate is. Seen from
 * behind the stack, it stands at the other end of its plate and is turned
 * round, so it still reads from left to right. The labels read the distance and focus from the state store,
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
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
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
import { radians } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { gateBadge, kindIcon, tierCountText as countText } from './display';
import type { KindIcon } from './display';
import { drawKindIcon } from './icons';
import { TIER_NAME_LINE_HEIGHT, listLayout, nameCap, staircaseRise, standingStretch } from './label-layout';
import type { PlateLayout, StackLayout } from './layout';
import { namesFitFor, openPanelsOf, pictureRoomAt, restAngleAt, underBarAt } from './page-layout';
import type { Stage } from './scene';
import { narrows } from './state';
import type { MapState, Store } from './state';
import { MAP_TOKENS, colourOf } from './tokens';

/** The face the counts and badges are drawn in. main.ts loads it before any label is made. */
const TAG_FAMILY = 'Geist Mono';
const TAG_WEIGHT = '400';
export const TAG_FONT = `${TAG_WEIGHT} 1em "${TAG_FAMILY}"`;

/** How many canvas pixels a count, badge or icon is drawn with for each pixel it takes on screen. */
const OVERSAMPLING = 2;
/** Names stand above their plate or cell, so they are drawn over whatever lies behind them. */
const OVER_THE_STACK = 2;

/** The fewest letters of a tier's name its tag gives after the tier's code, where the name is cut short. With room for less, the tag gives the code alone. */
const LEAST_TIER_NAME_LETTERS = 4;

/** A tier's count while a lens is on: the tools in reach on its plate, out of all it holds. */
const reachText = (tierId: string, inReach: number, tools: number): string =>
  `${tierId} · ${inReach} of ${tools} in reach`.toUpperCase();

/** A rectangle of the window, in pixels from its top left corner. */
export interface LabelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /**
   * A label's four corners, in order round it. A tier's label stands in the scene at an angle, so
   * it covers less than the rectangle around it.
   */
  corners?: { x: number; y: number }[];
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
  /** Whether the label stands in the scene, along its plate. Any other label faces the camera. */
  standing: boolean;
  /** One pixel of the label to the right, and one up, as steps in the scene. Set when the label is placed. */
  across: Vector3;
  rise: Vector3;
  /** What a click on the label does. */
  action?: () => void;
}

/** The corners of a label's box, in order round it. */
const BOX_CORNERS = [
  ['left', 'bottom'],
  ['right', 'bottom'],
  ['right', 'top'],
  ['left', 'top'],
] as const;

/** A standing label as it is seen from in front of the stack, and turned round to be read from behind it. */
const FROM_THE_FRONT = new Quaternion();
const FROM_BEHIND = new Quaternion(0, 1, 0, 0);

/** The rectangle a standing count is drawn on. Its origin is its bottom left corner, as a tag's is. */
const TAG_FACE = new PlaneGeometry(1, 1).translate(0.5, 0.5, 0);

/** A count that stands in the scene. */
interface StandingTag {
  face: Mesh<PlaneGeometry, MeshBasicMaterial>;
  /** Its size, in pixels. */
  readonly width: number;
  readonly height: number;
  /** Draws another text on it: in the colour and at the size of a tag, or in those given. */
  write(text: string, colour?: string, sizePx?: number): void;
}

/** Whether a point lies inside a shape whose corners are given in order round it, and which has no dent. */
function holds(corners: readonly { x: number; y: number }[], x: number, y: number): boolean {
  let side = 0;
  for (let at = 0; at < corners.length; at += 1) {
    const from = corners[at]!;
    const to = corners[(at + 1) % corners.length]!;
    const turn = Math.sign((to.x - from.x) * (y - from.y) - (to.y - from.y) * (x - from.x));
    if (turn === 0) continue;
    if (side !== 0 && turn !== side) return false;
    side = turn;
  }
  return true;
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
  const countColour = colourOf(MAP_TOKENS['map-text-count'].text).hex;
  const selectedColour = colourOf(MAP_TOKENS['map-text-selected'].text).hex;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const tagResolution = (sizePx: number): number => Math.round(sizePx * pixelRatio * OVERSAMPLING);

  const typeset = (text: Text): Promise<void> => new Promise((resolve) => text.sync(() => resolve()));

  function tag(text: string, sizePx = constants.tagPx, colour = tagColour): SpriteText {
    const sprite = new SpriteText(text.toUpperCase(), sizePx, colour);
    sprite.fontFace = TAG_FAMILY;
    sprite.fontWeight = TAG_WEIGHT;
    sprite.fontSize = tagResolution(sizePx);
    return sprite;
  }

  /** How wide a tag of a text is at a size, in pixels. */
  function tagWidth(text: string, sizePx: number): number {
    const drawn = tag(text, sizePx);
    const width = drawn.scale.x;
    drawn.material.map?.dispose();
    drawn.material.dispose();
    return width;
  }

  /**
   * A tag that stands in the scene as its label does. A sprite always faces the camera, so the tag
   * is drawn on a rectangle instead: the sprite is never in the scene, and only draws the text and
   * measures it.
   */
  function standingTag(text: string, colour = tagColour): StandingTag {
    const drawn = tag(text, constants.tagPx, colour);
    const material = new MeshBasicMaterial({ map: drawn.material.map, transparent: true });
    const face = new Mesh(TAG_FACE, material);
    const fit = (): void => {
      // The sprite draws each text on a texture of its own.
      material.map = drawn.material.map;
      face.scale.set(drawn.scale.x, drawn.scale.y, 1);
    };
    fit();
    return {
      face,
      get width() {
        return drawn.scale.x;
      },
      get height() {
        return drawn.scale.y;
      },
      write(next, colour = tagColour, sizePx = constants.tagPx) {
        drawn.color = colour;
        drawn.textHeight = sizePx;
        drawn.fontSize = tagResolution(sizePx);
        drawn.text = next;
        fit();
      },
    };
  }

  // Stack distance: tier counts and names.
  const pending: Promise<void>[] = [];
  /**
   * Each tier's name and count, with its label and how far its name reaches down and across, to set
   * them again for a lens, and to leave the names out where the plates stand too close for them.
   */
  const tierCounts: {
    tier: string;
    plate: PlateLayout;
    name: Text;
    count: StandingTag;
    label: Label;
    nameWidth: number;
    nameBottom: number;
    /** The tier's code and name as a tag gives them, and how wide that tag is, in pixels. */
    title: string;
    titleWidth: number;
    /** The code and name as the tag has room for them: a name that would run out of the window is cut short. */
    shownTitle: string;
  }[] = [];
  const tierCountText = (tierId: string, lens: MapState['lens']): string =>
    narrows(lens)
      ? reachText(tierId, index.toolCountOf(tierId, lens), index.toolCountOf(tierId))
      : countText(tierId, index.toolCountOf(tierId));
  /**
   * A tier's code and name, as its tag gives them on the far edge of its plate. The code has no dot
   * after it there, which leaves the longest name two more letters of room in a phone's window.
   */
  const tierTitleText = (tier: { id: string; label: string }): string => `${tier.id} ${tier.label}`.toUpperCase();
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
    name.lineHeight = TIER_NAME_LINE_HEIGHT;
    // A name ends where its plate begins. Every name has room on one line.
    name.maxWidth = constants.labelColumnPx;
    name.textAlign = 'right';
    name.anchorX = 'right';
    name.anchorY = 'top';
    name.color = tierNameColour(tier.id, store.get().lens);
    group.add(name);

    // A tier's count line has a colour of its own, map-text-count.
    const count = standingTag(tierCountText(tier.id, store.get().lens), countColour);
    count.face.position.set(0, constants.countGapPx, 0);
    group.add(count.face);

    const label: Label = {
      group,
      // Where the label is anchored depends on where the camera stands: place() sets it.
      anchor: new Vector3(layout.bounds.min.x, plate.y, plate.z),
      dx: 0,
      dy: 0,
      box: { left: 0, bottom: 0, right: 0, top: 0 },
      standing: true,
      across: new Vector3(),
      rise: new Vector3(),
      action: () => store.focusTier(tier.id),
    };
    const title = tierTitleText(tier);
    const counted = {
      tier: tier.id,
      plate,
      name,
      count,
      label,
      nameWidth: 0,
      nameBottom: 0,
      title,
      titleWidth: tagWidth(title, constants.tierTitlePx),
      shownTitle: title,
    };
    tierCounts.push(counted);
    pending.push(
      typeset(name).then(() => {
        const [left, bottom] = blockOf(name);
        counted.nameBottom = bottom;
        counted.nameWidth = -left;
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
        standing: false,
        across: new Vector3(),
        rise: new Vector3(),
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
  /** Whether each tier's tag stands on the far edge of its plate, as under the bar, and not at the end of the plate. It then gives the tier's name, and no count. */
  let countsOverPlates = false;
  /** Whether the tags over the plates are left out as well, because the plates stand closer on screen than a tag is tall. */
  let tierCountsOut = false;

  /** Whether the window's page layout has the bar: the narrow or the upright one. */
  const underBar = (): boolean => underBarAt(stage.window, constants);

  /**
   * Sets where each tier label stands from its anchor and what it covers: its count, and its name
   * unless the names are left out. At the end of its plate a label ends a gap short of the plate,
   * with the top face of the plate a little under the top of its name; a count on its own stands
   * level with that face. On the far edge of its plate a tag begins where the plate does.
   */
  function boxTierLabels(): void {
    for (const { name, count, label, nameWidth, nameBottom } of tierCounts) {
      // Under the bar a tag stands on the far edge of its plate, close under the plate above, and is drawn over both.
      // At the end of its plate it is part of the scene, and a plate that stands before it hides it.
      const { material } = count.face;
      material.depthTest = !countsOverPlates;
      material.depthWrite = !countsOverPlates;
      count.face.renderOrder = countsOverPlates ? OVER_THE_STACK : 0;
      name.visible = !tierNamesOut;
      count.face.position.x = countsOverPlates ? 0 : -count.width;
      label.dx = countsOverPlates ? 0 : -constants.labelGapPx;
      label.dy = countsOverPlates
        ? constants.countOverPlatePx - constants.countGapPx
        : tierNamesOut
          ? -(constants.countGapPx + count.height / 2)
          : constants.labelRisePx;
      label.box.left = countsOverPlates ? 0 : -(tierNamesOut ? count.width : Math.max(count.width, nameWidth));
      label.box.right = countsOverPlates ? count.width : 0;
      label.box.bottom = tierNamesOut ? constants.countGapPx : nameBottom;
      label.box.top = constants.countGapPx + count.height;
    }
  }

  /**
   * Sets each tier's count for the lens: the tools in reach on its plate, or all of its tools with no lens.
   * On the far edge of its plate, as under the bar, the tag stands for the tier's name, which has no
   * room of its own there: it gives the tier's code and name, cut short where the window has no room
   * for all of it, and no count. It has the colour its name would have, and the size of a tier's title.
   */
  function showTierCounts(lens: MapState['lens']): void {
    for (const { tier, name, count, shownTitle } of tierCounts) {
      name.color = tierNameColour(tier, lens);
      if (countsOverPlates) count.write(shownTitle, tierNameColour(tier, lens), constants.tierTitlePx);
      else count.write(tierCountText(tier, lens), countColour);
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
      standing: false,
      across: new Vector3(),
      rise: new Vector3(),
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

  /**
   * Each tier's code and name as its tag has room for them on the far edge of its plate: from the
   * plate's left end to the right edge of the picture's room. A name that would run out of that room
   * is cut short, with an ellipsis, as in a window under 324 pixels wide, or above a detail card on
   * a phone, where the stack stands back. A cut that would leave only a few letters of the name
   * leaves the code alone. The room is measured with the stack at rest, where a tag is drawn at its
   * own size, so turning the stack changes no tag.
   */
  const leftEnd = new Vector3();
  const along = new Vector3();
  function fittedTitles(): string[] {
    const most = pictureRoomAt(stage.window, constants, openPanelsOf(store.get())).right;
    const atRest = stage.restView();
    return tierCounts.map(({ tier, plate, title, titleWidth }) => {
      const from = atRest(leftEnd.set(plate.x - plate.width / 2, plate.y, plate.z - plate.depth / 2)).x;
      /** How far along the plate from its left end a point is drawn, in pixels across the window. */
      const across = (units: number): number => atRest(along.copy(leftEnd).setX(leftEnd.x + units)).x - from;
      // A tag is drawn at its own size where it begins. It runs on toward the camera, so the rest of
      // it is drawn a hair larger: `grown` is by how much for the whole title, and a shorter tag grows less.
      const unitsPerPixel = 1 / across(1);
      const grown = across(titleWidth * unitsPerPixel) / titleWidth;
      const room = (most - from) / grown;
      if (titleWidth <= room) return title;
      // The letters of a tag are all of one width.
      const letters = Math.floor((room / titleWidth) * title.length);
      if (letters < tier.length + 1 + LEAST_TIER_NAME_LETTERS + 1) return tier.toUpperCase();
      return `${title.slice(0, letters - 1).trimEnd()}…`;
    });
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

    // A tier's label stands in the scene, upright, and runs along its plate. It is stretched so
    // that at rest it is drawn at its own size; `tall` is how many pixels of the picture one of
    // its pixels then takes from top to bottom, which is 1 at rest and follows the camera's tilt.
    const angle = restAngleAt(stage.window, constants);
    const stretch = standingStretch(angle.tiltDegrees, angle.turnDegrees);
    const tall = stretch.up * up.y;
    // From behind the stack the plates' right ends are at the left of the picture. The labels
    // stand there then, turned round, so they are in the same part of the window and still read
    // from left to right. The change comes as the labels are seen edge on.
    const behind = right.x < 0;
    const end = behind ? 1 : -1;

    // Under the bar there is no room beside the stack: the names are left out, and each tier's tag
    // stands on the far edge of its plate, from the end that is at the left of the picture.
    // Elsewhere each label stands past the end of the stack, level with its plate.
    const over = underBar();
    for (const { plate, label } of tierCounts) {
      if (over) label.anchor.set(plate.x + (end * plate.width) / 2, plate.y, plate.z + (end * plate.depth) / 2);
      else label.anchor.set(behind ? layout.bounds.max.x : layout.bounds.min.x, plate.y, plate.z);
    }

    // Where the stack stands back, as it does beside a need's detail card in a narrow window, the
    // plates come closer on screen than a label is tall. The names are then left out, and each
    // tier keeps its count, which begins with the tier's code. The scene gives the stack the room
    // the names would have had, so they stay out there however close the camera comes.
    const heights = tierCounts.map(({ label }) => stage.toPicture(label.anchor).y);
    const apart = (at: number): number => Math.abs(heights[at]! - heights[at - 1]!);
    const out =
      over ||
      !stage.tierNamesHaveRoom() ||
      tierCounts.some(
        ({ label, nameBottom }, at) => at > 0 && apart(at) < (label.box.top - nameBottom) * tall + constants.tierLabelGapPx,
      );
    // On the far edge of its plate a tag gives its tier's code and name, cut short where the window
    // has no room for all of it.
    const titles = over ? fittedTitles() : null;
    const retitled = titles !== null && tierCounts.some(({ shownTitle }, at) => shownTitle !== titles[at]);
    if (out !== tierNamesOut || over !== countsOverPlates || retitled) {
      tierNamesOut = out;
      // A tag reads otherwise on the far edge of its plate than beside it, so it is written again.
      const written = over !== countsOverPlates || retitled;
      countsOverPlates = over;
      if (titles) tierCounts.forEach((counted, at) => (counted.shownTitle = titles[at]!));
      if (written) showTierCounts(store.get().lens);
      else boxTierLabels();
    }
    tierCountsOut = false;
    if (over) {
      // Beside a detail card and the phase strip a phone leaves the stack so little room that a tag
      // would lie on the plate over its own. The tags are then left out too; the outline names each
      // tier. The room is measured as it is with the stack face on, so turning the stack hides no tag.
      const countPx = ((tierCounts[0]?.count.height ?? 0) + constants.countOverPlatePx) * tall;
      tierCountsOut = tierCounts.some(({ plate, label }, at) => {
        if (at === 0) return false;
        const deepPx = (plate.depth * Math.abs(forward.y)) / unitsPerPixelAt(label.anchor);
        return apart(at) - deepPx < countPx;
      });
    }
    const atStack = store.get().distance === 'stack';
    for (const label of tierLabels) label.group.visible = atStack && !tierCountsOut;

    for (const label of shown()) {
      const { group, anchor } = label;
      const unitsPerPixel = unitsPerPixelAt(anchor);
      if (label.standing) {
        label.across.set(-end, 0, 0).multiplyScalar(stretch.along * unitsPerPixel);
        label.rise.set(0, stretch.up * unitsPerPixel, 0);
        group.quaternion.copy(behind ? FROM_BEHIND : FROM_THE_FRONT);
        group.scale.set(stretch.along * unitsPerPixel, stretch.up * unitsPerPixel, unitsPerPixel);
      } else {
        label.across.copy(right).multiplyScalar(unitsPerPixel);
        label.rise.copy(up).multiplyScalar(unitsPerPixel);
        group.quaternion.copy(camera.quaternion);
        group.scale.setScalar(unitsPerPixel);
      }
      group.position.copy(anchor).addScaledVector(label.across, label.dx).addScaledVector(label.rise, label.dy);
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

  /**
   * What each label on screen covers, in pixels of the picture, with the label it belongs to: its
   * four corners, and the rectangle around them.
   */
  const boxCorner = new Vector3();
  function covers(): { label: Label; rect: Required<LabelRect> }[] {
    return shown().map((label) => {
      const corners = BOX_CORNERS.map(([side, level]) =>
        stage.toPicture(
          boxCorner
            .copy(label.group.position)
            .addScaledVector(label.across, label.box[side])
            .addScaledVector(label.rise, label.box[level]),
        ),
      );
      const xs = corners.map((corner) => corner.x);
      const ys = corners.map((corner) => corner.y);
      return {
        label,
        rect: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), corners },
      };
    });
  }

  stage.addPickable((x, y) => {
    for (const { label, rect } of covers()) {
      if (label.action && holds(rect.corners, x, y)) return label.action;
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
        corners: rect.corners.map((corner) => ({ x: corner.x + stage.origin.x, y: corner.y + stage.origin.y })),
      })),
  };
}
