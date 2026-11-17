/**
 * scene: draws plates, cells and marks from the layout, and moves the camera
 * between the three distances.
 *
 * 3d-force-graph is the renderer and the camera (ADR 0002). Every mark is one
 * of its nodes, pinned where the layout put it; no simulation runs and no link
 * is drawn. Plates and cells are plain objects added to its scene.
 *
 * The scene reads the distance, the focus and the selection from the state
 * store, and writes to the store when the partner clicks a plate, a cell or a
 * mark. It moves the camera and changes colour and opacity; it never moves a
 * plate, a cell or a mark.
 *
 * The mark under the pointer gets a ring and a hover label, and the selected
 * tool's mark takes the selected fill. src/selection-drawing.ts draws the
 * rest of the selection: a selected cell's outline and the `implements`
 * lines. The camera frames both ends of those lines, and the plates that lie
 * between the ends fade.
 */
import ForceGraph3D from '3d-force-graph';
import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { radians, towardCamera, placeToFit } from './camera';
import type { Box, Frame, Region, CameraPlace } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { DECISION_STEPS, decisionStep } from './display';
import type { DecisionStep } from './display';
import { createHoverLabel } from './hover-label';
import { listShape, staircaseHeight } from './label-layout';
import type { CellLayout, MarkLayout, PlateLayout, StackLayout } from './layout';
import { MARK_LIFT, MARK_SHARE_OF_QUAD, OVER_THE_MARKS, markMaterial } from './mark-material';
import { pickOnStack } from './pick';
import type { StackHit } from './pick';
import { createSelectionDrawing } from './selection-drawing';
import { AT_STACK } from './state';
import type { MapState, Store } from './state';
import { MAP_TOKENS, MARK_TOKEN_OF_STEP, PAGE_ROLE, colourOf } from './tokens';
import type { LineToken, MarkToken } from './tokens';

/** The form of the selected mark: the selected fill, whatever the mark's step. */
const SELECTED_MARK: MarkToken = {
  fill: MAP_TOKENS['map-selected-fill'].fill,
  outline: null,
  widthPx: 0,
  dashed: false,
};
/** The hover ring is drawn as a mark with an outline and no fill, on a square of its own. */
const HOVER_RING = MAP_TOKENS['map-hover-ring'];
const HOVER_RING_MARK: MarkToken = { fill: null, outline: HOVER_RING.line, widthPx: HOVER_RING.widthPx, dashed: false };

/** Something the partner can click that is not a plate or a cell: it answers for a point of the picture. */
export type Pickable = (x: number, y: number) => (() => void) | null;

/** What the rest of the map needs from the scene. */
export interface Stage {
  /** Adds an object to the scene, or takes it out. */
  add(object: Object3D): void;
  remove(object: Object3D): void;
  readonly camera: PerspectiveCamera;
  /** The picture the camera draws, in pixels, and the margins the stack keeps clear inside it at rest. */
  readonly frame: Frame;
  /** The window the picture is seen through, in pixels. */
  readonly window: { readonly width: number; readonly height: number };
  /** Where the picture's top left corner lies in the window, in pixels. The picture is larger than the window. */
  readonly origin: { readonly x: number; readonly y: number };
  /** Where a point of the scene is drawn, in pixels from the picture's top left corner. */
  toPicture(point: Vector3): { x: number; y: number };
  /** Runs `listener` now and whenever the camera moves or the window changes size. */
  onCameraChange(listener: () => void): void;
  /** Lets something else in the scene, such as a label, take clicks. It is asked before the plates. */
  addPickable(pickable: Pickable): void;
  /** Applies changed constants: the field of view, the limits, and the camera's place for the current distance. */
  applyConstants(): void;
}

/** A mark as a node of the renderer: pinned, so it carries `fx`, `fy`, `fz`. */
interface MarkNode {
  id: string;
  tier: string;
  step: DecisionStep;
  size: number;
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
}

