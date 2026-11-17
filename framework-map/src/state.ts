/**
 * state: one store for what the map shows, synced to the URL fragment.
 *
 * So far it holds the distance, the focused tier or cluster, and the selection.
 * The scene, the labels and the panels all read it and write to it, and never
 * call each other. Lens and filters join it in later tickets.
 *
 * The transitions are pure functions of the state; the store only holds the
 * current state and tells its subscribers when it changes.
 */

/** One of the three zoom steps of the map. */
export type Distance = 'stack' | 'tier' | 'cluster';

/** What the detail card describes: the selected tool, cluster or need. */
export interface Selection {
  readonly type: 'tool' | 'cluster' | 'need';
  readonly id: string;
}

/**
 * Where the map is, and what is selected. At the stack distance nothing is
 * focused; at the tier distance a tier is; at the cluster distance a cluster
 * is, with its tier. A selected tool or cluster is always in the focused
 * cluster. A need has no place in the stack, so it can be selected anywhere.
 */
export interface MapState {
  readonly distance: Distance;
  readonly tier: string | null;
  readonly cluster: string | null;
  readonly selection: Selection | null;
}

/** What the state needs to know of the graph: which tiers, clusters, tools and needs it has. */
export interface Places {
  tier(id: string): { id: string } | undefined;
  cluster(id: string): { id: string; tier: string } | undefined;
  tool(id: string): { id: string; cluster: string } | undefined;
  need(id: string): { id: string } | undefined;
}

export const AT_STACK: MapState = { distance: 'stack', tier: null, cluster: null, selection: null };

const same = (a: MapState, b: MapState): boolean =>
  a.distance === b.distance &&
  a.tier === b.tier &&
  a.cluster === b.cluster &&
  a.selection?.type === b.selection?.type &&
  a.selection?.id === b.selection?.id;

/** Goes to the tier distance for a tier, with nothing selected. An id the graph lacks changes nothing. */
export function focusTier(state: MapState, places: Places, tierId: string): MapState {
  const tier = places.tier(tierId);
  return tier ? { distance: 'tier', tier: tier.id, cluster: null, selection: null } : state;
}

/** Goes to the cluster distance for a cluster, with nothing selected. An id the graph lacks changes nothing. */
export function focusCluster(state: MapState, places: Places, clusterId: string): MapState {
  const cluster = places.cluster(clusterId);
  return cluster ? { distance: 'cluster', tier: cluster.tier, cluster: cluster.id, selection: null } : state;
}

/**
 * Selects the tool, cluster or need with this id. A tool or a cluster also
 * takes the map to that cluster; a need leaves the map where it is. An id the
 * graph lacks changes nothing.
 */
export function select(state: MapState, places: Places, id: string): MapState {
  const tool = places.tool(id);
  if (tool) return { ...focusCluster(state, places, tool.cluster), selection: { type: 'tool', id: tool.id } };
  const cluster = places.cluster(id);
  if (cluster) return { ...focusCluster(state, places, cluster.id), selection: { type: 'cluster', id: cluster.id } };
  const need = places.need(id);
  if (need) return { ...state, selection: { type: 'need', id: need.id } };
  return state;
}

/** Closes the detail card. The map stays where it is. */
export function clearSelection(state: MapState): MapState {
  return state.selection ? { ...state, selection: null } : state;
}

/** Steps out one distance: from a cluster to its tier, from a tier to the stack. */
export function stepOut(state: MapState): MapState {
  if (state.distance === 'cluster' && state.tier) {
    return { distance: 'tier', tier: state.tier, cluster: null, selection: null };
  }
  return AT_STACK;
}

/** What Escape does: closes the detail card if it is open, and otherwise steps out one distance. */
export function stepBack(state: MapState): MapState {
  return state.selection ? clearSelection(state) : stepOut(state);
}

/**
 * The state as a URL fragment, without the leading "#". The stack at rest is
 * the empty fragment. Parts of the `current` fragment that the state does not
 * own are kept as they are.
 */
