/**
 * mark-material: how a mark is drawn. One flat square with a fill, an outline,
 * or both, in the form a mark token gives it. The hover ring and the outline
 * of a selected cell are drawn the same way.
 */
import { Color, DoubleSide, ShaderMaterial } from 'three';
import { colourOf } from './tokens';
import type { MarkToken } from './tokens';

/** How far a mark is lifted off its plate, so the two never share a depth. */
export const MARK_LIFT = 0.02;
/** The mark's square is drawn inside a larger one, which leaves room to soften its edge. */
export const MARK_SHARE_OF_QUAD = 0.8;
/** The hover ring and the `implements` lines are drawn after the plates and marks. */
export const OVER_THE_MARKS = 1;

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
  uniform float uOpacity;
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
    gl_FragColor = vec4((uOutline * outline + uFill * fill) / alpha, alpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** The material of a mark in the form of a token. Its outline is `widthPx` wide on screen. */
export function markMaterial(token: MarkToken, pixelRatio: number): ShaderMaterial {
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
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
