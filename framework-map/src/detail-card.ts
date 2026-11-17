/**
 * detail-card: the panel docked on the right that describes the selected tool,
 * cluster or need. It is one of the panels: it reads the state store and
 * writes to it, and knows nothing of the scene.
 *
 * The card is absent while nothing is selected. A field with no value is left
 * out, with its label.
 */
import { ArrowUpRight, X, createElement } from 'lucide';
import type { IconNode } from 'lucide';
import type { Constants } from './constants';
import type { GraphIndex } from './data';
import { decisionStep, kindIcon } from './display';
import { element, swatch } from './dom';
import type { Child } from './dom';
import type { ClusterNode, NeedNode, RoleCode, ToolNode } from './graph';
import { kindIconNode } from './icons';
import { inGridOrder } from './layout';
import { tracedNeedOf } from './state';
import type { Selection, Store } from './state';

/** The decision source of a tool whose decision is a recommendation, not yet the Architect's. */
const PROPOSED_HERE = 'Proposed here';
/** Values the data uses for "nothing to say". A field that holds one is left out. */
const NO_VALUE = new Set(['', 'n/a']);

function icon(node: IconNode): SVGElement {
  const made = createElement(node);
  made.setAttribute('aria-hidden', 'true');
  made.classList.add('card-icon');
  return made;
}

const hasValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && !NO_VALUE.has(value.trim().toLowerCase());

/** A list of labelled fields. A field whose value is missing or empty is left out; an empty list is no list. */
function fields(rows: readonly (readonly [string, Child])[]): HTMLElement | null {
  const list = element('dl', 'card-fields');
  for (const [label, value] of rows) {
    if (!value) continue;
    list.append(element('div', null, element('dt', null, label), element('dd', null, value)));
  }
  return list.childElementCount > 0 ? list : null;
}

/** A headed part of the card. With nothing in it, it is left out. */
function section(heading: string, ...children: Child[]): HTMLElement | null {
  const present = children.filter(Boolean);
  if (present.length === 0) return null;
  return element('section', 'card-section', element('h3', null, heading), ...present);
}

const paragraph = (text: string | null | undefined): HTMLElement | null =>
  hasValue(text) ? element('p', 'card-text', text) : null;

export interface DetailCard {
  /** Puts the keyboard focus on the open card's name, so a partner can read on from there. */
  focus(): void;
}

/**
 * @param onClosedWithFocus Called when the card closes while it holds the keyboard focus, so the
 *   focus can go somewhere that is still on the page.
 */
