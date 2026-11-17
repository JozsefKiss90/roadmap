/**
 * labels: text in the scene, by distance.
 *
 * - Stack distance: each tier's name and tool count, in a column to the left
 *   of the stack, each at the height of its plate.
 * - Tier distance: the names of the focused tier's clusters, as a staircase
 *   above its plate. Each name stands on a leader line that rises from its
 *   cell's back left corner.
 * - Cluster distance: the names of the focused cluster's tools, as a list in
 *   columns above its cell, each with its kind icon and, where the tool is
 *   gated, a gate badge. The list is in the order the cell's grid is filled.
 *   A bracket runs along the cell's back edge, with a stem up to the list, to
 *   show which cell the list belongs to.
 *
 * Every label keeps its size on screen. A label is anchored to a point of the
 * stack and offset from it in pixels, so it follows its plate or cell as the
 * camera moves. The labels read the distance and focus from the state store,
 * and write to it when the partner clicks a tier or cluster name.
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
import { radians } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { gateBadge, kindIcon } from './display';
import type { KindIcon } from './display';
import type { ToolNode } from './graph';
import { drawKindIcon } from './icons';
import { listLayout, staircaseRise } from './label-layout';
import type { StackLayout } from './layout';
import type { Stage } from './scene';
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

const countText = (tierId: string, tools: number): string =>
  `${tierId} · ${tools} ${tools === 1 ? 'tool' : 'tools'}`.toUpperCase();

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
    name.color = nameColour;
    group.add(name);

    const count = tag(countText(tier.id, index.toolCountOf(tier.id)));
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
    pending.push(
      typeset(name).then(() => {
        const [, bottom, right] = blockOf(name);
        label.box.bottom = bottom;
        label.box.right = Math.max(label.box.right, right);
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
        action: () => store.focusCluster(cluster.id),
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
  const tools = new Map<string, ToolNode>();
  for (const node of index.graph.nodes) if (node.type === 'tool') tools.set(node.id, node);
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

  let toolLabels: Label[] = [];
  let toolsShown: string | null = null;
  let disposeTools: (() => void)[] = [];
  let toolsReady: Promise<void> = Promise.resolve();

  function clearToolLabels(): void {
    for (const label of toolLabels) stage.remove(label.group);
    for (const dispose of disposeTools) dispose();
    toolLabels = [];
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
        const tool = tools.get(mark.tool);
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
        return { group, name, badge };
      });

    const labels: Label[] = rows.map(({ group }) => ({
      group,
      anchor,
      dx: 0,
      dy: 0,
      box: { left: 0, bottom: -constants.toolRowPx / 2, right: 0, top: constants.toolRowPx / 2 },
    }));
    toolLabels = labels;

    toolsReady = Promise.all(rows.map(({ name }) => typeset(name))).then(() => {
      // The partner may have moved on while the names were being typeset.
      if (toolLabels !== labels) return;
      const widths = rows.map(({ name, badge }) => {
        const nameRight = nameLeft + blockOf(name)[2];
        return badge ? nameRight + constants.toolBadgeGapPx + badge.scale.x : nameRight;
      });
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

  /** The labels on screen for the current state. */
  function shown(): Label[] {
    const state = store.get();
    if (state.distance === 'stack') return tierLabels;
    if (state.distance === 'tier') return clusterLabels.get(state.tier ?? '') ?? [];
    return toolLabels.filter((label) => label.group.visible);
  }

  function show(state: MapState): void {
    for (const label of tierLabels) label.group.visible = state.distance === 'stack';
    for (const [tier, labels] of clusterLabels) {
      for (const label of labels) label.group.visible = state.distance === 'tier' && state.tier === tier;
    }
    if (state.distance !== 'cluster' || !state.cluster) clearToolLabels();
    else if (toolsShown !== state.cluster) showToolLabels(state.cluster);
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

    for (const { group, anchor, dx, dy } of shown()) {
      const unitsPerPixel = unitsPerPixelAt(anchor);
      group.position.copy(anchor).addScaledVector(right, dx * unitsPerPixel).addScaledVector(up, dy * unitsPerPixel);
      group.quaternion.copy(camera.quaternion);
      group.scale.setScalar(unitsPerPixel);
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
  store.subscribe(show);
  stage.onCameraChange(place);
  const namesReady = Promise.all(pending).then(place);

  return {
    settled: () => Promise.all([namesReady, toolsReady]).then(() => undefined),
    rects: () =>
      covers().map(({ rect }) => ({
        left: rect.left + stage.origin.x,
        right: rect.right + stage.origin.x,
        top: rect.top + stage.origin.y,
        bottom: rect.bottom + stage.origin.y,
      })),
  };
}
