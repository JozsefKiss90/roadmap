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
 * A mark of a tool that the lens or the filters leave out is drawn in the
 * faded state: it keeps its form and its place. A traced mark takes the
 * selected fill, and src/trace-drawing.ts draws the rest of a need trace,
 * with the ring that marks the selected tool while a need is traced.
 *
 * The mark under the pointer gets a ring and a hover label, and the selected
 * tool's mark takes the selected fill. src/selection-drawing.ts draws the
 * rest of the selection: a selected cell's outline and the `implements`
 * lines. The camera frames both ends of those lines, and the plates that lie
 * between the ends fade.
 *
 * Every change takes its duration from src/motion.ts. The renderer's own
 * camera transition flies the camera. A plate fades, and a mark changes form,
 * as a fade: a mark that changes form is drawn as a mix of the two forms, in
 * place. At the tier and cluster distances src/depth-blur.ts blurs the plates
 * under the focused one a little.
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
import { createDepthBlur } from './depth-blur';
import type { GraphIndex } from './data';
import { DECISION_STEPS, decisionStep } from './display';
import type { DecisionStep } from './display';
import { createHoverLabel } from './hover-label';
import { listShape, staircaseHeight } from './label-layout';
import type { CellLayout, MarkLayout, PlateLayout, StackLayout } from './layout';
import { MARK_LIFT, MARK_SHARE_OF_QUAD, OVER_THE_MARKS, blendMaterial, markMaterial } from './mark-material';
import { AT_ONCE, durationsNow, fadeMsBetween, hold, run } from './motion';
import { insetLeftPxAt, railPxAt } from './page-layout';
import { pickOnStack } from './pick';
import type { StackHit } from './pick';
import { createSelectionDrawing } from './selection-drawing';
import { createTraceDrawing } from './trace-drawing';
import { AT_STACK, scrubbedPhaseOf, tracedNeedOf, traces } from './state';
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
  /** The same forms in the faded state, for the marks the filters leave out. */
  fadedMarks: Map<DecisionStep, ShaderMaterial>;
  /** The material of the tier's selected mark. */
  selected: ShaderMaterial;
  /** Every object drawn for the tier: its plate, its lines and its marks. */
  objects: Object3D[];
  /** How opaque the tier is now, from 0 to 1, and where its fade started and ends. */
  opacity: number;
  from: number;
  to: number;
  /** How blurred the tier's plate is now, from 0 to 1, and where that change started and ends. */
  blur: number;
  blurFrom: number;
  blurTo: number;
  /** The materials of marks that are changing form, by the material they had and the one they take. */
  blends: Map<ShaderMaterial, Map<ShaderMaterial, ShaderMaterial>>;
}

