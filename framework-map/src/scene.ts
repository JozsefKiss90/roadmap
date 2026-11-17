/**
 * scene: draws plates, cells and marks from the layout.
 *
 * 3d-force-graph is the renderer and the camera (ADR 0002). Every mark is one
 * of its nodes, pinned where the layout put it; no simulation runs and no link
 * is drawn. Plates and cells are plain objects added to its scene.
 */
import ForceGraph3D from '3d-force-graph';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { radians, rangeToFit, towardCamera } from './camera';
import type { Frame } from './camera';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { DECISION_STEPS, decisionStep } from './display';
import type { DecisionStep } from './display';
import type { ToolNode } from './graph';
import type { StackLayout } from './layout';
import { MAP_TOKENS, MARK_TOKEN_OF_STEP, PAGE_ROLE, colourOf } from './tokens';
import type { LineToken, MarkToken } from './tokens';

/** What the rest of the map needs from the scene. */
export interface Stage {
  /** Adds an object to the scene. */
  add(object: Object3D): void;
  readonly camera: PerspectiveCamera;
  /** The canvas, in pixels, and the margins the stack keeps clear inside it. */
  readonly frame: Frame;
  /** Runs `listener` now and whenever the camera moves or the window changes size. */
  onCameraChange(listener: () => void): void;
  /** Applies changed constants: the lens, the tilt and zoom limits, and the view at rest. */
  applyConstants(): void;
}

/** A mark as a node of the renderer: pinned, so it carries `fx`, `fy`, `fz`. */
interface MarkNode {
  id: string;
  step: DecisionStep;
  size: number;
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
}

/** How far a mark is lifted off its plate, so the two never share a depth. */
const MARK_LIFT = 0.02;
/** The mark's square is drawn inside a larger one, which leaves room to soften its edge. */
const MARK_SHARE_OF_QUAD = 0.8;

const MARK_VERTEX = /* glsl */ `
  varying vec2 vAt;
  void main() {
    vAt = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Draws one mark: a square with a fill, an outline, or both. The outline's
// width is in pixels on screen, whatever the camera's distance and tilt.
const MARK_FRAGMENT = /* glsl */ `
  uniform vec3 uFill;
  uniform float uFillAlpha;
  uniform vec3 uOutline;
  uniform float uOutlinePx;
  uniform float uDashed;
  uniform float uPixelRatio;
  varying vec2 vAt;

  // Where the mark's edge lies, with the quad's own edge at 1.
  const float MARK_EDGE = ${MARK_SHARE_OF_QUAD.toFixed(3)};
  // A dashed side is drawn at its two ends and left open in the middle.
  const float DASH_GAP = 0.36;

  void main() {
    vec2 perPixel = vec2(length(vec2(dFdx(vAt.x), dFdy(vAt.x))), length(vec2(dFdx(vAt.y), dFdy(vAt.y))));
    // Pixels from here to the mark's edge, along each axis. Positive inside.
    vec2 toEdge = (MARK_EDGE - abs(vAt)) / perPixel;
    float inset = min(toEdge.x, toEdge.y);
    float shape = clamp(inset + 0.5, 0.0, 1.0);
    float outlinePx = uOutlinePx * uPixelRatio;
    float inner = clamp(inset - outlinePx + 0.5, 0.0, 1.0);

    // Along the nearest side: 0 at its middle, 1 at its ends.
    bool nearestIsUpright = toEdge.x < toEdge.y;
    float along = (nearestIsUpright ? abs(vAt.y) : abs(vAt.x)) / MARK_EDGE;
    float alongPerPixel = (nearestIsUpright ? perPixel.y : perPixel.x) / MARK_EDGE;
    float dash = clamp((along - DASH_GAP) / alongPerPixel + 0.5, 0.0, 1.0);

    float outline = (shape - inner) * mix(1.0, dash, uDashed);
    float fill = inner * uFillAlpha;
    float alpha = outline + fill;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4((uOutline * outline + uFill * fill) / alpha, alpha);
    #include <colorspace_fragment>
  }
