/**
 * labels: text in the scene, by distance.
 *
 * At the stack distance each tier shows its name and its tool count. The
 * labels stand in a column to the left of the stack, each level with its
 * plate. They keep their size on screen and their place beside the stack while
 * the camera orbits, so they stay still unless the partner tilts or zooms.
 */
import { Group, Vector3 } from 'three';
import SpriteText from 'three-spritetext';
import { Text } from 'troika-three-text';
import tierNameFontUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff?url';
import { radians } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import type { StackLayout } from './layout';
import type { Stage } from './scene';
import { MAP_TOKENS, colourOf } from './tokens';

/** The face the counts are drawn in. main.ts loads it before any label is made. */
const COUNT_FAMILY = 'Geist Mono';
const COUNT_WEIGHT = '500';
export const COUNT_FONT = `${COUNT_WEIGHT} 1em "${COUNT_FAMILY}"`;

/** How many canvas pixels a count is drawn with for each pixel it takes on screen. */
const COUNT_OVERSAMPLING = 2;

const countText = (tierId: string, tools: number): string =>
  `${tierId} · ${tools} ${tools === 1 ? 'tool' : 'tools'}`.toUpperCase();

/**
 * Adds the tier labels to the stage. The promise resolves once every name has
 * been typeset, so the "ready" signal can wait for it.
 */
export function addTierLabels(
  stage: Stage,
  index: GraphIndex,
  layout: StackLayout,
  constants: Constants,
): Promise<void> {
  const nameColour = colourOf(MAP_TOKENS['map-text-name'].text).hex;
  const countColour = colourOf(MAP_TOKENS['map-text-tag'].text).hex;
  const halfWidth = (layout.bounds.max.x - layout.bounds.min.x) / 2;
  const axis = {
    x: (layout.bounds.min.x + layout.bounds.max.x) / 2,
    z: (layout.bounds.min.z + layout.bounds.max.z) / 2,
  };
  const middleHeight = (layout.bounds.min.y + layout.bounds.max.y) / 2;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const typeset: Promise<void>[] = [];
  const labels = index.tiers.map((tier) => {
    const plate = layout.plates.find((candidate) => candidate.tier === tier.id);
    if (!plate) throw new Error(`The layout has no plate for the tier "${tier.id}".`);

    // One unit inside the group is one pixel on screen; place() keeps it so.
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
    typeset.push(new Promise((resolve) => name.sync(() => resolve())));
    group.add(name);

    const count = new SpriteText(countText(tier.id, index.toolCountOf(tier.id)), constants.countPx, countColour);
    count.fontFace = COUNT_FAMILY;
    count.fontWeight = COUNT_WEIGHT;
    count.fontSize = Math.round(constants.countPx * pixelRatio * COUNT_OVERSAMPLING);
    count.center.set(0, 0);
    count.position.set(0, constants.countGapPx, 0);
    group.add(count);

    stage.add(group);
    return { group, height: plate.y };
  });

  const right = new Vector3();
  const up = new Vector3();
  const forward = new Vector3();
  const anchor = new Vector3();
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
    // The column's distance from the axis is set in pixels, measured at the
    // middle of the stack, so every label starts at the same place across the screen.
    const reachPx =
      halfWidth / unitsPerPixelAt(anchor.set(axis.x, middleHeight, axis.z)) +
      constants.labelGapPx +
      constants.labelColumnPx;
    for (const { group, height } of labels) {
      anchor.set(axis.x, height, axis.z);
      const unitsPerPixel = unitsPerPixelAt(anchor);
      group.position.copy(anchor).addScaledVector(right, -reachPx * unitsPerPixel);
      group.position.addScaledVector(up, constants.labelRisePx * unitsPerPixel);
      group.quaternion.copy(camera.quaternion);
      group.scale.setScalar(unitsPerPixel);
    }
  }
  stage.onCameraChange(place);

  return Promise.all(typeset).then(() => undefined);
}
