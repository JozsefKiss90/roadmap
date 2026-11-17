/**
 * state: one store for what the map shows, synced to the URL fragment.
 *
 * So far it holds the distance, the focused tier or cluster, the selection,
 * the filters and the lens. The scene, the labels and the panels all read it
 * and write to it, and never call each other.
 *
 * The transitions are pure functions of the state; the store only holds the
 * current state and tells its subscribers when it changes. It also remembers
 * the role the role lens last showed, which is no part of the state or of the
 * URL fragment.
 */

/** One of the three zoom steps of the map. */
export type Distance = 'stack' | 'tier' | 'cluster';

/** What the detail card describes: the selected tool, cluster or need. */
export interface Selection {
  readonly type: 'tool' | 'cluster' | 'need';
  readonly id: string;
}

/** The seven filters, in the order the rail lists them. The names are also their keys in the URL fragment. */
export const FILTER_NAMES = ['decision', 'kind', 'used', 'operated', 'hosting', 'stream', 'gate'] as const;

export type FilterName = (typeof FILTER_NAMES)[number];

/**
 * The values chosen in each filter, in the order the filter lists them. A
 * filter with no value chosen lets every tool pass.
 */
export type Filters = Readonly<Record<FilterName, readonly string[]>>;

/** What one tool has for each filter. A tool that several roles use has several values for "used". */
export type Facets = Readonly<Record<FilterName, readonly string[]>>;

export const NO_FILTERS: Filters = {
  decision: [],
  kind: [],
  used: [],
  operated: [],
  hosting: [],
  stream: [],
  gate: [],
};

/** The role lens: brings forward the tools one role uses. */
export interface RoleLens {
  readonly type: 'role';
  /** The role's code, as the "used" filter lists it. */
  readonly role: string;
}

/** The lens that is on. The need trace and the phase scrub join it in later tickets. */
export type Lens = RoleLens;

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
  /** The filters hold wherever the map goes and whatever is selected. */
  readonly filters: Filters;
  /** The one lens that is on, or null for no lens. It holds wherever the map goes, as the filters do. */
  readonly lens: Lens | null;
}

/** What the state needs to know of the graph: its tiers, clusters, tools and needs, and what each filter lists. */
export interface Places {
  /** The values a filter lists, in its own order. The values of "used" are the roles the role lens offers. */
  filterValues(name: FilterName): readonly string[];
  tier(id: string): { id: string } | undefined;
  cluster(id: string): { id: string; tier: string } | undefined;
  tool(id: string): { id: string; cluster: string } | undefined;
  need(id: string): { id: string } | undefined;
}

export const AT_STACK: MapState = { distance: 'stack', tier: null, cluster: null, selection: null, filters: NO_FILTERS, lens: null };

const same = (a: MapState, b: MapState): boolean =>
  a.distance === b.distance &&
  a.tier === b.tier &&
  a.cluster === b.cluster &&
  a.selection?.type === b.selection?.type &&
  a.selection?.id === b.selection?.id &&
  a.lens?.type === b.lens?.type &&
  a.lens?.role === b.lens?.role &&
  (a.filters === b.filters || FILTER_NAMES.every((name) => a.filters[name].join('\n') === b.filters[name].join('\n')));

/** Goes to the tier distance for a tier, with nothing selected. An id the graph lacks changes nothing. */
export function focusTier(state: MapState, places: Places, tierId: string): MapState {
  const tier = places.tier(tierId);
  return tier ? { ...state, distance: 'tier', tier: tier.id, cluster: null, selection: null } : state;
}

