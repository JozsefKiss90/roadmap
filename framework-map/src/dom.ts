/**
 * dom: the small helpers the panels build their elements with.
 */
import { decisionStep } from './display';
import { MARK_TOKEN_OF_STEP, ROLES } from './tokens';

export type Child = Node | string | null | undefined | false;

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  if (className) made.className = className;
  made.append(...children.filter((child): child is Node | string => Boolean(child)));
  return made;
}

/** A small square in the form of a decision-class step, as the marks are drawn. */
export function swatch(decisionClass: string): HTMLElement {
  const token = MARK_TOKEN_OF_STEP[decisionStep(decisionClass)];
  const made = element('span', 'swatch');
  made.setAttribute('aria-hidden', 'true');
  // The same token the scene draws the mark from, so the two cannot drift apart.
  made.style.background = token.fill ? ROLES[token.fill] : 'transparent';
  made.style.border = token.outline
    ? `${token.widthPx}px ${token.dashed ? 'dashed' : 'solid'} ${ROLES[token.outline]}`
    : '0';
  return made;
}