`;

function markMaterial(token: MarkToken, pixelRatio: number): ShaderMaterial {
  // A mark with no outline is all fill; one with no fill lets the plate show.
  const fill = token.fill ? colourOf(token.fill) : null;
  const outline = token.outline ? colourOf(token.outline) : null;
  return new ShaderMaterial({
    vertexShader: MARK_VERTEX,
    fragmentShader: MARK_FRAGMENT,
    uniforms: {
      uFill: { value: new Color(fill?.hex ?? '#000000') },
      uFillAlpha: { value: fill?.alpha ?? 0 },
      uOutline: { value: new Color(outline?.hex ?? '#000000') },
      uOutlinePx: { value: outline ? token.widthPx : 0 },
      uDashed: { value: token.dashed ? 1 : 0 },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

function lineMaterial(token: LineToken): LineBasicMaterial {
  // WebGL draws every line one pixel wide, which is the width both line tokens ask for.
  if (token.widthPx !== 1) throw new Error('The scene draws 1px lines only.');
  const colour = colourOf(token.line);
  return new LineBasicMaterial({ color: colour.hex, transparent: colour.alpha < 1, opacity: colour.alpha });
}

/** The plates, with their edges, and the outlines of the cells. */
function plateAndCellObjects(layout: StackLayout, thickness: number): Group {
  const group = new Group();
  const fill = new MeshBasicMaterial({
    color: colourOf(MAP_TOKENS['map-plate-fill'].fill).hex,
    // Pushes the fill back a little, so the plate's own edges and the cell lines win.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const edge = lineMaterial(MAP_TOKENS['map-plate-edge']);
  for (const plate of layout.plates) {
    const box = new BoxGeometry(plate.width, thickness, plate.depth);
    for (const part of [new Mesh(box, fill), new LineSegments(new EdgesGeometry(box), edge)]) {
      part.position.set(plate.x, plate.y - thickness / 2, plate.z);
      group.add(part);
    }
  }

  const corners: number[] = [];
  for (const cell of layout.cells) {
    const [left, right] = [cell.x - cell.width / 2, cell.x + cell.width / 2];
    const [back, front] = [cell.z - cell.depth / 2, cell.z + cell.depth / 2];
    const y = cell.y + MARK_LIFT / 2;
    corners.push(left, y, back, right, y, back, right, y, back, right, y, front);
    corners.push(right, y, front, left, y, front, left, y, front, left, y, back);
  }
  const outlines = new BufferGeometry();
  outlines.setAttribute('position', new Float32BufferAttribute(corners, 3));
  group.add(new LineSegments(outlines, lineMaterial(MAP_TOKENS['map-cell-line'])));
  return group;
}

export function createStage(
  container: HTMLElement,
  index: GraphIndex,
  layout: StackLayout,
  constants: Constants,
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

  // Marks. One flat square per tool, in the material of its decision-class step.
  const tools = new Map<string, ToolNode>();
  for (const node of index.graph.nodes) if (node.type === 'tool') tools.set(node.id, node);
  const square = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const materials = new Map<DecisionStep, ShaderMaterial>(
    DECISION_STEPS.map((step) => [step, markMaterial(MARK_TOKEN_OF_STEP[step], renderer.getPixelRatio())]),
  );
  const nodes: MarkNode[] = layout.marks.map((mark) => {
    const tool = tools.get(mark.tool);
    if (!tool) throw new Error(`The layout places "${mark.tool}", which is not a tool in the graph.`);
    const y = mark.y + MARK_LIFT;
    return {
      id: mark.tool,
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
    // Nothing is clickable yet.
    .enablePointerInteraction(false)
    // No simulation: no tick ever runs, and every node is pinned as well.
    .warmupTicks(0)
    .cooldownTicks(0)
    .nodeThreeObject((node) => {
      const mark = node as MarkNode;
      const mesh = new Mesh(square, materials.get(mark.step));
      mesh.scale.setScalar(mark.size / MARK_SHARE_OF_QUAD);
      return mesh;
    })
    .graphData({ nodes, links: [] });

  graph.scene().add(plateAndCellObjects(layout, constants.plateThickness));

  // The camera: it orbits the stack's vertical axis and never leaves it.
  const centre = new Vector3(
    (layout.bounds.min.x + layout.bounds.max.x) / 2,
    (layout.bounds.min.y + layout.bounds.max.y) / 2,
    (layout.bounds.min.z + layout.bounds.max.z) / 2,
  );
  controls.target.copy(centre);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;

  // The window, as last measured. `frame` is the canvas, which is larger.
  const windowSize = { width: 0, height: 0 };
  const frame: Frame = { width: 0, height: 0, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
  const listeners: (() => void)[] = [];
  const notify = (): void => listeners.forEach((listener) => listener());
  let restRange = 0;

  /** Sizes the canvas to its container and keeps the stack clear of the insets. */
  function fitWindow(): void {
    windowSize.width = container.clientWidth;
    windowSize.height = container.clientHeight;
    // A hidden or collapsed container has no size to fit; the next resize fits it.
    if (windowSize.width === 0 || windowSize.height === 0) return;
    // The orbit axis is drawn at the middle of the canvas, and belongs at the
    // middle of the area inside the insets. So the canvas is made larger than
    // the window by the difference between opposite insets, and the window
    // shows the part of it that puts the axis there.
    const extraX = constants.insetLeftPx - constants.insetRightPx;
    const extraY = constants.insetTopPx - constants.insetBottomPx;
    frame.width = windowSize.width + Math.abs(extraX);
    frame.height = windowSize.height + Math.abs(extraY);
    const besideX = (frame.width - (windowSize.width - constants.insetLeftPx - constants.insetRightPx)) / 2;
    const besideY = (frame.height - (windowSize.height - constants.insetTopPx - constants.insetBottomPx)) / 2;
    frame.inset = { top: besideY, right: besideX, bottom: besideY, left: besideX };
    canvasHost.style.left = `${Math.min(0, extraX)}px`;
    canvasHost.style.top = `${Math.min(0, extraY)}px`;
    graph.width(frame.width).height(frame.height);

    camera.fov = constants.fieldOfViewDegrees;
    // The outline widths are in screen pixels, so they follow the display's pixel ratio.
    for (const material of materials.values()) material.uniforms.uPixelRatio!.value = renderer.getPixelRatio();

    const previous = restRange;
    restRange = rangeToFit(layout.bounds, frame, constants.fieldOfViewDegrees, constants.restTiltDegrees, 0);
    controls.minPolarAngle = radians(constants.minTiltDegrees);
    controls.maxPolarAngle = radians(constants.maxTiltDegrees);
    controls.minDistance = restRange * constants.nearestZoom;
    controls.maxDistance = restRange * constants.farthestZoom;
    // A tight depth range keeps marks and plates apart in the depth buffer.
    camera.near = controls.minDistance / 4;
    camera.far = controls.maxDistance * 4;
    camera.updateProjectionMatrix();

    // Keeps the partner's zoom, as a share of the rest distance, when the window changes.
    if (previous > 0) {
      const out = camera.position.clone().sub(centre);
      camera.position.copy(centre).addScaledVector(out, restRange / previous);
      controls.update();
    } else {
      restCamera();
    }
  }

  function restCamera(): void {
    const out = towardCamera(constants.restTiltDegrees, 0);
    camera.position.copy(centre).addScaledVector(new Vector3(out.x, out.y, out.z), restRange);
    camera.lookAt(centre);
    controls.update();
  }

  fitWindow();

  controls.addEventListener('change', notify);
  new ResizeObserver(() => {
    if (container.clientWidth === windowSize.width && container.clientHeight === windowSize.height) return;
    fitWindow();
    notify();
  }).observe(container);

  return {
    add: (object) => void graph.scene().add(object),
    camera,
    frame,
    onCameraChange(listener) {
      listeners.push(listener);
      listener();
    },
    applyConstants() {
      fitWindow();
      restCamera();
      notify();
    },
  };
}