export function toFragment(state: MapState, current = ''): string {
  const parts = new URLSearchParams(current.replace(/^#/, ''));
  parts.delete('tier');
  parts.delete('cluster');
  parts.delete('select');
  if (state.distance === 'cluster' && state.cluster) parts.set('cluster', state.cluster);
  else if (state.distance === 'tier' && state.tier) parts.set('tier', state.tier);
  if (state.selection) parts.set('select', state.selection.id);
  // A tool's id has a colon in it, which a fragment may hold as it is. The other parts are left as they are.
  return parts.toString().replace(/(^|&)select=[^&]*/, (part) => part.replace(/%3A/gi, ':'));
}

/**
 * Reads a URL fragment. Anything it cannot read, or an id the graph lacks,
 * gives the stack at rest. A selected tool or cluster decides the place, so
 * the fragment cannot name a selection that is somewhere else.
 */
export function fromFragment(fragment: string, places: Places): MapState {
  const parts = new URLSearchParams(fragment.replace(/^#/, ''));
  const cluster = parts.get('cluster');
  const tier = parts.get('tier');
  let state = AT_STACK;
  if (cluster !== null) state = focusCluster(AT_STACK, places, cluster);
  else if (tier !== null) state = focusTier(AT_STACK, places, tier);
  if ((cluster !== null || tier !== null) && state === AT_STACK) return AT_STACK;
  const selected = parts.get('select');
  if (selected === null) return state;
  const withSelection = select(state, places, selected);
  return withSelection.selection ? withSelection : AT_STACK;
}

/** Called after a change, with the new state and the one before it. */
export type Subscriber = (state: MapState, before: MapState) => void;

export interface Store {
  get(): MapState;
  /** Replaces the state. Subscribers hear of it only if something changed. */
  set(state: MapState): void;
  /** Returns the function that unsubscribes. */
  subscribe(subscriber: Subscriber): () => void;
  focusStack(): void;
  focusTier(tierId: string): void;
  focusCluster(clusterId: string): void;
  stepOut(): void;
  /** Selects a tool, cluster or need by its id. */
  select(id: string): void;
  clearSelection(): void;
  /** What Escape does. */
  stepBack(): void;
}

export function createStore(places: Places, initial: MapState = AT_STACK): Store {
  let state = initial;
  const subscribers = new Set<Subscriber>();
  const set = (next: MapState): void => {
    if (same(next, state)) return;
    const before = state;
    state = next;
    for (const subscriber of [...subscribers]) subscriber(state, before);
  };
  return {
    get: () => state,
    set,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => void subscribers.delete(subscriber);
    },
    focusStack: () => set(AT_STACK),
    focusTier: (tierId) => set(focusTier(state, places, tierId)),
    focusCluster: (clusterId) => set(focusCluster(state, places, clusterId)),
    stepOut: () => set(stepOut(state)),
    select: (id) => set(select(state, places, id)),
    clearSelection: () => set(clearSelection(state)),
    stepBack: () => set(stepBack(state)),
  };
}

/**
 * Keeps the store and the page's URL fragment in step, both ways. The store
 * starts from the fragment the page was opened with.
 */
export function syncWithFragment(store: Store, places: Places): void {
  const write = (state: MapState): void => {
    const fragment = toFragment(state, window.location.hash);
    if (fragment === window.location.hash.replace(/^#/, '')) return;
    // replaceState leaves no history entry for each step, and can drop the "#" itself.
    const url = new URL(window.location.href);
    url.hash = fragment;
    try {
      window.history.replaceState(null, '', url);
    } catch {
      window.location.hash = fragment;
    }
  };
  const read = (): void => {
    store.set(fromFragment(window.location.hash, places));
    // A fragment that names a tier, cluster or selection the graph lacks is put right.
    write(store.get());
  };
  read();
  window.addEventListener('hashchange', read);
  store.subscribe(write);
}
