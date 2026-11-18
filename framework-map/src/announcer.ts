/**
 * announcer: tells assistive technology what the map now shows. It puts one
 * sentence or two into a live region whenever the selection, the lens or the
 * filters change, or the map goes to another tier or cluster with nothing
 * selected. A change of lens or of filters is said with the number of tools
 * it leaves at full strength.
 *
 * It is the one live region for these changes, and it is on the page in every
 * page layout: the counts in the rail are not, while the rail stands as icons.
 */
import type { GraphIndex } from './data';
import { element } from './dom';
import { isFiltered, sameFilters, sameLens, scrubbedPhaseOf, tracedNeedOf } from './state';
import type { Lens, MapState, Store } from './state';

/**
 * Why a lens leaves tools in reach, as it is said after their number, whether that is one or many.
 * Null for a lens that leaves none out.
 */
function reasonInReach(lens: Lens | null, index: GraphIndex): string | null {
  if (lens?.type === 'role') return `in reach of the ${index.roleName(lens.role)}`;
  const phase = scrubbedPhaseOf(lens);
  if (phase !== null) return `serving a need scheduled in ${phase}`;
  const need = index.need(tracedNeedOf(lens) ?? '');
  return need ? `serving the need ${need.id}, ${need.label}` : null;
}

/**
 * Why the tools at full strength are the ones they are, as it is said after their number: what the
 * lens asks of a tool, and that it passes the filters. Empty with no lens and no filter chosen.
 */
export function reasonsAtFullStrength(state: Pick<MapState, 'lens' | 'filters'>, index: GraphIndex): string[] {
  const reasons = [reasonInReach(state.lens, index), isFiltered(state.filters) ? 'passing the filters' : null];
  return reasons.filter((reason): reason is string => reason !== null);
}

/** The number of tools at full strength under the lens and the filters, in a sentence that says why. */
function countSentence(state: MapState, index: GraphIndex): string {
  const total = index.tools.length;
  const reasons = reasonsAtFullStrength(state, index);
  if (reasons.length === 0) return `All ${total} tools are in reach, with no filter chosen.`;
  return `${index.emphasised(state).size} of ${total} tools ${reasons.join(' and ')}.`;
}

/**
 * What a traced need's trace found. The trace gives its own count. Under filters, the count of what
 * they leave at full strength follows it.
 */
function traceSentence(needId: string, state: MapState, index: GraphIndex): string | null {
  const need = index.need(needId);
  if (!need) return null;
  const serving = index.servingToolsOf(need.id).length;
  const bestFits = index.bestFitToolsOf(need.id).length;
  const found = `Tracing need ${need.id}, ${need.label}. ${serving} ${serving === 1 ? 'tool serves' : 'tools serve'} it, ${bestFits} as a best fit.`;
  return isFiltered(state.filters) ? `${found} ${countSentence(state, index)}` : found;
}

/** The sentence for a selection that is new. */
function selectionSentence(state: MapState, index: GraphIndex): string | null {
  const { selection } = state;
  if (selection?.type === 'tool') {
    const tool = index.tool(selection.id);
    const cluster = tool && index.cluster(tool.cluster);
    return tool && cluster ? `Selected the tool ${tool.label}, in cluster ${cluster.id}, ${cluster.label}.` : null;
  }
  if (selection?.type === 'cluster') {
    const cluster = index.cluster(selection.id);
    return cluster ? `Selected cluster ${cluster.id}, ${cluster.label}.` : null;
  }
  // A selected need is always traced, so the sentence says what the trace found.
  return selection ? traceSentence(selection.id, state, index) : null;
}

/**
 * The sentence for a lens that has changed. A lens that comes on, or goes off, is named. A step within
 * a lens, to another role or another phase, is said by its count alone: the control that was stepped
 * has said its own name.
 */
function lensSentence(state: MapState, before: MapState, index: GraphIndex): string | null {
  const { lens } = state;
  const count = countSentence(state, index);
  if (lens === null) return `Lens off. ${count}`;
  if (lens.type === 'need') {
    return lens.need === null ? 'Need trace on. Choose a need to trace.' : traceSentence(lens.need, state, index);
  }
  if (lens.type === before.lens?.type) return count;
  return `${lens.type === 'role' ? 'Role lens on.' : 'Phase scrub on.'} ${count}`;
}

/** The sentence for a change of state, or null where there is nothing new to say. */
export function announcementOf(state: MapState, before: MapState, index: GraphIndex): string | null {
  const { selection } = state;
  const selected = selection !== null && (selection.type !== before.selection?.type || selection.id !== before.selection.id);
  if (selected) {
    const sentence = selectionSentence(state, index);
    // A card that has just opened is said too, for a partner who chose a row of the outline and stayed there.
    return sentence && before.selection === null ? `${sentence} Its detail card is open.` : sentence;
  }
  const deselected = selection === null && before.selection !== null;
  if (!sameLens(state.lens, before.lens)) {
    const sentence = lensSentence(state, before, index);
    // A change of lens lets go of a selected need, and of a tool that only the trace let be selected.
    return sentence && deselected ? `${sentence} Nothing selected.` : sentence;
  }
  if (!sameFilters(state.filters, before.filters)) return countSentence(state, index);
  if (selection) return null;

  const cluster = state.distance === 'cluster' ? index.cluster(state.cluster ?? '') : undefined;
  const tier = state.distance === 'tier' ? index.tier(state.tier ?? '') : undefined;
  const place = cluster
    ? `Cluster ${cluster.id}, ${cluster.label}.`
    : tier
      ? `Tier ${tier.id}, ${tier.label}.`
      : 'The whole stack.';
  const moved = state.distance !== before.distance || state.tier !== before.tier || state.cluster !== before.cluster;
  if (deselected) return moved ? `Nothing selected. ${place}` : 'Nothing selected.';
  return moved ? place : null;
}

export function mountAnnouncer(app: HTMLElement, index: GraphIndex, store: Store): void {
  const region = element('div', 'visually-hidden');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  app.append(region);
  store.subscribe((state, before) => {
    const sentence = announcementOf(state, before, index);
    // The sentence goes in as a new element each time. Two changes in a row may make the same sentence, as two
    // filters that leave the same number of tools do, and text that is written again unchanged is not said again.
    if (sentence) region.replaceChildren(element('span', null, sentence));
  });
}