export function mountDetailCard(
  app: HTMLElement,
  index: GraphIndex,
  store: Store,
  constants: Constants,
  onClosedWithFocus: () => void,
): DetailCard {
  const card = element('aside', 'detail-card');
  card.hidden = true;
  app.append(card);

  const roles = (codes: readonly RoleCode[]): string | null =>
    codes.length > 0 ? codes.map((code) => index.roleName(code)).join(', ') : null;
  const plain = (value: string | null | undefined): string | null => (hasValue(value) ? value : null);

  /** A row that selects something else: a tool, a cluster or a need. */
  function row(id: string, ...children: Child[]): HTMLElement {
    const button = element('button', 'card-row', ...children);
    button.type = 'button';
    button.addEventListener('click', () => store.select(id));
    return element('li', null, button);
  }
  /** The same, as a value among the labelled fields. */
  function inlineRow(id: string, text: string): HTMLElement {
    const button = element('button', 'card-inline', text);
    button.type = 'button';
    button.addEventListener('click', () => store.select(id));
    return button;
  }
  const rows = (items: readonly HTMLElement[]): HTMLElement | null =>
    items.length > 0 ? element('ul', 'card-rows', ...items) : null;
  const toolRows = (tools: readonly ToolNode[]): HTMLElement | null =>
    rows(tools.map((tool) => row(tool.id, swatch(tool.decision_class), element('span', 'card-row-name', tool.label))));
  const clusterRows = (clusters: readonly ClusterNode[]): HTMLElement | null =>
    rows(
      clusters.map((cluster) =>
        row(cluster.id, element('span', 'card-tag', cluster.id), element('span', 'card-row-name', cluster.label)),
      ),
    );

  /** The attributes a cluster and a tool share. */
  const attributes = (node: ClusterNode | ToolNode): (readonly [string, Child])[] => [
    ['Used by', roles(node.used_by)],
    ['Operated by', roles(node.operated_by)],
    ['Hosting', plain(node.hosting)],
    ['Value stream', hasValue(node.stream) ? index.streamName(node.stream) : null],
    ['Gate', plain(node.gate)],
  ];

  function head(eyebrow: Child[], name: string): HTMLElement {
    const close = element('button', 'card-close', icon(X));
    close.type = 'button';
    close.setAttribute('aria-label', 'Close the detail card');
    close.title = 'Close (Escape)';
    close.addEventListener('click', () => store.clearSelection());
    const title = element('h2', 'card-name', name);
    // The name takes the focus when the card's content changes under the partner's hands.
    title.tabIndex = -1;
    return element('header', 'card-head', element('p', 'card-eyebrow', ...eyebrow), close, title);
  }

  /** While a need is traced, the way back from a tool's card to the need: one click. */
  function wayBackToNeed(): HTMLElement | null {
    const need = index.need(tracedNeedOf(store.get().lens) ?? '');
    if (!need) return null;
    return element(
      'p',
      'card-trace',
      element('span', 'card-tag', 'Tracing'),
      inlineRow(need.id, `${need.id} · ${need.label}`),
    );
  }

  function toolForm(tool: ToolNode): Child[] {
    const proposed = tool.decision_source === PROPOSED_HERE;
    const decision = element(
      'div',
      'card-decision',
      element(
        'p',
        'card-decision-class',
        swatch(tool.decision_class),
        element('span', null, tool.decision_class),
        element('span', 'card-tag', decisionStep(tool.decision_class)),
      ),
      element(
        'p',
        'card-decision-source',
        element('span', proposed ? 'pill pill-proposed' : 'pill pill-decided', proposed ? PROPOSED_HERE : "Architect's decision"),
        element(
          'span',
          'card-note',
          proposed
            ? `Recommended as ${tool.decision_class}. The Architect has not decided it.`
            : `From the ${tool.decision_source}.`,
        ),
      ),
    );

    const repository = hasValue(tool.url)
      ? element('a', 'card-link', tool.repo ?? tool.url, icon(ArrowUpRight))
      : null;
    if (repository) {
      repository.href = tool.url ?? '';
      repository.target = '_blank';
      repository.rel = 'noopener noreferrer';
    }
    const overlap = index.overlapOf(tool.id);
    const cluster = index.cluster(tool.cluster);
    const tier = index.tier(tool.tier);
    const matrix = element('a', 'card-link', 'Open the tool matrix', icon(ArrowUpRight));
    matrix.href = constants.toolMatrixHref;
    matrix.target = '_blank';
    matrix.rel = 'noopener';

    return [
      head([icon(kindIconNode(kindIcon(index.kindFamilyOf(tool.kind)))), tool.kind], tool.label),
      element(
        'div',
        'card-body',
        wayBackToNeed(),
        paragraph(tool.capability),
        section('Decision', decision),
        section('Place and use', fields([['Cluster', cluster && inlineRow(cluster.id, `${cluster.id} · ${cluster.label}`)], ['Tier', tier && `${tier.id} · ${tier.label}`], ...attributes(tool)])),
        section(
          'Needs served',
          rows(
            index
              .needsOf(tool.id)
              .map(({ need, bestFit }) =>
                row(
                  need.id,
                  element('span', 'card-tag', need.id),
                  element('span', 'card-row-name', need.label),
                  bestFit && element('span', 'card-tag card-row-end', 'Best fit'),
                ),
              ),
          ),
        ),
        section('Implements', clusterRows(index.implementsOf(tool.id))),
        overlap &&
          section(
            'Overlaps with',
            element('p', 'card-note', 'Overlap group ', element('span', 'card-tag', overlap.group)),
            toolRows(overlap.members),
          ),
        section(
          'Evidence',
          fields([
            ['Repository', repository],
            ['Stars', tool.stars === null ? null : tool.stars.toLocaleString('en-GB')],
            ['Last commit', plain(tool.last_commit)],
            ['Licence', plain(tool.licence)],
            ['Verification', plain(tool.verification)],
            ['Note', plain(tool.note)],
          ]),
        ),
      ),
      element('footer', 'card-foot', matrix),
    ];
  }

  function clusterForm(cluster: ClusterNode): Child[] {
    const tier = index.tier(cluster.tier);
    const tools = inGridOrder(index.toolsOf(cluster.id));
    return [
      head(['Cluster ', cluster.id], cluster.label),
      element(
        'div',
        'card-body',
        fields([['Tier', tier ? `${tier.id} · ${tier.label}` : cluster.tier], ...attributes(cluster)]),
        section('Implemented by', toolRows(index.implementedBy(cluster.id))),
        section(`Tools · ${tools.length}`, toolRows(tools)),
      ),
    ];
  }

  function needForm(need: NeedNode): Child[] {
    return [
      head(['Need ', need.id, hasValue(need.domain) && ` · ${need.domain}`], need.label),
      element(
        'div',
        'card-body',
        fields([
          ['Verdict', plain(need.verdict)],
          ['Phase', plain(need.phase)],
          ['Lead role', index.roleName(need.lead_role)],
        ]),
        section('Approach', paragraph(need.approach)),
        section('Gap', paragraph(need.gap)),
        section('Best-fit tools', toolRows(index.bestFitToolsOf(need.id))),
      ),
    ];
  }

  function formOf(selection: Selection): { label: string; content: Child[] } | null {
    if (selection.type === 'tool') {
      const tool = index.tool(selection.id);
      return tool ? { label: `Tool: ${tool.label}`, content: toolForm(tool) } : null;
    }
    if (selection.type === 'cluster') {
      const cluster = index.cluster(selection.id);
      return cluster ? { label: `Cluster: ${cluster.label}`, content: clusterForm(cluster) } : null;
    }
    const need = index.need(selection.id);
    return need ? { label: `Need: ${need.label}`, content: needForm(need) } : null;
  }

  function render(selection: Selection | null, opening = false): void {
    const form = selection ? formOf(selection) : null;
    // A row of the card that was clicked is about to go; the focus must not go with it.
    const heldFocus = card.contains(document.activeElement);
    card.hidden = form === null;
    if (!form) {
      card.replaceChildren();
      if (heldFocus) onClosedWithFocus();
      return;
    }
    // The card slides in when it opens, and not when its content changes or the page opens with it.
    card.classList.toggle('detail-card-opening', opening);
    card.setAttribute('aria-label', form.label);
    card.replaceChildren(...form.content.filter((child): child is Node => child instanceof Node));
    if (heldFocus) card.querySelector<HTMLElement>('.card-name')?.focus();
  }

  render(store.get().selection);
  store.subscribe((state, before) => {
    // A tool's card names the traced need, so it is made again when another need, or none, is traced under it.
    const retraced = state.selection?.type === 'tool' && tracedNeedOf(state.lens) !== tracedNeedOf(before.lens);
    if (state.selection !== before.selection || retraced) {
      render(state.selection, before.selection === null);
    }
  });
  return { focus: () => card.querySelector<HTMLElement>('.card-name')?.focus() };
}
