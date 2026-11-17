/**
 * dom: the small helpers the panels build their elements with.
 */
import { decisionStep } from './display';
import type { DecisionStep } from './display';
import { MARK_TOKEN_OF_STEP, cssOf, markPartColour } from './tokens';

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

/** Gives a square the form of a decision-class step, in the faded state or not. */
export function dressSwatch(square: HTMLElement, step: DecisionStep, faded: boolean): void {
  // The same token and the same faded colours the scene draws the mark from, so the two cannot drift apart.
  const token = MARK_TOKEN_OF_STEP[step];
  square.style.background = token.fill ? cssOf(markPartColour(token.fill, faded)) : 'transparent';
  square.style.border = token.outline
    ? `${token.widthPx}px ${token.dashed ? 'dashed' : 'solid'} ${cssOf(markPartColour(token.outline, faded))}`
    : '0';
}

/** A small square in the form of a decision-class step, as the marks are drawn. */
export function stepSwatch(step: DecisionStep): HTMLElement {
  const made = element('span', 'swatch');
  made.setAttribute('aria-hidden', 'true');
  dressSwatch(made, step, false);
  return made;
}

/** The square of a decision class: the form of its step. */
export const swatch = (decisionClass: string): HTMLElement => stepSwatch(decisionStep(decisionClass));
