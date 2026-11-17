/**
 * lens-panel: the lens switch at the head of the rail, and what the lens that
 * is on needs beside it. So far it offers no lens and the role lens; the need
 * trace and the phase scrub add to it in later tickets.
 *
 * With the role lens on, it lists the three roles, one of which is chosen,
 * and gives the number of tools in that role's reach.
 *
 * It is one of the panels: it reads the state store and writes to it, and
 * knows nothing of the scene.
 */
import type { GraphIndex } from './data';
import { element } from './dom';
import type { MapState, Store } from './state';

/** The lenses the switch offers, in the order of their keys: the value, its name, and its key. */
const LENSES = [
  ['none', 'None', '1'],
  ['role', 'Role', '2'],
] as const;

interface Segments {
  readonly element: HTMLElement;
  /** Marks one value as chosen, or none. */
  choose(value: string | null): void;
  /** Puts the keyboard focus on the chosen segment. */
  focus(): void;
}

/**
 * A row of choices of which one is chosen: radio buttons, drawn as the
 * segments of one control. The browser gives them the arrow keys.
 */
function segments(
  group: string,
  options: readonly (readonly [value: string, name: string, key?: string])[],
  onChoose: (value: string) => void,
): Segments {
  const inputs = new Map<string, HTMLInputElement>();
  const row = element(
    'div',
    'segments',
    ...options.map(([value, name, key]) => {
      const input = element('input', null);
      input.type = 'radio';
      input.name = group;
      input.value = value;
      if (key) input.setAttribute('aria-keyshortcuts', key);
      input.addEventListener('change', () => {
        if (input.checked) onChoose(value);
      });
      inputs.set(value, input);
      const segment = element('label', 'segment', input, element('span', null, name));
      if (key) segment.title = `${name} (key ${key})`;
      return segment;
    }),
  );
  row.setAttribute('role', 'radiogroup');
  return {
    element: row,
    choose(value) {
      for (const [each, input] of inputs) input.checked = each === value;
    },
    focus() {
      row.querySelector<HTMLInputElement>('input:checked')?.focus();
    },
  };
}

/** @param before The part of the rail the lens switch stands above. */
export function mountLensPanel(parent: HTMLElement, before: Node, index: GraphIndex, store: Store): void {
  const heading = element('h2', 'rail-heading', 'Lens');
  heading.id = 'lens-heading';

  // The count at the head of the filters is the live region that says a change of lens or role.
  const count = element('p', 'lens-count');

  const lenses = segments('lens', LENSES, (value) => {
    if (value === 'role') store.showRoleLens();
    else store.clearLens();
  });
  lenses.element.setAttribute('aria-labelledby', heading.id);

  const roles = segments(
    'lens-role',
    index.filterValues('used').map((role) => [role, index.roleName(role)] as const),
    (role) => store.showRoleLens(role),
  );
  roles.element.setAttribute('aria-label', 'Role whose tools the lens brings forward');
  // The roles are a choice within the role lens, and are drawn more quietly than the lens switch.
  roles.element.classList.add('segments-within');

  const panel = element('section', 'lens', element('div', 'lens-head', heading, count), lenses.element, roles.element);
  panel.setAttribute('aria-labelledby', heading.id);
  parent.insertBefore(panel, before);

  function render({ lens }: MapState): void {
    lenses.choose(lens?.type ?? 'none');
    // A row of roles that closes under the partner's hands, as with the key `1`, hands the focus to the lens switch.
    const heldFocus = roles.element.contains(document.activeElement);
    roles.element.hidden = lens?.type !== 'role';
    if (heldFocus && roles.element.hidden) lenses.focus();
    roles.choose(lens?.role ?? null);
    if (lens) {
      const inReach = index.inReach(lens).size;
      count.textContent = `${inReach} ${inReach === 1 ? 'tool' : 'tools'} in reach`;
    } else {
      count.textContent = '';
    }
  }

  render(store.get());
  store.subscribe((state, previous) => {
    if (state.lens !== previous.lens) render(state);
  });
}
