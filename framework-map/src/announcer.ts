/**
 * announcer: tells assistive technology what the map now shows. It puts one
 * sentence into a live region whenever the selection changes, or the map goes
 * to another tier or cluster with nothing selected.
 */
import type { GraphIndex } from './data';
import { element } from './dom';
import type { MapState, Store } from './state';

/** The sentence for a change of state, or null where there is nothing new to say. */
function announcementOf(state: MapState, before: MapState, index: GraphIndex): string | null {
  const { selection } = state;
  if (selection) {
    if (selection.type === before.selection?.type && selection.id === before.selection.id) return null;
    if (selection.type === 'tool') {
      const tool = index.tool(selection.id);
      const cluster = tool && index.cluster(tool.cluster);
      return tool && cluster ? `Selected the tool ${tool.label}, in cluster ${cluster.id}, ${cluster.label}.` : null;
    }
    if (selection.type === 'cluster') {
      const cluster = index.cluster(selection.id);
      return cluster ? `Selected cluster ${cluster.id}, ${cluster.label}.` : null;
    }
    const need = index.need(selection.id);
    if (!need) return null;
    // A selected need is always traced, so the sentence says what the trace found.
    const serving = index.servingToolsOf(need.id).length;
    const bestFits = index.bestFitToolsOf(need.id).length;
    return `Tracing need ${need.id}, ${need.label}. ${serving} ${serving === 1 ? 'tool serves' : 'tools serve'} it, ${bestFits} as a best fit.`;
  }
  const cluster = state.distance === 'cluster' ? index.cluster(state.cluster ?? '') : undefined;
  const tier = state.distance === 'tier' ? index.tier(state.tier ?? '') : undefined;
  const place = cluster
    ? `Cluster ${cluster.id}, ${cluster.label}.`
    : tier
      ? `Tier ${tier.id}, ${tier.label}.`
      : 'The whole stack.';
  const moved = state.distance !== before.distance || state.tier !== before.tier || state.cluster !== before.cluster;
  if (before.selection) return moved ? `Nothing selected. ${place}` : 'Nothing selected.';
  return moved ? place : null;
}

export function mountAnnouncer(app: HTMLElement, index: GraphIndex, store: Store): void {
  const region = element('div', 'visually-hidden');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  app.append(region);
  store.subscribe((state, before) => {
    const sentence = announcementOf(state, before, index);
    if (!sentence) return;
    // A card that has just opened is said too, for a partner who chose a row of the outline and stayed there.
    region.textContent = state.selection && !before.selection ? `${sentence} Its detail card is open.` : sentence;
  });
}
