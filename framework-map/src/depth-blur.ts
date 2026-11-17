/**
 * depth-blur: quiets the plates under the focused one with a slight blur.
 *
 * It is the map's only postprocessing. There is no glow and no vignette.
 *
 * The pass draws the scene to the screen as the renderer would, so the
 * picture keeps its antialiasing and its colours whether the blur is on or
 * off. While a plate is blurred, it then does three more things:
 *
 * 1. It copies the picture.
 * 2. It draws a mask: each plate as a plain box, in the amount of blur the
 *    scene gave it. A plate with no blur is drawn too, in black, so that it
 *    hides the plates under it in the mask as it does in the picture. A
 *    faded plate is left out, because it hides nothing.
 * 3. It draws the blurred picture over the screen, only where the mask is not
 *    black. Everything else on the screen is left as it was drawn, so the
 *    focused plate and every label on it stay sharp.
 *
 * The blur follows the plates, not the depth buffer: the focused plate is
 * tilted, so its near and far edges lie at different depths, and a blur by
 * depth would soften both.
 */
import {
  BoxGeometry,
  Color,
  FramebufferTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Camera, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import type { PlateLayout } from './layout';

export interface DepthBlur {
  /** The pass that draws the scene, and the blur over it. It goes in the renderer's composer, alone. */
  readonly pass: Pass;
  /**
   * How blurred a tier's plate is, from 0 for sharp to 1 for the widest
   * spread. Null takes the plate out of the mask: a faded plate hides nothing.
   */
  setAmount(tier: string, amount: number | null): void;
  /** The widest the blur spreads, in pixels on screen. */
  setSpreadPx(px: number): void;
}

/** An amount of blur too small to see. A pixel below it is left as it was drawn. */
const NO_BLUR = 0.004;
/** How many points of the picture are read around each blurred pixel. */
const TAPS = 12;

const BLUR_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The mean of the picture over a small disc. The points lie on a spiral that
// turns by the golden angle, which spreads them evenly over the disc.
const BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D tPicture;
  uniform sampler2D tMask;
  uniform vec2 uPixel;
  uniform float uSpread;
  varying vec2 vUv;

  const float GOLDEN_ANGLE = 2.39996;

  void main() {
    float amount = texture2D(tMask, vUv).r;
    if (amount < ${NO_BLUR}) discard;
    float spread = amount * uSpread;
    vec3 sum = texture2D(tPicture, vUv).rgb;
    for (int tap = 0; tap < ${TAPS}; tap++) {
      float angle = float(tap) * GOLDEN_ANGLE;
      float reach = sqrt((float(tap) + 0.5) / ${TAPS}.0) * spread;
      sum += texture2D(tPicture, vUv + vec2(cos(angle), sin(angle)) * reach * uPixel).rgb;
    }
    // The copy holds the colours as they are on the screen, so they go back as they are.
    gl_FragColor = vec4(sum / ${TAPS + 1}.0, 1.0);
  }
`;

/**
 * @param scene The scene the pass draws, with `camera`.
 * @param plates Every plate of the stack. Each starts sharp.
 * @param plateThickness How thick a plate is drawn, in layout units, so that the mask's boxes match the picture's.
 */
export function createDepthBlur(
  scene: Scene,
  camera: Camera,
  plates: readonly PlateLayout[],
  plateThickness: number,
): DepthBlur {
  const maskScene = new Scene();
  maskScene.background = new Color(0x000000);
  const boxes = new Map<string, { mesh: Mesh; material: MeshBasicMaterial; amount: number | null }>();
  for (const plate of plates) {
    const material = new MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    const mesh = new Mesh(new BoxGeometry(plate.width, plateThickness, plate.depth), material);
    mesh.position.set(plate.x, plate.y - plateThickness / 2, plate.z);
    maskScene.add(mesh);
    boxes.set(plate.tier, { mesh, material, amount: 0 });
  }

  const blur = new ShaderMaterial({
    vertexShader: BLUR_VERTEX,
    fragmentShader: BLUR_FRAGMENT,
    uniforms: {
      tPicture: { value: null },
      tMask: { value: null },
      uPixel: { value: new Vector2() },
      uSpread: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(blur);
  const mask = new WebGLRenderTarget(1, 1);
  let picture: FramebufferTexture | null = null;
  let spreadPx = 0;
  const size = new Vector2();

  /** The copy of the picture, at the size of the drawing buffer. It is made again when that size changes. */
  function pictureAt(width: number, height: number): FramebufferTexture {
    if (picture && picture.image.width === width && picture.image.height === height) return picture;
    picture?.dispose();
    picture = new FramebufferTexture(width, height);
    picture.minFilter = LinearFilter;
    picture.magFilter = LinearFilter;
    mask.setSize(width, height);
    return picture;
  }

  const isBlurring = (): boolean =>
    spreadPx > 0 && [...boxes.values()].some(({ amount }) => amount !== null && amount >= NO_BLUR);

  class DepthBlurPass extends Pass {
    constructor() {
      super();
      // The pass draws to the screen itself, and reads neither of the composer's buffers.
      this.needsSwap = false;
    }

    override render(renderer: WebGLRenderer): void {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      if (!isBlurring()) return;

      renderer.getDrawingBufferSize(size);
      const copy = pictureAt(size.x, size.y);
      renderer.copyFramebufferToTexture(copy);

      renderer.setRenderTarget(mask);
      renderer.render(maskScene, camera);

      renderer.setRenderTarget(null);
      blur.uniforms.tPicture!.value = copy;
      blur.uniforms.tMask!.value = mask.texture;
      blur.uniforms.uPixel!.value.set(1 / size.x, 1 / size.y);
      blur.uniforms.uSpread!.value = spreadPx * renderer.getPixelRatio();
      // The blurred pixels go over the picture that is already on the screen.
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      quad.render(renderer);
      renderer.autoClear = autoClear;
    }

    override dispose(): void {
      picture?.dispose();
      mask.dispose();
      blur.dispose();
      quad.dispose();
    }
  }

  return {
    pass: new DepthBlurPass(),
    setAmount(tier, amount) {
      const box = boxes.get(tier);
      if (!box) throw new Error(`The depth blur has no plate for the tier "${tier}".`);
      box.amount = amount;
      box.mesh.visible = amount !== null;
      box.material.color.setRGB(amount ?? 0, 0, 0);
    },
    setSpreadPx(px) {
      spreadPx = px;
    },
  };
}
