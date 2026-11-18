/**
 * fallback: the page a partner gets where the browser has no WebGL.
 *
 * The map draws with WebGL. Without it the page shows the static picture of
 * the stack that the build inlined (see src/stack-picture.ts), says why in a
 * few words, and links to the tool matrix, which lists every tool. It makes
 * no scene, so the missing WebGL is no console error.
 */
import { buildStamp } from './build-stamp';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { DECISION_STEPS, STEP_NAMES } from './display';
import { element, stepSwatch, toolMatrixLink } from './dom';
import { PICTURE_METRICS } from './stack-picture';

/** Whether the browser gives the map the WebGL it draws with. */
export function hasWebGL(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    // The context was only a question, and a page may hold only a few of them.
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

/**
 * Puts the fallback page in place of the map.
 * @param picture The static picture of the stack, as SVG markup made by the build.
 */
export function mountFallback(
  app: HTMLElement,
  index: GraphIndex,
  constants: Constants,
  buildId: string,
  picture: string,
): void {
  // Not one of the page layouts: the fallback page stands in place of them all.
  document.documentElement.dataset.fallback = 'true';
  const { tiers, clusters, tools } = index.graph.meta.counts;

  const figure = element('div', 'fallback-picture');
  figure.setAttribute('role', 'img');
  figure.setAttribute(
    'aria-label',
    `The stack at rest: ${tiers} tiers, each a plate that holds its clusters, with one mark for each of the ${tools} tools.`,
  );
  // The build made this markup from the graph, and wrote every name in it as text.
  figure.innerHTML = picture;

  const steps = element(
    'ul',
    'legend-steps',
    ...DECISION_STEPS.map((step) => element('li', null, stepSwatch(step), STEP_NAMES[step])),
  );

  const page = element(
    'div',
    'fallback',
    element(
      'header',
      'fallback-head',
      app.querySelector('.title'),
      element(
        'div',
        'fallback-text',
        element(
          'p',
          null,
          'This browser cannot draw the map, because WebGL is switched off or not available. Open this file in a current Chrome or Edge to use the map.',
        ),
        element(
          'p',
          null,
          `The picture shows the stack at rest: ${tiers} tiers, ${clusters} clusters and ${tools} tools. The tool matrix lists every tool.`,
        ),
        element('p', null, toolMatrixLink(constants.toolMatrixHref)),
      ),
    ),
    figure,
    element(
      'footer',
      'fallback-foot',
      element('div', 'fallback-legend', element('h2', 'rail-heading', 'Decision class'), steps),
      buildStamp(index.graph.meta.generated, buildId),
    ),
  );
  // The explanation begins where the picture's plates do: right of its column of tier names.
  const { marginPx, nameColumnPx, nameGapPx } = PICTURE_METRICS;
  page.style.setProperty('--picture-names', `${marginPx + nameColumnPx}px`);
  page.style.setProperty('--picture-name-gap', `${nameGapPx}px`);
  page.style.setProperty('--picture-margin', `${marginPx}px`);
  app.replaceChildren(page);
}
