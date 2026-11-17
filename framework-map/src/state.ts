/**
 * state: one store for what the map shows, synced to the URL fragment.
 *
 * So far it holds the distance and the focused tier or cluster. The scene, the
 * labels and the panels all read it and write to it, and never call each other.
 * Lens, selection and filters join it in later tickets.
 *
 * The transitions are pure functions of the state; the store only holds the
 * current state and tells its subscribers when it changes.
 */

/** One of the three zoom steps of the map. */
export type Distance = 'stack' | 'tier' | 'cluster';

/**
 * Where the map is. At the stack distance nothing is focused; at the tier
 * distance a tier is; at the cluster distance a cluster is, with its tier.
 */
export interface MapState {
  readonly distance: Distance;
  readonly tier: string | null;
  readonly cluster: string | null;
}

/** What the state needs to know of the graph: which tiers and clusters it has. */
export interface Places {
  tier(id: string): { id: string } | undefined;
  cluster(id: string): { id: string; tier: string } | undefined;
}

export const AT_STACK: MapState = { distance: 'stack', tier: null, cluster: null };

const same = (a: MapState, b: MapState): boolean =>
  a.distance === b.distance && a.tier === b.tier && a.cluster === b.cluster;

/** Goes to the tier distance for a tier. An id the graph lacks changes nothing. */
export function focusTier(state: MapState, places: Places, tierId: string): MapState {
  const tier = places.tier(tierId);
  return tier ? { distance: 'tier', tier: tier.id, cluster: null } : state;
}

/** Goes to the cluster distance for a cluster. An id the graph lacks changes nothing. */
export function focusCluster(state: MapState, places: Places, clusterId: string): MapState {
  const cluster = places.cluster(clusterId);
  return cluster ? { distance: 'cluster', tier: cluster.tier, cluster: cluster.id } : state;
}

/** Steps out one distance: from a cluster to its tier, from a tier to the stack. */
export function stepOut(state: MapState): MapState {
  if (state.distance === 'cluster' && state.tier) return { distance: 'tier', tier: state.tier, cluster: null };
  return AT_STACK;
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
  if (state.distance === 'cluster' && state.cluster) parts.set('cluster', state.cluster);
  else if (state.distance === 'tier' && state.tier) parts.set('tier', state.tier);
  return parts.toString();
}

/** Reads a URL fragment. Anything it cannot read, or an id the graph lacks, gives the stack at rest. */
export function fromFragment(fragment: string, places: Places): MapState {
  const parts = new URLSearchParams(fragment.replace(/^#/, ''));
  const cluster = parts.get('cluster');
  if (cluster !== null) return focusCluster(AT_STACK, places, cluster);
  const tier = parts.get('tier');
  if (tier !== null) return focusTier(AT_STACK, places, tier);
  return AT_STACK;
}

/** Called after a change, with the new state. */
export type Subscriber = (state: MapState) => void;

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
}

export function createStore(places: Places, initial: MapState = AT_STACK): Store {
  let state = initial;
  const subscribers = new Set<Subscriber>();
  const set = (next: MapState): void => {
    if (same(next, state)) return;
    state = next;
    for (const subscriber of [...subscribers]) subscriber(state);
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
    // A fragment that names a tier or cluster the graph lacks is put right.
    write(store.get());
  };
  read();
  window.addEventListener('hashchange', read);
  store.subscribe(write);
}