/** Goes to the cluster distance for a cluster, with nothing selected. An id the graph lacks changes nothing. */
export function focusCluster(state: MapState, places: Places, clusterId: string): MapState {
  const cluster = places.cluster(clusterId);
  return cluster ? { ...state, distance: 'cluster', tier: cluster.tier, cluster: cluster.id, selection: null } : state;
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

/** Goes to the stack distance, with nothing selected. The filters and the lens stay. */
export function focusStack(state: MapState): MapState {
  return { ...AT_STACK, filters: state.filters, lens: state.lens };
}

/** Steps out one distance: from a cluster to its tier, from a tier to the stack. */
export function stepOut(state: MapState): MapState {
  if (state.distance === 'cluster' && state.tier) {
    return { ...state, distance: 'tier', tier: state.tier, cluster: null, selection: null };
  }
  return focusStack(state);
}

/** What Escape does: closes the detail card if it is open, and otherwise steps out one distance. */
export function stepBack(state: MapState): MapState {
  return state.selection ? clearSelection(state) : stepOut(state);
}

/** Chooses a value in a filter, or takes it out if it is chosen. A value the filter does not list changes nothing. */
export function toggleFilter(state: MapState, places: Places, name: FilterName, value: string): MapState {
  const chosen = state.filters[name];
  return setFilter(state, places, name, chosen.includes(value) ? chosen.filter((each) => each !== value) : [...chosen, value]);
}

/** Replaces what is chosen in one filter. Values the filter does not list are left out. */
export function setFilter(state: MapState, places: Places, name: FilterName, values: readonly string[]): MapState {
  const chosen = places.filterValues(name).filter((value) => values.includes(value));
  return { ...state, filters: { ...state.filters, [name]: chosen } };
}

/** Clears every filter. The place and the selection stay. */
export function clearFilters(state: MapState): MapState {
  return isFiltered(state.filters) ? { ...state, filters: NO_FILTERS } : state;
}

/** Whether any filter has a value chosen. */
export const isFiltered = (filters: Filters): boolean => FILTER_NAMES.some((name) => filters[name].length > 0);

/**
 * Whether a tool passes the filters. Within one filter it needs any one of
 * the chosen values; across filters it needs to pass each.
 */
export function passes(filters: Filters, facets: Facets): boolean {
  return FILTER_NAMES.every(
    (name) => filters[name].length === 0 || filters[name].some((value) => facets[name].includes(value)),
  );
}

/**
 * Switches the role lens on for a role, or for the first role when none is
 * named. It takes the place of any lens that was on. A role the graph lacks
 * changes nothing.
 */
export function showRoleLens(state: MapState, places: Places, role?: string): MapState {
  const roles = places.filterValues('used');
  const shown = role === undefined ? roles[0] : roles.includes(role) ? role : undefined;
  return shown === undefined ? state : { ...state, lens: { type: 'role', role: shown } };
}

/** Switches the lens off. The place, the selection and the filters stay. */
export function clearLens(state: MapState): MapState {
  return state.lens ? { ...state, lens: null } : state;
}

/** Whether a tool is in reach under a lens. The role lens means "used by" only. No lens leaves every tool in reach. */
export function inReach(lens: Lens | null, facets: Facets): boolean {
  return lens === null || facets.used.includes(lens.role);
}

/**
 * Whether a tool is drawn at full strength: in reach under the lens, and
 * passing the filters, which apply on top of it. Every other tool is faded.
 */
export function emphasised(state: Pick<MapState, 'lens' | 'filters'>, facets: Facets): boolean {
  return inReach(state.lens, facets) && passes(state.filters, facets);
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
  for (const name of FILTER_NAMES) {
    parts.delete(name);
    for (const value of state.filters[name]) parts.append(name, value);
  }
  parts.delete('lens');
  parts.delete('role');
  if (state.lens) {
    parts.set('lens', state.lens.type);
    parts.set('role', state.lens.role);
  }
  // A tool's id has a colon in it, which a fragment may hold as it is. The other parts are left as they are.
  return parts.toString().replace(/(^|&)select=[^&]*/, (part) => part.replace(/%3A/gi, ':'));
}

/**
 * Reads a URL fragment. Anything it cannot read, or an id the graph lacks,
 * gives the stack at rest. A selected tool or cluster decides the place, so
 * the fragment cannot name a selection that is somewhere else. The filters
 * are read on their own: a value a filter does not list is left out, and the
 * rest hold wherever the map opens. So is the lens: a lens or a role the
 * fragment names wrongly gives no lens, and the role lens with no role is the
 * lens for the first role.
 */
export function fromFragment(fragment: string, places: Places): MapState {
  const parts = new URLSearchParams(fragment.replace(/^#/, ''));
  const cluster = parts.get('cluster');
  const tier = parts.get('tier');
  const withLens = parts.get('lens') === 'role' ? showRoleLens(AT_STACK, places, parts.get('role') ?? undefined) : AT_STACK;
  const atStack = FILTER_NAMES.reduce((filtered, name) => {
    const values = parts.getAll(name);
    return values.length > 0 ? setFilter(filtered, places, name, values) : filtered;
  }, withLens);
  let state = atStack;
  if (cluster !== null) state = focusCluster(atStack, places, cluster);
  else if (tier !== null) state = focusTier(atStack, places, tier);
  if ((cluster !== null || tier !== null) && state === atStack) return atStack;
  const selected = parts.get('select');
  if (selected === null) return state;
  const withSelection = select(state, places, selected);
  return withSelection.selection ? withSelection : atStack;
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
  /** Chooses a value in a filter, or takes it out if it is chosen. */
  toggleFilter(name: FilterName, value: string): void;
  /** Replaces what is chosen in one filter. */
  setFilter(name: FilterName, values: readonly string[]): void;
  clearFilters(): void;
  /** Switches the role lens on: for this role, or for the role it last showed, or for the first role. */
  showRoleLens(role?: string): void;
  /** Switches the lens off. */
  clearLens(): void;
}

export function createStore(places: Places, initial: MapState = AT_STACK): Store {
  let state = initial;
  /** The role the role lens last showed, so that switching it off and on again comes back to the same role. */
  let lastRole = initial.lens?.role;
  const subscribers = new Set<Subscriber>();
  const set = (next: MapState): void => {
    if (same(next, state)) return;
    const before = state;
    state = next;
    lastRole = state.lens?.role ?? lastRole;
    for (const subscriber of [...subscribers]) subscriber(state, before);
  };
  return {
    get: () => state,
    set,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => void subscribers.delete(subscriber);
    },
    focusStack: () => set(focusStack(state)),
    focusTier: (tierId) => set(focusTier(state, places, tierId)),
    focusCluster: (clusterId) => set(focusCluster(state, places, clusterId)),
    stepOut: () => set(stepOut(state)),
    select: (id) => set(select(state, places, id)),
    clearSelection: () => set(clearSelection(state)),
    stepBack: () => set(stepBack(state)),
    toggleFilter: (name, value) => set(toggleFilter(state, places, name, value)),
    setFilter: (name, values) => set(setFilter(state, places, name, values)),
    clearFilters: () => set(clearFilters(state)),
    showRoleLens: (role) => set(showRoleLens(state, places, role ?? lastRole)),
    clearLens: () => set(clearLens(state)),
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
    // A fragment that names a tier, cluster, selection, filter value or role the graph lacks is put right.
    write(store.get());
  };
  read();
  window.addEventListener('hashchange', read);
  store.subscribe(write);
}
