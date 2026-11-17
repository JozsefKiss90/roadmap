/**
 * mark-material: how a mark is drawn. One flat square with a fill, an outline,
 * or both, in the form a mark token gives it. The hover ring and the outline
 * of a selected cell are drawn the same way.
 */
import { Color, DoubleSide, ShaderMaterial } from 'three';
import { markPartColour } from './tokens';
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
// A mark that is changing form is drawn as a mix of the form it had and the
// form it takes: uMix runs from 0, the first form, to 1, the second.
const MARK_FRAGMENT = /* glsl */ `
  uniform vec3 uFill;
  uniform float uFillAlpha;
  uniform vec3 uOutline;
  uniform float uOutlineAlpha;
  uniform float uOutlinePx;
  uniform float uDashed;
  uniform vec3 uFillB;
  uniform float uFillAlphaB;
  uniform vec3 uOutlineB;
  uniform float uOutlineAlphaB;
  uniform float uOutlinePxB;
  uniform float uDashedB;
  uniform float uMix;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec2 vAt;

  // Where the mark's edge lies, with the quad's own edge at 1.
  const float MARK_EDGE = ${MARK_SHARE_OF_QUAD.toFixed(3)};
  // A dashed side is drawn at its two ends and left open in the middle.
  const float DASH_GAP = 0.36;

  // One form at this pixel, with its colour already multiplied by its alpha.
  // inset: pixels from here to the mark's edge. dash: 1 on a dash, 0 in its gap.
  vec4 form(vec3 fillColour, float fillAlpha, vec3 outlineColour, float outlineAlpha, float outlinePx, float dashed, float inset, float dash) {
    float shape = clamp(inset + 0.5, 0.0, 1.0);
    float inner = clamp(inset - outlinePx * uPixelRatio + 0.5, 0.0, 1.0);
    float outline = (shape - inner) * mix(1.0, dash, dashed) * outlineAlpha;
    float fill = inner * fillAlpha;
    return vec4(outlineColour * outline + fillColour * fill, outline + fill);
  }

  void main() {
    vec2 perPixel = vec2(length(vec2(dFdx(vAt.x), dFdy(vAt.x))), length(vec2(dFdx(vAt.y), dFdy(vAt.y))));
    // Pixels from here to the mark's edge, along each axis. Positive inside.
    vec2 toEdge = (MARK_EDGE - abs(vAt)) / perPixel;
    float inset = min(toEdge.x, toEdge.y);

    // Along the nearest side: 0 at its middle, 1 at its ends.
    bool nearestIsUpright = toEdge.x < toEdge.y;
    float along = (nearestIsUpright ? abs(vAt.y) : abs(vAt.x)) / MARK_EDGE;
    float alongPerPixel = (nearestIsUpright ? perPixel.y : perPixel.x) / MARK_EDGE;
    float dash = clamp((along - DASH_GAP) / alongPerPixel + 0.5, 0.0, 1.0);

    vec4 colour = form(uFill, uFillAlpha, uOutline, uOutlineAlpha, uOutlinePx, uDashed, inset, dash);
    if (uMix > 0.0) {
      vec4 next = form(uFillB, uFillAlphaB, uOutlineB, uOutlineAlphaB, uOutlinePxB, uDashedB, inset, dash);
      colour = mix(colour, next, uMix);
    }
    if (colour.a < 0.004) discard;
    gl_FragColor = vec4(colour.rgb / colour.a, colour.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** A mark's quad lets the plate show round the mark, and never hides another mark. */
const DRAWN_OVER_ITS_PLATE = { transparent: true, depthWrite: false, side: DoubleSide } as const;

/**
 * The material of a mark in the form of a token. Its outline is `widthPx` wide
 * on screen. A faded mark keeps the form and is drawn in the faded colours.
 */
export function markMaterial(token: MarkToken, pixelRatio: number, faded = false): ShaderMaterial {
  // A mark with no outline is all fill; one with no fill lets the plate show.
  const fill = token.fill ? markPartColour(token.fill, faded) : null;
  const outline = token.outline ? markPartColour(token.outline, faded) : null;
  return new ShaderMaterial({
    vertexShader: MARK_VERTEX,
    fragmentShader: MARK_FRAGMENT,
    uniforms: {
      uFill: { value: new Color(fill?.hex ?? '#000000') },
      uFillAlpha: { value: fill?.alpha ?? 0 },
      uOutline: { value: new Color(outline?.hex ?? '#000000') },
      uOutlineAlpha: { value: outline?.alpha ?? 0 },
      uOutlinePx: { value: outline ? token.widthPx : 0 },
      uDashed: { value: token.dashed ? 1 : 0 },
      uMix: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 1 },
    },
    ...DRAWN_OVER_ITS_PLATE,
  });
}

/**
 * The material of a mark that is changing from the form of one material to
 * the form of another. `mix` runs from 0 to 1, and may be shared by every
 * mark that changes at the same time. The material follows the two it was
 * made from: it reads their colours, their opacity and their pixel ratio.
 */
export function blendMaterial(from: ShaderMaterial, to: ShaderMaterial, mix: { value: number }): ShaderMaterial {
  const [a, b] = [from.uniforms, to.uniforms];
  return new ShaderMaterial({
    vertexShader: MARK_VERTEX,
    fragmentShader: MARK_FRAGMENT,
    uniforms: {
      uFill: a.uFill!,
      uFillAlpha: a.uFillAlpha!,
      uOutline: a.uOutline!,
      uOutlineAlpha: a.uOutlineAlpha!,
      uOutlinePx: a.uOutlinePx!,
      uDashed: a.uDashed!,
      uFillB: b.uFill!,
      uFillAlphaB: b.uFillAlpha!,
      uOutlineB: b.uOutline!,
      uOutlineAlphaB: b.uOutlineAlpha!,
      uOutlinePxB: b.uOutlinePx!,
      uDashedB: b.uDashed!,
      uMix: mix,
      uPixelRatio: a.uPixelRatio!,
      uOpacity: a.uOpacity!,
    },
    ...DRAWN_OVER_ITS_PLATE,
  });
}
