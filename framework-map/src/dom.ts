/**
 * dom: the small helpers the panels build their elements with.
 */
import { ArrowUpRight, createElement } from 'lucide';
import type { IconNode } from 'lucide';
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

/** A button that shows an icon alone. Its label is its name, and the text shown on hover. */
export function iconButton(className: string, icon: IconNode, label: string): HTMLButtonElement {
  const drawn = createElement(icon);
  drawn.setAttribute('aria-hidden', 'true');
  const button = element('button', className, drawn);
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  return button;
}

/**
 * Marks a control as one a single key leads to (src/single-keys.ts), with the name it has without the
 * key. `offerSingleKeys` writes the key into the text shown on hover, or leaves it out.
 */
export function hintSingleKey(control: HTMLElement, name: string, key: string): void {
  control.dataset.singleKey = key;
  control.dataset.keyName = name;
}

/** Offers the single keys on every control marked for one, or takes the offer away while they are switched off. */
export function offerSingleKeys(within: ParentNode, on: boolean): void {
  for (const control of within.querySelectorAll<HTMLElement>('[data-single-key]')) {
    const { singleKey = '', keyName = '' } = control.dataset;
    control.title = on ? `${keyName} (key ${singleKey})` : keyName;
    // The key is said of what takes it: the radio button inside a segment, or the control itself.
    const taker = control.querySelector('input') ?? control;
    if (on) taker.setAttribute('aria-keyshortcuts', singleKey);
    else taker.removeAttribute('aria-keyshortcuts');
  }
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

/**
 * A link that opens in a tab of its own, beside the map. The arrow shows it, and assistive technology
 * is told it in words.
 * @param rel What the link tells the page it opens, as the `rel` attribute.
 */
export function outsideLink(href: string, text: string, rel: string): HTMLAnchorElement {
  const arrow = createElement(ArrowUpRight);
  arrow.setAttribute('aria-hidden', 'true');
  arrow.classList.add('card-icon');
  const link = element('a', 'card-link', text, arrow, element('span', 'visually-hidden', ' (opens in a new tab)'));
  link.href = href;
  link.target = '_blank';
  link.rel = rel;
  return link;
}

/** The link to the tool matrix. `href` is `toolMatrixHref` in src/constants.ts. */
export const toolMatrixLink = (href: string): HTMLAnchorElement => outsideLink(href, 'Open the tool matrix', 'noopener');
