/**
 * scene: draws plates, cells and marks from the layout, and moves the camera
 * between the three distances.
 *
 * At rest the camera stands at a turn, so each plate runs back from its near
 * end and the stack reads as a solid, and as near as holds every plate and
 * every tier label inside the window's insets.
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
import { FLAT_CORNERS, pictureOf, pixelsPerTangent, radians, towardCamera, placeToFit, placeToFitPoints } from './camera';
import type { Box, Frame, Region, CameraPlace } from './camera';
import type { Constants } from './constants';
import { createDepthBlur } from './depth-blur';
import type { GraphIndex } from './data';
import { DECISION_STEPS, decisionStep } from './display';
import type { DecisionStep } from './display';
import { createHoverLabel } from './hover-label';
import { listShape, staircaseHeight, standingStretch, tierLabelBlock, tierNamesFit } from './label-layout';
import type { CellLayout, MarkLayout, PlateLayout, Point, StackLayout } from './layout';
import { MARK_LIFT, MARK_SHARE_OF_QUAD, OVER_THE_MARKS, blendMaterial, markMaterial } from './mark-material';
import { AT_ONCE, durationsNow, fadeMsBetween, hold, run } from './motion';
import {
  hasBar,
  namesFitFor,
  openPanelsOf,
  pageIsZoomed,
  pageLayoutAt,
  pictureMarginsAt,
  pictureRoomAt,
  restAngleAt,
  restInsetsAt,
} from './page-layout';
import { pickOnStack } from './pick';
import type { StackHit } from './pick';
import { createPress } from './press';
import type { PressPoint, PressPointer } from './press';
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
  /**
   * Whether the camera's place at rest leaves each tier's label the room for its name. Where it
   * does not, the stack has taken that room, and only the counts have a place beside it.
   */
  tierNamesHaveRoom(): boolean;
  /**
   * The camera's view at rest for the state the map is in: it gives where a point of the scene is
   * then drawn, in pixels of the window. A label asks it for the room it has at rest, however the
   * stack is turned.
   */
  restView(): (point: Vector3) => { x: number; y: number };
  /**
   * What the selected tool's mark or the selected cluster's cell covers, in pixels of the window; null with
   * nothing selected, or a need. The screenshot script checks that no panel lies over it.
   */
  selectionRect(): { left: number; top: number; right: number; bottom: number } | null;
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
  const hoverLabel = createHoverLabel(container);
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

  /**
   * Shows the ring and the label for a tool's mark, with the pointer at a point of the picture. Null hides both.
   * @param byFinger Whether a finger held in place asked for it. The label then stands clear of the finger.
   */
  function hover(toolId: string | null, at?: PressPoint, byFinger = false): void {
    const tool = toolId === null ? undefined : index.tool(toolId);
    hovered = tool ? (markOf.get(tool.id) ?? null) : null;
    ring.visible = hovered !== null;
    if (!tool || !hovered || !at) {
      hoverLabel.hide();
      return;
    }
    placeHoverRing();
    // An open detail card at the right covers that side of the window, and the bar its top: the label keeps clear of both.
    const room = pictureRoomAt(windowSize, constants, openPanelsOf(store.get()));
    // At the cluster distance the breadcrumb already names the focused cluster.
    const cluster = tool.cluster === store.get().cluster ? null : (index.cluster(tool.cluster)?.label ?? null);
    const offsetPx = byFinger ? constants.fingerLabelOffsetPx : constants.hoverLabelOffsetPx;
    hoverLabel.show(at.x + origin.x, at.y + origin.y, room, tool.label, cluster, offsetPx);
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

  /** Every corner of every plate: of its top face, and of its underside. */
  const plateCorners: Point[] = layout.plates.flatMap((plate) =>
    [0, constants.plateThickness].flatMap((under) =>
      FLAT_CORNERS.map(([alongX, alongZ]) => ({
        x: plate.x + (alongX * plate.width) / 2,
        y: plate.y - under,
        z: plate.z + (alongZ * plate.depth) / 2,
      })),
    ),
  );

  /**
   * The corners of what the tier labels cover at rest, where each stands at the left end of its
   * plate: in the full and the compact layout. A label keeps its size on screen, so what it
   * covers in the scene follows from how many layout units a pixel is.
   * @param names Whether each label has its name under its count.
   */
  function tierLabelCorners(
    unitsPerPixel: number,
    angle: { tiltDegrees: number; turnDegrees: number },
    names: boolean,
  ): Point[] {
    const stretch = standingStretch(angle.tiltDegrees, angle.turnDegrees);
    const block = tierLabelBlock(constants, names);
    return layout.plates.flatMap((plate) =>
      [block.near, block.far].flatMap((along) =>
        [block.above, -block.below].map((over) => ({
          x: layout.bounds.min.x - along * stretch.along * unitsPerPixel,
          y: plate.y + over * stretch.up * unitsPerPixel,
          z: plate.z,
        })),
      ),
    );
  }

  /** The least height from one plate to the next. */
  const plateSpacing = Math.min(
    Infinity,
    ...layout.plates.flatMap((plate) => layout.plates.map((other) => Math.abs(plate.y - other.y)).filter((apart) => apart > 0)),
  );

  /**
   * Where the camera stands at rest for a state: turned a little, so the stack reads as a solid,
   * and as near as holds every plate inside the rest insets and clear of the open panels. The
   * tier labels stand in the left inset, and are held between the top and the bottom.
   *
   * Where the plates then stand too close on screen for the tier names, as beside a detail
   * card in a window that is not wide, the names are left out. The stack takes the room they
   * would have had, and `names` is false.
   */
  function restFit(state: MapState): { place: CameraPlace; names: boolean } {
    const room = pictureRoomAt(windowSize, constants, openPanelsOf(state));
    const inset = restInsetsAt(windowSize, constants);
    const angle = restAngleAt(windowSize, constants);
    const field = constants.fieldOfViewDegrees;
    const pixelsPerTan = pixelsPerTangent(frame.height, field);
    const fit = (left: number, names: boolean | null): CameraPlace => {
      const region = inPicture(left, inset.top, room.right - inset.right, room.bottom - inset.bottom);
      const within = (labels: Point[]): CameraPlace =>
        placeToFitPoints(plateCorners, labels, centre, frame, region, field, angle.tiltDegrees, angle.turnDegrees);
      let place = within([]);
      if (names === null) return place;
      // What the labels cover follows from the camera's range, and the range from what they cover.
      // The labels are about a sixth of the fit, so each round leaves a sixth of the error before
      // it, and five rounds settle it to well under a pixel.
      for (let round = 0; round < 5; round += 1) {
        place = within(tierLabelCorners(place.range / pixelsPerTan, angle, names));
      }
      return place;
    };
    // Under the bar no label stands beside the stack.
    if (hasBar(pageLayoutAt(windowSize, constants))) return { place: fit(inset.left, null), names: false };
    const withNames = fit(inset.left, true);
    const apartPx = (plateSpacing * Math.sin(radians(angle.tiltDegrees)) * pixelsPerTan) / withNames.range;
    if (tierNamesFit(apartPx, constants)) return { place: withNames, names: true };
    return { place: fit(inset.left - (constants.labelColumnPx - constants.labelCountPx), false), names: false };
  }

  /**
   * Where the camera stands for a state. At rest the whole stack fits inside
   * the insets, with its tier labels. At the tier distance the focused plate stands under the room
   * its cluster names need, and at the cluster distance the focused cell
   * stands under the room its tool names need. A selection with `implements`
   * lines has their far ends in the picture too. A need's detail card opens at
   * the stack distance: the whole stack then stands clear of it, so every
   * traced tool is in the picture, whatever tiers the trace spans. While the
   * phase scrub is on, the picture keeps clear of the phase strip.
   */
  function placeOf(state: MapState): CameraPlace {
    const field = constants.fieldOfViewDegrees;
    // The rail or the bar, an open detail card and the phase strip each cover a part of the window, and
    // the plate or cell stands clear of them all. Beside the card the legend may take a second row, and
    // the strip stands over that.
    const room = pictureRoomAt(windowSize, constants, openPanelsOf(state));
    const margins = pictureMarginsAt(windowSize, constants);
    // Under the bar, names with no room are left out, and the plate or cell has the room to itself.
    const named = namesFitFor(state, index, windowSize, constants);
    const cell = state.distance === 'cluster' ? cellOf.get(state.cluster ?? '') : undefined;
    if (cell) {
      const names = listShape(index.toolsOf(cell.cluster).length, constants.toolListMostRows);
      const listRoom = named ? names.rows * constants.toolRowPx + constants.toolListGapPx : 0;
      const framed = holding(flat(cell), selectionDrawing.reachOf(state.selection));
      const fit = (roomAbove: number): CameraPlace =>
        placeToFit(
          framed,
          frame,
          inPicture(
            room.left + margins.side,
            room.top + margins.top + roomAbove,
            room.right - margins.side,
            room.bottom - margins.bottom,
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
      const region = inPicture(
        room.left + margins.side,
        room.top + margins.top + (named ? staircaseHeight(names, constants.clusterRowPx, constants.clusterNameGapPx) : 0),
        // The last cluster's name runs on past the plate.
        room.right - (named ? constants.tierInsetRightPx : margins.side),
        room.bottom - margins.bottom,
      );
      return placeToFit(flat(plate), frame, region, field, constants.tierTiltDegrees, 0, {
        mostPixelsPerUnit: constants.tierMostPixelsPerUnit,
        align: 'top',
      });
    }
    return restFit(state).place;
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
    // The insets follow the page layout: the stack takes the room the rail gives up.
    const inset = restInsetsAt(windowSize, constants);
    const extraX = inset.left - inset.right;
    const extraY = inset.top - inset.bottom;
    frame.width = windowSize.width + Math.abs(extraX);
    frame.height = windowSize.height + Math.abs(extraY);
    const besideX = (frame.width - (windowSize.width - inset.left - inset.right)) / 2;
    const besideY = (frame.height - (windowSize.height - inset.top - inset.bottom)) / 2;
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
    const layoutBefore = pageLayoutAt(windowSize, constants);
    const state = store.get();
    if (!fitWindow()) return;
    // A window that comes under the bar, leaves it, or is turned under it, as a phone is, has its panels
    // somewhere else and its stack at another tilt: the camera takes its place anew.
    const layoutNow = pageLayoutAt(windowSize, constants);
    const panelsStay = layoutNow === layoutBefore || (!hasBar(layoutNow) && !hasBar(layoutBefore));
    if (state.distance === 'stack' && previous > 0 && controls.enabled && panelsStay) {
      // Keeps the partner's zoom and angle at rest, as a share of the rest range, about the
      // point the camera now looks at when it is at rest.
      const place = placeOf(state);
      applyLimits(limitsOf(state, place));
      const out = camera.position.clone().sub(controls.target);
      controls.target.set(place.target.x, place.target.y, place.target.z);
      camera.position.copy(controls.target).addScaledVector(out, restRange / previous);
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

  /**
   * What lies under a point of the picture for a finger, which is no point: the nearest mark within
   * `reachPx` of it counts as under it.
   */
  const underFinger = (x: number, y: number, reachPx: number): StackHit | null => {
    raycaster.setFromCamera(new Vector2((x / frame.width) * 2 - 1, 1 - (y / frame.height) * 2), camera);
    const { target } = controls;
    return pickOnStack(raycaster.ray, layout, isFaded, reachPx * unitsPerPixelAt(target.x, target.y, target.z));
  };

  /**
   * What a tap of a finger on a point of the picture does. A label is asked first, as for a click. A
   * mark drawn too small for a finger is passed over, so the tap is on its cell: a finger then goes
   * in one step at a time, from a plate to a cell to a mark. A mark large enough is met from a little
   * way off, so a tap between two marks is not lost.
   */
  function fingerActionAt(x: number, y: number): (() => void) | null {
    const { action } = under(x, y);
    if (action) return action;
    const hit = underFinger(x, y, constants.fingerTapReachPx);
    if (!hit) return null;
    const mark = hit.tool === null ? undefined : markOf.get(hit.tool);
    const tooSmall = mark !== undefined && mark.size / unitsPerPixelAt(mark.x, mark.y, mark.z) < constants.fingerMarkPx;
    return actionOn(tooSmall ? { ...hit, tool: null } : hit);
  }

  // A press is a tap, a drag, a hold or a pinch: src/press.ts tells which. The orbit controls turn
  // the stack with a drag and change the distance with a pinch, on their own.
  const press = createPress(
    { slopPx: constants.clickSlopPx, touchSlopPx: constants.touchSlopPx, holdMs: constants.holdMs },
    {
      tap(at, byFinger) {
        // A tap during a flight would be picked against a camera that is still moving.
        if (!controls.enabled) return;
        (byFinger ? fingerActionAt(at.x, at.y) : actionAt(at.x, at.y).action)?.();
      },
      // A finger held in place shows what a mouse's hover shows. It stays until the next press, or until the finger drags on.
      hold(at) {
        if (!controls.enabled) return;
        hover(underFinger(at.x, at.y, constants.fingerHoldReachPx)?.tool ?? null, at, true);
        heldAt = hovered ? at : null;
      },
    },
  );
  /** Where a finger is held in place with the hover label on show, until it lets go. */
  let heldAt: PressPoint | null = null;
  const pointerOf = (event: PointerEvent): PressPointer => {
    const box = canvasHost.getBoundingClientRect();
    return {
      id: event.pointerId,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      touch: event.pointerType === 'touch',
      primary: event.button === 0,
    };
  };
  canvasHost.addEventListener('pointerdown', (event) => {
    press.down(pointerOf(event));
    hover(null);
  });
  // A press ends wherever its pointer is let go. Let go on the canvas, it may be a tap. Let go anywhere
  // else, as over a panel, it is over and no tap: or the press would count that pointer as down for ever,
  // and take the next finger for the second of a pinch.
  window.addEventListener('pointerup', (event) => {
    heldAt = null;
    if (event.target instanceof Node && canvasHost.contains(event.target)) press.up(pointerOf(event));
    else press.cancel(event.pointerId);
  });
  window.addEventListener('pointercancel', (event) => {
    heldAt = null;
    press.cancel(event.pointerId);
  });
  // A finger leaves the canvas when it is lifted, and what it held in place to see stays.
  canvasHost.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch') hover(null);
  });
  canvasHost.addEventListener('pointermove', (event) => {
    const at = pointerOf(event);
    press.move(at);
    // A held finger that drags on turns the stack, and the label would be left where the mark no longer is.
    if (heldAt && Math.hypot(at.x - heldAt.x, at.y - heldAt.y) > constants.touchSlopPx) {
      heldAt = null;
      hover(null);
    }
    // A finger has no hover. A camera in flight, or one the partner is turning, has no steady picture to hover over.
    if (at.touch || event.buttons !== 0 || !controls.enabled) return;
    const { action, hit } = actionAt(at.x, at.y);
    canvasHost.style.cursor = action ? 'pointer' : '';
    hover(hit?.tool ?? null, at);
  });

  // While the page itself is zoomed, as a partner with low vision may zoom it, a gesture on the
  // canvas moves the page, as it does anywhere else: or the canvas would hold the partner in the
  // zoomed page. At the page's own size the canvas takes every gesture, so none scrolls or zooms the page.
  const viewport = window.visualViewport;
  const followPageZoom = (): void => {
    renderer.domElement.style.touchAction = pageIsZoomed() ? 'auto' : 'none';
  };
  viewport?.addEventListener('resize', followPageZoom);
  followPageZoom();

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
    tierNamesHaveRoom: () => restFit(store.get()).names,
    restView() {
      const { place } = restFit(store.get());
      return (point) => {
        const at = pictureOf(point, place, frame, constants.fieldOfViewDegrees);
        return { x: at.x + origin.x, y: at.y + origin.y };
      };
    },
    selectionRect() {
      const { selection } = store.get();
      const drawn = selection?.type === 'tool' ? markOf.get(selection.id) : selection?.type === 'cluster' ? cellOf.get(selection.id) : undefined;
      if (!drawn) return null;
      const [width, depth] = 'size' in drawn ? [drawn.size, drawn.size] : [drawn.width, drawn.depth];
      const rect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      for (const [alongX, alongZ] of FLAT_CORNERS) {
        const at = this.toPicture(projected.set(drawn.x + (alongX * width) / 2, drawn.y, drawn.z + (alongZ * depth) / 2));
        rect.left = Math.min(rect.left, at.x + origin.x);
        rect.right = Math.max(rect.right, at.x + origin.x);
        rect.top = Math.min(rect.top, at.y + origin.y);
        rect.bottom = Math.max(rect.bottom, at.y + origin.y);
      }
      return rect;
    },
    applyConstants() {
      if (fitWindow()) goTo(store.get(), false);
      notify();
    },
  };
}
