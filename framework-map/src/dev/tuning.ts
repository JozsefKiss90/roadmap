/**
 * The tuning panel. Loaded only by the dev server (see main.ts); the built
 * file must not contain it, and scripts/publish.mjs checks that.
 *
 * A duration changed here holds from the next change on the map. The depth
 * blur is drawn again at once.
 *
 * The layout's own spacings (STACK_METRICS in src/layout.ts) are not here: the
 * build computes the layout, so changing one means editing that file.
 */
import { Pane } from 'tweakpane';
import type { Constants } from '../constants';

export function mountTuning(constants: Constants, onChange: () => void): void {
  const pane = new Pane({ title: 'Tuning', expanded: false });
  pane.addBinding(constants, 'titleSizePx', { label: 'title size', min: 16, max: 64, step: 1 });

  const camera = pane.addFolder({ title: 'Camera' });
  camera.addBinding(constants, 'fieldOfViewDegrees', { label: 'field of view', min: 2, max: 40, step: 1 });
  camera.addBinding(constants, 'restTiltDegrees', { label: 'tilt at rest', min: 10, max: 85, step: 1 });
  camera.addBinding(constants, 'restTurnDegrees', { label: 'turn at rest', min: -60, max: 60, step: 1 });
  camera.addBinding(constants, 'underBarMostTiltDegrees', { label: 'most tilt under the bar', min: 46, max: 72, step: 1 });
  camera.addBinding(constants, 'underBarMostTurnDegrees', { label: 'most turn under the bar', min: 0, max: 75, step: 1 });
  camera.addBinding(constants, 'underBarTagRoomPx', { label: 'tag room under the bar', min: 8, max: 40, step: 1 });
  camera.addBinding(constants, 'minTiltDegrees', { label: 'least tilt', min: 0, max: 85, step: 1 });
  camera.addBinding(constants, 'maxTiltDegrees', { label: 'most tilt', min: 10, max: 89, step: 1 });
  camera.addBinding(constants, 'nearestZoom', { label: 'nearest', min: 0.1, max: 1, step: 0.05 });
  camera.addBinding(constants, 'farthestZoom', { label: 'farthest', min: 1, max: 2, step: 0.05 });

  const focus = pane.addFolder({ title: 'Tier and cluster distances' });
  focus.addBinding(constants, 'tierTiltDegrees', { label: 'tier tilt', min: 10, max: 60, step: 1 });
  focus.addBinding(constants, 'tierMostPixelsPerUnit', { label: 'tier closest', min: 16, max: 60, step: 1 });
  focus.addBinding(constants, 'clusterTiltDegrees', { label: 'cluster tilt', min: 10, max: 60, step: 1 });
  focus.addBinding(constants, 'clusterMostPixelsPerUnit', { label: 'cluster closest', min: 16, max: 80, step: 1 });
  focus.addBinding(constants, 'tierInsetRightPx', { label: 'tier right', min: 0, max: 500, step: 4 });
  focus.addBinding(constants, 'annotationTopPx', { label: 'names from top', min: 40, max: 200, step: 4 });
  focus.addBinding(constants, 'fadedPlateOpacity', { label: 'faded plates', min: 0, max: 0.4, step: 0.01 });

  const motion = pane.addFolder({ title: 'Motion' });
  motion.addBinding(constants, 'flightMs', { label: 'flight', min: 0, max: 2000, step: 50 });
  motion.addBinding(constants, 'fadeMs', { label: 'fade', min: 0, max: 1000, step: 10 });
  motion.addBinding(constants, 'panelMs', { label: 'panel', min: 0, max: 1000, step: 10 });
  motion.addBinding(constants, 'phaseStepMs', { label: 'phase step', min: 0, max: 1000, step: 10 });

  const blur = pane.addFolder({ title: 'Depth blur' });
  blur.addBinding(constants, 'depthBlur', { label: 'on' });
  blur.addBinding(constants, 'depthBlurPx', { label: 'spread', min: 0, max: 8, step: 0.25 });
  blur.addBinding(constants, 'depthBlurFullAt', { label: 'widest at', min: 1, max: 40, step: 0.5 });

  const insets = pane.addFolder({ title: 'Insets' });
  insets.addBinding(constants, 'insetTopPx', { label: 'top', min: 0, max: 300, step: 4 });
  insets.addBinding(constants, 'insetRightPx', { label: 'right', min: 0, max: 500, step: 4 });
  insets.addBinding(constants, 'insetBottomPx', { label: 'bottom', min: 0, max: 300, step: 4 });
  insets.addBinding(constants, 'insetLeftPx', { label: 'left', min: 0, max: 800, step: 4 });

  pane.on('change', onChange);
}