/** Every material a tier's marks are drawn with. */
const markMaterialsOf = (parts: TierParts): ShaderMaterial[] => [
  ...parts.marks.values(),
  ...parts.fadedMarks.values(),
  parts.selected,
];

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
  for (const material of markMaterialsOf(parts)) material.uniforms.uOpacity!.value = opacity;
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
    const fadedMarks = new Map<DecisionStep, ShaderMaterial>(
      DECISION_STEPS.map((step) => [step, markMaterial(MARK_TOKEN_OF_STEP[step], renderer.getPixelRatio(), true)]),
    );
    const selected = markMaterial(SELECTED_MARK, renderer.getPixelRatio());
    const objects: Object3D[] = [];
    tiers.set(plate.tier, {
      plate,
      fill,
      lines: [edge, cellLine],
      marks,
      fadedMarks,
      selected,
      objects,
      opacity: 1,
      from: 1,
      to: 1,
      blur: 0,
      blurFrom: 0,
      blurTo: 0,
      blends: new Map(),
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
  // The depth blur draws the scene itself, straight to the screen, so the renderer's own
  // render pass stands aside. Drawn through the composer's buffers, the scene would lose
  // its antialiasing, and its see-through colours would be mixed in another colour space.
  const depthBlur = createDepthBlur(graph.scene(), camera, layout.plates, constants.plateThickness);
  const composer = graph.postProcessingComposer();
  for (const pass of composer.passes) pass.enabled = false;
  composer.addPass(depthBlur.pass);

  const partsOf = (tier: string): TierParts => {
    const parts = tiers.get(tier);
    if (!parts) throw new Error(`The layout has no plate for the tier "${tier}".`);
    return parts;
  };

  // Marks. One flat square per tool, in the material of its tier and its decision-class step.
  const markOf = new Map<string, MarkLayout>(layout.marks.map((mark) => [mark.tool, mark]));
  const cellOf = new Map<string, CellLayout>(layout.cells.map((cell) => [cell.cluster, cell]));
  const meshes = new Map<string, { mesh: Mesh; node: MarkNode }>();
  /**
   * The material of a mark for a state: the selected fill for the selected
   * tool, the faded form for a tool the lens or the filters leave out, the
   * selected fill again for a traced tool, and otherwise the form of its step.
   * While a need is traced, or a phase is shown, the selected fill means
   * "traced" alone: the selected tool keeps the form the lens gives it, and
   * takes a ring.
   */
  function materialOf(mark: MarkNode, state: MapState): ShaderMaterial {
    const parts = partsOf(mark.tier);
    const selected = state.selection?.type === 'tool' && state.selection.id === mark.id;
    if (selected && !traces(state.lens)) return parts.selected;
    if (!index.emphasised(state).has(mark.id)) return parts.fadedMarks.get(mark.step)!;
    return index.traced(state.lens).has(mark.id) ? parts.selected : parts.marks.get(mark.step)!;
  }
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
      // A mark is made in the form the state gives it, so the page may open with a selection or a filter.
      const mesh = new Mesh(square, materialOf(mark, store.get()));
      meshes.set(mark.id, { mesh, node: mark });
      mesh.scale.setScalar(mark.size / MARK_SHARE_OF_QUAD);
      mesh.renderOrder = parts.opacity >= 1 ? 0 : UNDER_THE_REST;
      parts.objects.push(mesh);
      return mesh;
    })
    .graphData({ nodes, links: [] });

  // A need trace: the home cell's outline, the lines to the traced tools and the best-fit rings.
  const traceDrawing = createTraceDrawing((object) => void graph.scene().add(object), index, layout, renderer.getPixelRatio());

  /** How far the marks that are changing form have come, from 0 to 1. Every one of them reads it. */
  const markMix = { value: 0 };
  /** The marks that are changing form, and the material each of them ends in. */
  let changing: { mesh: Mesh; to: ShaderMaterial }[] = [];
  let stopMarkFade = (): void => {};

  /** The material of a mark of a tier on its way from one material to another. */
  function blendOf(parts: TierParts, from: ShaderMaterial, to: ShaderMaterial): ShaderMaterial {
    let fromHere = parts.blends.get(from);
    if (!fromHere) parts.blends.set(from, (fromHere = new Map()));
    let blend = fromHere.get(to);
    if (!blend) fromHere.set(to, (blend = blendMaterial(from, to, markMix)));
    return blend;
  }

  /** Gives every mark that was changing form the material it ends in. */
  function landMarks(): void {
    for (const { mesh, to } of changing) mesh.material = to;
    changing = [];
  }

  /**
   * Gives every mark the material the state asks for, and draws the state's
   * need trace. A mark that changes form fades from the one to the other over
   * `ms`, in place. A change still under way is finished first.
   * @param retraced Whether the trace is another one than before, which fades in with the marks.
   */
  function dressMarks(state: MapState, ms: number, retraced: boolean): void {
    stopMarkFade();
    landMarks();
    for (const { mesh, node } of meshes.values()) {
      const from = mesh.material as ShaderMaterial;
      const to = materialOf(node, state);
      if (from === to) continue;
      mesh.material = blendOf(partsOf(node.tier), from, to);
      changing.push({ mesh, to });
    }
    traceDrawing.show(state);
    stopMarkFade = run(
      ms,
      (progress) => {
        markMix.value = progress;
        traceDrawing.setOpacity(retraced ? progress : 1);
      },
      landMarks,
    );
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

  /** How many layout units one pixel of the picture covers at a point of the scene. */
  function unitsPerPixelAt(x: number, y: number, z: number): number {
    camera.getWorldDirection(forward);
    const depth = fromCamera.set(x, y, z).sub(camera.position).dot(forward);
    return (2 * depth * Math.tan(radians(camera.fov) / 2)) / frame.height;
  }

  /** Sizes the ring so that it stands its gap clear of the mark, in pixels on screen. */
  function placeHoverRing(): void {
    if (!hovered) return;
    ring.position.set(hovered.x, hovered.y + MARK_LIFT * 1.5, hovered.z);
    const unitsPerPixel = unitsPerPixelAt(ring.position.x, ring.position.y, ring.position.z);
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
  const listeners: (() => void)[] = [placeHoverRing, () => traceDrawing.place(unitsPerPixelAt)];
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
   * lines has their far ends in the picture too. A need's detail card opens at
   * the stack distance: the whole stack then stands clear of it, so every
   * traced tool is in the picture, whatever tiers the trace spans. While the
   * phase scrub is on, the picture keeps clear of the phase strip.
   */
  function placeOf(state: MapState): CameraPlace {
    const field = constants.fieldOfViewDegrees;
    // The rail covers the left of the window and an open detail card the right, so the plate or cell stands clear of both.
    const card = state.selection ? constants.detailCardPx : 0;
    // Beside the card the legend may take a second row, and the strip stands over that.
    const strip =
      scrubbedPhaseOf(state.lens) === null ? 0 : constants.phaseStripPx + (card > 0 ? constants.legendSecondRowPx : 0);
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
            railPxAt(windowSize.width, constants) + constants.nearInsetSidePx,
            constants.annotationTopPx + roomAbove,
            windowSize.width - constants.nearInsetSidePx - card,
            windowSize.height - constants.insetBottomPx - strip,
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
        railPxAt(windowSize.width, constants) + constants.nearInsetSidePx,
        top,
        windowSize.width - constants.tierInsetRightPx - card,
        windowSize.height - constants.insetBottomPx - strip,
      );
      return placeToFit(flat(plate), frame, region, field, constants.tierTiltDegrees, 0, {
        mostPixelsPerUnit: constants.tierMostPixelsPerUnit,
        align: 'top',
      });
    }
    const region = {
      left: frame.inset.left,
      top: frame.inset.top,
      right: frame.width - frame.inset.right - card,
      bottom: frame.height - frame.inset.bottom - strip,
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
  let stopPlateFade = (): void => {};
  let landFlight = (): void => {};

  /**
   * The plates above the focused one fade, and so do the plates that lie
   * between the two ends of an `implements` line, which would hide its far
   * end. Every other plate is whole. A whole plate under the focused one is
   * blurred, the more the further under it lies, unless a line ends on it.
   * While a need is traced no plate is blurred: the trace's lines cross the
   * plates under the focused one, and a blurred line is too pale to follow.
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
      parts.blurFrom = parts.blur;
      const under = focused === undefined ? 0 : focused.y - parts.plate.y;
      const holdsAnEnd = ends.some(({ mark, cell }) => mark.y === parts.plate.y || cell.y === parts.plate.y);
      const blurred = constants.depthBlur && under > 0 && !faded && !holdsAnEnd && tracedNeedOf(state.lens) === null;
      parts.blurTo = blurred ? Math.min(1, under / constants.depthBlurFullAt) : 0;
    }
  }

  /** Takes every plate to the opacity and the blur a state gives it, over `ms`. A fade still under way stops where it is. */
  function fadePlates(state: MapState, ms: number): void {
    stopPlateFade();
    fadeTargets(state);
    stopPlateFade = run(ms, (progress) => {
      for (const parts of tiers.values()) {
        setTierOpacity(parts, parts.from + (parts.to - parts.from) * progress);
        parts.blur = parts.blurFrom + (parts.blurTo - parts.blurFrom) * progress;
        // Only a whole plate hides what is under it. A plate that is fading, in or out, is not
        // blurred and leaves the blur of the plates under it as it is.
        depthBlur.setAmount(parts.plate.tier, parts.opacity < 1 ? null : parts.blur);
      }
    });
  }

  /**
   * Takes the camera to its place for a state, fades the plates above the
   * focused one and blurs the plates under it. With `animate` off, or reduced
   * motion on, all of it happens at once.
   */
  function goTo(state: MapState, animate: boolean): void {
    move += 1;
    const thisMove = move;
    cancelAnimationFrame(moveFrame);
    landFlight();
    const { flightMs, fadeMs } = animate ? durationsNow() : AT_ONCE;

    const place = placeOf(state);
    const out = towardCamera(place.tiltDegrees, place.turnDegrees);
    const target = new Vector3(place.target.x, place.target.y, place.target.z);
    const position = target.clone().addScaledVector(new Vector3(out.x, out.y, out.z), place.range);

    fadePlates(state, fadeMs);

    // The controls would hold a flying camera to their limits, so they stand
    // aside until it lands. A flight still under way stops where it is.
    // The renderer moves the camera for the whole flight but turns it toward
    // the target only for the first third, so step() keeps it aimed after that.
    controls.enabled = false;
    // The getter also gives the point the camera looks at, which its type leaves out.
    type Place = { x: number; y: number; z: number };
    const here = graph.cameraPosition() as Place & { lookAt: Place };
    graph.cameraPosition({ x: here.x, y: here.y, z: here.z }, here.lookAt, 0);
    if (flightMs > 0) {
      graph.cameraPosition(position, target, flightMs);
      landFlight = hold();
    }

    const start = performance.now();
    const step = (): void => {
      if (thisMove !== move) return;
      const elapsed = performance.now() - start;
      if (elapsed < flightMs) {
        if (elapsed >= flightMs / 3) camera.lookAt(target);
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
      landFlight();
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
    // In the compact layout the rail is a column of icons, and the stack takes the room it gives up.
    const insetLeftPx = insetLeftPxAt(windowSize.width, constants);
    const extraX = insetLeftPx - constants.insetRightPx;
    const extraY = constants.insetTopPx - constants.insetBottomPx;
    frame.width = windowSize.width + Math.abs(extraX);
    frame.height = windowSize.height + Math.abs(extraY);
    const besideX = (frame.width - (windowSize.width - insetLeftPx - constants.insetRightPx)) / 2;
    const besideY = (frame.height - (windowSize.height - constants.insetTopPx - constants.insetBottomPx)) / 2;
    frame.inset = { top: besideY, right: besideX, bottom: besideY, left: besideX };
    origin.x = Math.min(0, extraX);
    origin.y = Math.min(0, extraY);
    canvasHost.style.left = `${origin.x}px`;
    canvasHost.style.top = `${origin.y}px`;
    graph.width(frame.width).height(frame.height);

    camera.fov = constants.fieldOfViewDegrees;
    depthBlur.setSpreadPx(constants.depthBlurPx);
    // The outline widths are in screen pixels, so they follow the display's pixel ratio.
    for (const parts of tiers.values()) {
      for (const material of markMaterialsOf(parts)) material.uniforms.uPixelRatio!.value = renderer.getPixelRatio();
    }
    ringMaterial.uniforms.uPixelRatio!.value = renderer.getPixelRatio();
    selectionDrawing.setPixelRatio(renderer.getPixelRatio());
    traceDrawing.setPixelRatio(renderer.getPixelRatio());

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
   * whether the detail card is open, whether the phase strip is on the page,
   * and which selection it is when the selection has `implements` lines to
   * frame.
   */
  const placeKey = (state: MapState): string => {
    const { selection } = state;
    const framed = state.distance !== 'stack' && selectionDrawing.endsOf(selection).length > 0 ? selection?.id : null;
    return [state.distance, state.tier, state.cluster, selection !== null, framed, scrubbedPhaseOf(state.lens) !== null].join('|');
  };

  if (fitWindow()) goTo(store.get(), false);
  selectionDrawing.show(store.get().selection, traces(store.get().lens));
  traceDrawing.show(store.get());
  store.subscribe((state, before) => {
    hover(null);
    if (state.selection !== before.selection || state.filters !== before.filters || state.lens !== before.lens) {
      const fadeMs = fadeMsBetween(before.lens, state.lens, durationsNow());
      dressMarks(state, fadeMs, tracedNeedOf(state.lens) !== tracedNeedOf(before.lens));
    }
    selectionDrawing.show(state.selection, traces(state.lens));
    if (placeKey(state) !== placeKey(before)) goTo(state, true);
    else {
      // A need that comes or goes where the camera stays still takes the blur off the plates, or gives it back.
      const traced = tracedNeedOf(state.lens) !== null;
      if (traced !== (tracedNeedOf(before.lens) !== null)) fadePlates(state, durationsNow().fadeMs);
      notify();
    }
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
    // A traced mark at full strength selects its tool from any distance, and the trace stays on.
    const traced = tool !== null && index.traced(state.lens).has(tool) && index.emphasised(state).has(tool);
    if (tool && traced && tool !== state.selection?.id) return () => store.select(tool);
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