/** A faded tier is drawn before the others, so its marks never lie over the marks of the focused plate. */
const UNDER_THE_REST = -1;
/** A press that moves the pointer further than this is a drag, not a click. */
const CLICK_SLOP_PX = 5;

/** A 1px line in a token's colour. `fullOpacity` is its opacity on a plate that is not faded. */
interface Line {
  material: LineBasicMaterial;
  fullOpacity: number;
}

function line(token: LineToken): Line {
  // WebGL draws every line one pixel wide, which is the width the line tokens ask for.
  if (token.widthPx !== 1) throw new Error('The scene draws 1px lines only.');
  const colour = colourOf(token.line);
  return {
    // A line hides nothing, so it leaves the depth buffer alone. A faded plate's
    // lines would otherwise cut through the marks drawn after them.
    material: new LineBasicMaterial({ color: colour.hex, transparent: true, opacity: colour.alpha, depthWrite: false }),
    fullOpacity: colour.alpha,
  };
}

/** Everything drawn for one tier, so that the whole tier can fade together. */
interface TierParts {
  plate: PlateLayout;
  fill: MeshBasicMaterial;
  lines: Line[];
  marks: Map<DecisionStep, ShaderMaterial>;
  /** The material of the tier's selected mark. */
  selected: ShaderMaterial;
  /** Every object drawn for the tier: its plate, its lines and its marks. */
  objects: Object3D[];
  /** How opaque the tier is now, from 0 to 1, and where its fade started and ends. */
  opacity: number;
  from: number;
  to: number;
}

function setTierOpacity(parts: TierParts, opacity: number): void {
  parts.opacity = opacity;
  const whole = opacity >= 1;
  if (parts.fill.transparent === whole) {
    // A plate that is not faded hides what is under it; a faded one lets it show.
    parts.fill.transparent = !whole;
    parts.fill.depthWrite = whole;
    parts.fill.needsUpdate = true;
    for (const object of parts.objects) object.renderOrder = whole ? 0 : UNDER_THE_REST;
  }
  parts.fill.opacity = opacity;
  for (const { material, fullOpacity } of parts.lines) material.opacity = fullOpacity * opacity;
  for (const material of [...parts.marks.values(), parts.selected]) material.uniforms.uOpacity!.value = opacity;
}

/** The limits the orbit controls hold the camera to at one distance. */
interface Limits {
  minTilt: number;
  maxTilt: number;
  /** How far the partner may turn the camera to either side, in degrees, or Infinity for all the way round. */
  turn: number;
  minRange: number;
  maxRange: number;
}

export function createStage(
  container: HTMLElement,
  index: GraphIndex,
  layout: StackLayout,
  constants: Constants,
  store: Store,
): Stage {
  const canvasHost = document.createElement('div');
  canvasHost.style.position = 'absolute';
  container.append(canvasHost);
  const graph = new ForceGraph3D(canvasHost, {
    controlType: 'orbit',
    rendererConfig: { antialias: true, alpha: false },
  });
  const renderer = graph.renderer();
  const camera = graph.camera() as PerspectiveCamera;
  const controls = graph.controls() as OrbitControls;

  // One set of materials per tier, so that a tier can fade without its neighbours.
  const square = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const tiers = new Map<string, TierParts>();
  for (const plate of layout.plates) {
    const fill = new MeshBasicMaterial({
      color: colourOf(MAP_TOKENS['map-plate-fill'].fill).hex,
      // Pushes the fill back a little, so the plate's own edges and the cell lines win.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const edge = line(MAP_TOKENS['map-plate-edge']);
    const cellLine = line(MAP_TOKENS['map-cell-line']);
    const marks = new Map<DecisionStep, ShaderMaterial>(
      DECISION_STEPS.map((step) => [step, markMaterial(MARK_TOKEN_OF_STEP[step], renderer.getPixelRatio())]),
    );
    const selected = markMaterial(SELECTED_MARK, renderer.getPixelRatio());
    const objects: Object3D[] = [];
    tiers.set(plate.tier, {
      plate,
      fill,
      lines: [edge, cellLine],
      marks,
      selected,
      objects,
      opacity: 1,
      from: 1,
      to: 1,
    });

    const thickness = constants.plateThickness;
    const box = new BoxGeometry(plate.width, thickness, plate.depth);
    for (const part of [new Mesh(box, fill), new LineSegments(new EdgesGeometry(box), edge.material)]) {
      part.position.set(plate.x, plate.y - thickness / 2, plate.z);
      objects.push(part);
      graph.scene().add(part);
    }

    const corners: number[] = [];
    for (const cell of layout.cells) {
      if (cell.tier !== plate.tier) continue;
      const [left, right] = [cell.x - cell.width / 2, cell.x + cell.width / 2];
      const [back, front] = [cell.z - cell.depth / 2, cell.z + cell.depth / 2];
      const y = cell.y + MARK_LIFT / 2;
      corners.push(left, y, back, right, y, back, right, y, back, right, y, front);
      corners.push(right, y, front, left, y, front, left, y, front, left, y, back);
    }
    const outlines = new BufferGeometry();
    outlines.setAttribute('position', new Float32BufferAttribute(corners, 3));
    const cellOutlines = new LineSegments(outlines, cellLine.material);
    objects.push(cellOutlines);
    graph.scene().add(cellOutlines);
  }
  const partsOf = (tier: string): TierParts => {
    const parts = tiers.get(tier);
    if (!parts) throw new Error(`The layout has no plate for the tier "${tier}".`);
    return parts;
  };

  // Marks. One flat square per tool, in the material of its tier and its decision-class step.
  const markOf = new Map<string, MarkLayout>(layout.marks.map((mark) => [mark.tool, mark]));
  const cellOf = new Map<string, CellLayout>(layout.cells.map((cell) => [cell.cluster, cell]));
  const meshes = new Map<string, { mesh: Mesh; node: MarkNode }>();
  const selectedTool = (): string | null => {
    const { selection } = store.get();
    return selection?.type === 'tool' ? selection.id : null;
  };
  const nodes: MarkNode[] = layout.marks.map((mark) => {
    const tool = index.tool(mark.tool);
    if (!tool) throw new Error(`The layout places "${mark.tool}", which is not a tool in the graph.`);
    const y = mark.y + MARK_LIFT;
    return {
      id: mark.tool,
      tier: mark.tier,
      step: decisionStep(tool.decision_class),
      size: mark.size,
      x: mark.x,
      y,
      z: mark.z,
      fx: mark.x,
      fy: y,
      fz: mark.z,
    };
  });

  graph
    .backgroundColor(colourOf(PAGE_ROLE).hex)
    .showNavInfo(false)
    .enableNodeDrag(false)
    // The renderer's own picking is for nodes and links. Plates and cells are picked below.
    .enablePointerInteraction(false)
    // No simulation: no tick ever runs, and every node is pinned as well.
    .warmupTicks(0)
    .cooldownTicks(0)
    .nodeThreeObject((node) => {
      const mark = node as MarkNode;
      const parts = partsOf(mark.tier);
      const mesh = new Mesh(square, mark.id === selectedTool() ? parts.selected : parts.marks.get(mark.step));
      meshes.set(mark.id, { mesh, node: mark });
      mesh.scale.setScalar(mark.size / MARK_SHARE_OF_QUAD);
      mesh.renderOrder = parts.opacity >= 1 ? 0 : UNDER_THE_REST;
      parts.objects.push(mesh);
      return mesh;
    })
    .graphData({ nodes, links: [] });

  // A mark made while its tool is selected starts with the selected fill, so the page may open with one.
  let filled = selectedTool();
  /** Gives the selected tool's mark the selected fill, and every other mark the form of its step. */
  function showSelectedMark(): void {
    const next = selectedTool();
    if (next === filled) return;
    for (const [id, selected] of [
      [filled, false],
      [next, true],
    ] as const) {
      const made = id === null ? undefined : meshes.get(id);
      if (!made) continue;
      const parts = partsOf(made.node.tier);
      made.mesh.material = selected ? parts.selected : parts.marks.get(made.node.step)!;
    }
    filled = next;
  }

  // The rest of the selection: a selected cell's outline, and the `implements` lines.
  const selectionDrawing = createSelectionDrawing(
    (object) => void graph.scene().add(object),
    index,
    layout,
    renderer.getPixelRatio(),
  );

  // Hover: a ring on the mark under the pointer, and a label beside the pointer.
  const ringMaterial = markMaterial(HOVER_RING_MARK, renderer.getPixelRatio());
  const ring = new Mesh(square, ringMaterial);
  ring.renderOrder = OVER_THE_MARKS;
  ring.visible = false;
  graph.scene().add(ring);
  const hoverLabel = createHoverLabel(container, constants.hoverLabelOffsetPx);
  let hovered: MarkLayout | null = null;
  const fromCamera = new Vector3();
  const forward = new Vector3();

  /** Sizes the ring so that it stands its gap clear of the mark, in pixels on screen. */
  function placeHoverRing(): void {
    if (!hovered) return;
    ring.position.set(hovered.x, hovered.y + MARK_LIFT * 1.5, hovered.z);
    camera.getWorldDirection(forward);
    const depth = fromCamera.copy(ring.position).sub(camera.position).dot(forward);
    const unitsPerPixel = (2 * depth * Math.tan(radians(camera.fov) / 2)) / frame.height;
    const side = hovered.size + 2 * (HOVER_RING.gapPx + HOVER_RING.widthPx) * unitsPerPixel;
    ring.scale.setScalar(side / MARK_SHARE_OF_QUAD);
  }

  /** Shows the ring and the label for a tool's mark, with the pointer at a point of the picture. Null hides both. */
  function hover(toolId: string | null, at?: { x: number; y: number }): void {
    const tool = toolId === null ? undefined : index.tool(toolId);
    hovered = tool ? (markOf.get(tool.id) ?? null) : null;
    ring.visible = hovered !== null;
    if (!tool || !hovered || !at) {
      hoverLabel.hide();
      return;
    }
    placeHoverRing();
    // An open detail card covers the right of the window, so the label keeps left of it.
    const rightEdge = windowSize.width - (store.get().selection ? constants.detailCardPx : 0);
    // At the cluster distance the breadcrumb already names the focused cluster.
    const cluster = tool.cluster === store.get().cluster ? null : (index.cluster(tool.cluster)?.label ?? null);
    hoverLabel.show(at.x + origin.x, at.y + origin.y, rightEdge, tool.label, cluster);
  }

  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;

  // The window, as last measured. `frame` is the picture, which is larger.
  const windowSize = { width: 0, height: 0 };
  const frame: Frame = { width: 0, height: 0, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
  const origin = { x: 0, y: 0 };
  const listeners: (() => void)[] = [placeHoverRing];
  const notify = (): void => listeners.forEach((listener) => listener());
  const centre = new Vector3(
    (layout.bounds.min.x + layout.bounds.max.x) / 2,
    (layout.bounds.min.y + layout.bounds.max.y) / 2,
    (layout.bounds.min.z + layout.bounds.max.z) / 2,
  );
  let restRange = 0;

  /** A rectangle given in window pixels, as a region of the picture. */
  const inPicture = (left: number, top: number, right: number, bottom: number): Region => ({
    left: left - origin.x,
    top: top - origin.y,
    right: right - origin.x,
    bottom: bottom - origin.y,
  });

  const flat = (rectangle: PlateLayout | CellLayout) => ({
    min: { x: rectangle.x - rectangle.width / 2, y: rectangle.y, z: rectangle.z - rectangle.depth / 2 },
    max: { x: rectangle.x + rectangle.width / 2, y: rectangle.y, z: rectangle.z + rectangle.depth / 2 },
  });

  /** A box grown to hold another. */
  const holding = (box: Box, other: Box | null): Box =>
    other
      ? {
          min: { x: Math.min(box.min.x, other.min.x), y: Math.min(box.min.y, other.min.y), z: Math.min(box.min.z, other.min.z) },
          max: { x: Math.max(box.max.x, other.max.x), y: Math.max(box.max.y, other.max.y), z: Math.max(box.max.z, other.max.z) },
        }
      : box;

  /**
   * Where the camera stands for a state. At rest the whole stack fits inside
   * the insets. At the tier distance the focused plate stands under the room
   * its cluster names need, and at the cluster distance the focused cell
   * stands under the room its tool names need. A selection with `implements`
   * lines has their far ends in the picture too.
   */
  function placeOf(state: MapState): CameraPlace {
    const field = constants.fieldOfViewDegrees;
    // The rail covers the left of the window and an open detail card the right, so the plate or cell stands clear of both.
    const card = state.selection ? constants.detailCardPx : 0;
    const cell = state.distance === 'cluster' ? cellOf.get(state.cluster ?? '') : undefined;
    if (cell) {
      const names = listShape(index.toolsOf(cell.cluster).length, constants.toolListMostRows);
      const listRoom = names.rows * constants.toolRowPx + constants.toolListGapPx;
      const framed = holding(flat(cell), selectionDrawing.reachOf(state.selection));
      const fit = (roomAbove: number): CameraPlace =>
        placeToFit(
          framed,
          frame,
          inPicture(
            constants.railPx + constants.nearInsetSidePx,
            constants.annotationTopPx + roomAbove,
            windowSize.width - constants.nearInsetSidePx - card,
            windowSize.height - constants.insetBottomPx,
          ),
          field,
          constants.clusterTiltDegrees,
          0,
          { mostPixelsPerUnit: constants.clusterMostPixelsPerUnit, align: 'top' },
        );
      // The names need their room above the cell, not above everything framed. Where a
      // line's far end stands higher in the picture than the cell, it stands in that room.
      const tilt = radians(constants.clusterTiltDegrees);
      const height = (y: number, z: number): number => y * Math.sin(tilt) - z * Math.cos(tilt);
      const above = height(framed.max.y, framed.min.z) - height(cell.y, cell.z - cell.depth / 2);
      const cautious = fit(listRoom);
      if (above <= 0) return cautious;
      // The cautious fit is the farthest the camera stands, so its scale is the least the far end's rise can have.
      const pixelsPerUnit = frame.height / 2 / Math.tan(radians(field) / 2) / cautious.range;
      return fit(Math.max(0, listRoom - above * pixelsPerUnit));
    }
    const plate = state.distance === 'stack' ? undefined : tiers.get(state.tier ?? '')?.plate;
    if (plate) {
      const names = layout.cells.filter((each) => each.tier === plate.tier).length;
      const top =
        constants.annotationTopPx + staircaseHeight(names, constants.clusterRowPx, constants.clusterNameGapPx);
      const region = inPicture(
        constants.railPx + constants.nearInsetSidePx,
        top,
        windowSize.width - constants.tierInsetRightPx - card,
        windowSize.height - constants.insetBottomPx,
      );
      return placeToFit(flat(plate), frame, region, field, constants.tierTiltDegrees, 0, {
        mostPixelsPerUnit: constants.tierMostPixelsPerUnit,
        align: 'top',
      });
    }
    const region = {
      left: frame.inset.left,
      top: frame.inset.top,
      right: frame.width - frame.inset.right,
      bottom: frame.height - frame.inset.bottom,
    };
    return placeToFit(layout.bounds, frame, region, field, constants.restTiltDegrees, 0);
  }

  function limitsOf(state: MapState, place: CameraPlace): Limits {
    if (state.distance === 'stack') {
      return {
        minTilt: constants.minTiltDegrees,
        maxTilt: constants.maxTiltDegrees,
        turn: Infinity,
        minRange: place.range * constants.nearestZoom,
        maxRange: place.range * constants.farthestZoom,
      };
    }
    // Close in, the names stand above the plate, so the camera stays near the front.
    return {
      minTilt: place.tiltDegrees - constants.focusTiltSlackDegrees,
      maxTilt: constants.focusMaxTiltDegrees,
      turn: constants.focusTurnDegrees,
      minRange: place.range * constants.focusNearestZoom,
      maxRange: place.range * constants.focusFarthestZoom,
    };
  }

  function applyLimits(limits: Limits): void {
    controls.minPolarAngle = radians(limits.minTilt);
    controls.maxPolarAngle = radians(limits.maxTilt);
    controls.minAzimuthAngle = Number.isFinite(limits.turn) ? -radians(limits.turn) : -Infinity;
    controls.maxAzimuthAngle = Number.isFinite(limits.turn) ? radians(limits.turn) : Infinity;
    controls.minDistance = limits.minRange;
    controls.maxDistance = limits.maxRange;
  }

  // The move under way, if any: a camera flight, a fade of the plates, or both.
  let move = 0;
  let moveFrame = 0;

  /**
   * The plates above the focused one fade, and so do the plates that lie
   * between the two ends of an `implements` line, which would hide its far
   * end. Every other plate is whole.
   */
  function fadeTargets(state: MapState): void {
    const focused = state.distance === 'stack' ? undefined : tiers.get(state.tier ?? '')?.plate;
    const ends = focused ? selectionDrawing.endsOf(state.selection) : [];
    const between = (y: number): boolean =>
      ends.some(({ mark, cell }) => y > Math.min(mark.y, cell.y) && y < Math.max(mark.y, cell.y));
    for (const parts of tiers.values()) {
      parts.from = parts.opacity;
      const faded = focused !== undefined && (parts.plate.y > focused.y || between(parts.plate.y));
      parts.to = faded ? constants.fadedPlateOpacity : 1;
    }
  }

  /**
   * Takes the camera to its place for a state, and fades the plates above the
   * focused one. With `animate` off, or reduced motion on, both happen at once.
   */
  function goTo(state: MapState, animate: boolean): void {
    move += 1;
    const thisMove = move;
    cancelAnimationFrame(moveFrame);
    const still = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flightMs = still ? 0 : constants.flightMs;
    const fadeMs = still ? 0 : constants.fadeMs;

    const place = placeOf(state);
    const out = towardCamera(place.tiltDegrees, place.turnDegrees);
    const target = new Vector3(place.target.x, place.target.y, place.target.z);
    const position = target.clone().addScaledVector(new Vector3(out.x, out.y, out.z), place.range);
    fadeTargets(state);

    // The controls would hold a flying camera to their limits, so they stand
    // aside until it lands. A flight still under way stops where it is.
    // The renderer moves the camera for the whole flight but turns it toward
    // the target only for the first third, so step() keeps it aimed after that.
    controls.enabled = false;
    // The getter also gives the point the camera looks at, which its type leaves out.
    type Place = { x: number; y: number; z: number };
    const here = graph.cameraPosition() as Place & { lookAt: Place };
    graph.cameraPosition({ x: here.x, y: here.y, z: here.z }, here.lookAt, 0);
    if (flightMs > 0) graph.cameraPosition(position, target, flightMs);

    const start = performance.now();
    const step = (): void => {
      if (thisMove !== move) return;
      const elapsed = performance.now() - start;
      const faded = fadeMs > 0 ? Math.min(1, elapsed / fadeMs) : 1;
      for (const parts of tiers.values()) setTierOpacity(parts, parts.from + (parts.to - parts.from) * faded);
      if (elapsed < Math.max(flightMs, fadeMs)) {
        if (flightMs > 0 && elapsed >= flightMs / 3) camera.lookAt(target);
        notify();
        moveFrame = requestAnimationFrame(step);
        return;
      }
      camera.position.copy(position);
      controls.target.copy(target);
      camera.lookAt(target);
      applyLimits(limitsOf(state, place));
      controls.enabled = true;
      controls.update();
      notify();
    };
    step();
  }

  /** Sizes the picture to its container and keeps the stack clear of the insets. */
  function fitWindow(): boolean {
    windowSize.width = container.clientWidth;
    windowSize.height = container.clientHeight;
    // A hidden or collapsed container has no size to fit; the next resize fits it.
    if (windowSize.width === 0 || windowSize.height === 0) return false;
    // The orbit axis is drawn at the middle of the picture, and belongs at the
    // middle of the area inside the insets. So the picture is made larger than
    // the window by the difference between opposite insets, and the window
    // shows the part of it that puts the axis there.
    const extraX = constants.insetLeftPx - constants.insetRightPx;
    const extraY = constants.insetTopPx - constants.insetBottomPx;
    frame.width = windowSize.width + Math.abs(extraX);
    frame.height = windowSize.height + Math.abs(extraY);
    const besideX = (frame.width - (windowSize.width - constants.insetLeftPx - constants.insetRightPx)) / 2;
    const besideY = (frame.height - (windowSize.height - constants.insetTopPx - constants.insetBottomPx)) / 2;
    frame.inset = { top: besideY, right: besideX, bottom: besideY, left: besideX };
    origin.x = Math.min(0, extraX);
    origin.y = Math.min(0, extraY);
    canvasHost.style.left = `${origin.x}px`;
    canvasHost.style.top = `${origin.y}px`;
    graph.width(frame.width).height(frame.height);

    camera.fov = constants.fieldOfViewDegrees;
    // The outline widths are in screen pixels, so they follow the display's pixel ratio.
    for (const parts of tiers.values()) {
      for (const material of [...parts.marks.values(), parts.selected]) {
        material.uniforms.uPixelRatio!.value = renderer.getPixelRatio();
      }
    }
    ringMaterial.uniforms.uPixelRatio!.value = renderer.getPixelRatio();
    selectionDrawing.setPixelRatio(renderer.getPixelRatio());

    restRange = placeOf(AT_STACK).range;
    // One depth range for every distance. It is tight enough to keep marks
    // and plates apart in the depth buffer.
    camera.near = restRange / 20;
    camera.far = restRange * constants.farthestZoom * 4;
    camera.updateProjectionMatrix();
    return true;
  }

  function onResize(): void {
    const previous = restRange;
    const state = store.get();
    if (!fitWindow()) return;
    if (state.distance === 'stack' && previous > 0 && controls.enabled) {
      // Keeps the partner's zoom and angle at rest, as a share of the rest range.
      applyLimits(limitsOf(state, placeOf(state)));
      const out = camera.position.clone().sub(centre);
      camera.position.copy(centre).addScaledVector(out, restRange / previous);
      controls.update();
    } else {
      goTo(state, false);
    }
    notify();
  }

  /**
   * What decides the camera's place and the fade: the distance, the focus,
   * whether the detail card is open beside a focused plate or cell, and which
   * selection it is when the selection has `implements` lines to frame.
   */
  const placeKey = (state: MapState): string => {
    const { selection } = state;
    const framed = state.distance !== 'stack' && selectionDrawing.endsOf(selection).length > 0 ? selection?.id : null;
    return [state.distance, state.tier, state.cluster, state.distance !== 'stack' && selection !== null, framed].join('|');
  };

  if (fitWindow()) goTo(store.get(), false);
  selectionDrawing.show(store.get().selection);
  store.subscribe((state, before) => {
    hover(null);
    showSelectedMark();
    selectionDrawing.show(state.selection);
    if (placeKey(state) !== placeKey(before)) goTo(state, true);
    else notify();
  });

  controls.addEventListener('change', notify);
  new ResizeObserver(() => {
    if (container.clientWidth === windowSize.width && container.clientHeight === windowSize.height) return;
    onResize();
  }).observe(container);

  // Clicks and hover. A label is asked first; then the plates, cells and marks under the pointer.
  const pickables: Pickable[] = [];
  const raycaster = new Raycaster();
  const isFaded = (tier: string): boolean => partsOf(tier).to < 1;

  /** What lies under a point of the picture: a label's action, or a place on the stack, or nothing. */
  function under(x: number, y: number): { action: (() => void) | null; hit: StackHit | null } {
    for (const pickable of pickables) {
      const action = pickable(x, y);
      if (action) return { action, hit: null };
    }
    raycaster.setFromCamera(new Vector2((x / frame.width) * 2 - 1, 1 - (y / frame.height) * 2), camera);
    return { action: null, hit: pickOnStack(raycaster.ray, layout, isFaded) };
  }

  /** What a click on a point of the picture does, if anything. */
  function actionAt(x: number, y: number): { action: (() => void) | null; hit: StackHit | null } {
    const { action, hit } = under(x, y);
    return { action: action ?? (hit ? actionOn(hit) : null), hit };
  }

  /** What a click on a place of the stack does. */
  function actionOn({ tier, cluster, tool }: StackHit): (() => void) | null {
    const state = store.get();
    // From the stack, a click on a plate goes to its tier, wherever on the plate it lands.
    if (state.distance === 'stack' || tier !== state.tier) return () => store.focusTier(tier);
    // On the focused plate, a mark selects its tool and the rest of a cell selects its cluster.
    const selected = state.selection?.id;
    if (tool) return tool === selected ? null : () => store.select(tool);
    if (cluster) return cluster === selected ? null : () => store.select(cluster);
    // The focused plate, between its cells: from a cluster this is the way back to the tier.
    return state.distance === 'cluster' ? () => store.focusTier(tier) : null;
  }

  const pointerAt = (event: PointerEvent): { x: number; y: number } => {
    const box = canvasHost.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  let pressedAt: { x: number; y: number } | null = null;
  canvasHost.addEventListener('pointerdown', (event) => {
    pressedAt = event.button === 0 ? pointerAt(event) : null;
    hover(null);
  });
  canvasHost.addEventListener('pointerleave', () => hover(null));
  canvasHost.addEventListener('pointerup', (event) => {
    const released = pointerAt(event);
    const pressed = pressedAt;
    pressedAt = null;
    if (!pressed || Math.hypot(released.x - pressed.x, released.y - pressed.y) > CLICK_SLOP_PX) return;
    // A click during a flight would be picked against a camera that is still moving.
    if (!controls.enabled) return;
    actionAt(released.x, released.y).action?.();
  });
  canvasHost.addEventListener('pointermove', (event) => {
    // A camera in flight, or one the partner is turning, has no steady picture to hover over.
    if (event.buttons !== 0 || !controls.enabled) return;
    const at = pointerAt(event);
    const { action, hit } = actionAt(at.x, at.y);
    canvasHost.style.cursor = action ? 'pointer' : '';
    hover(hit?.tool ?? null, at);
  });

  const projected = new Vector3();
  return {
    add: (object) => void graph.scene().add(object),
    remove: (object) => void graph.scene().remove(object),
    camera,
    frame,
    window: windowSize,
    origin,
    toPicture(point) {
      camera.updateMatrixWorld();
      projected.copy(point).project(camera);
      return { x: ((projected.x + 1) / 2) * frame.width, y: ((1 - projected.y) / 2) * frame.height };
    },
    onCameraChange(listener) {
      listeners.push(listener);
      listener();
    },
    addPickable: (pickable) => void pickables.push(pickable),
    applyConstants() {
      if (fitWindow()) goTo(store.get(), false);
      notify();
    },
  };
}
