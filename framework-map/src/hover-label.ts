/**
 * hover-label: the small label beside the pointer for the mark under it. It
 * gives where the mark stands (its tier, its cell and its place in the cell),
 * the tool's name, and its decision-class step with the step's square. A
 * leader runs from the label toward the mark.
 *
 * The scene shows and hides it. It is part of the picture, like the names the
 * labels module draws, so it is hidden from assistive technology: the detail
 * card and the outline tree say the same in words.
 */
import { STEP_NAMES } from './display';
import type { DecisionStep } from './display';
import { dressSwatch, element, stepSwatch } from './dom';
import { MAP_TOKENS, colourOf, cssOf } from './tokens';

/** What the label says of a mark. */
export interface HoveredMark {
  /** Where the mark stands, as codes: its tier, its cluster and its place in the cell. */
  place: string;
  /** The tool's name. */
  name: string;
  step: DecisionStep;
}

export interface HoverLabel {
  /**
   * Shows the label beside a point of the container, in pixels from its top
   * left corner. The label stays left of `room.right` and under `room.top`, where the room for it ends.
   * @param offsetPx How far the label stands to the right of the point. Its leader ends half as far above the point.
   * @param leaderPx How long the leader is. The label stands above the point by the leader and its gap.
   */
  show(x: number, y: number, room: { top: number; right: number }, mark: HoveredMark, offsetPx: number, leaderPx: number): void;
  hide(): void;
}

export function createHoverLabel(container: HTMLElement): HoverLabel {
  const place = element('span', 'hover-label-place');
  const name = element('span', 'hover-label-name');
  const square = stepSwatch('committed');
  const stepName = element('span', null);
  const leader = element('span', 'hover-label-leader');
  // map-label-leader gives the hover label's leader a colour and a width of its own.
  const { hoverLine, widthPx } = MAP_TOKENS['map-label-leader'];
  leader.style.width = `${widthPx}px`;
  leader.style.background = cssOf(colourOf(hoverLine));
  const label = element('div', 'hover-label', place, name, element('span', 'hover-label-class', square, stepName), leader);
  label.setAttribute('aria-hidden', 'true');
  label.hidden = true;
  container.append(label);

  return {
    show(x, y, room, mark, offsetPx, leaderPx) {
      place.textContent = mark.place;
      name.textContent = mark.name;
      dressSwatch(square, mark.step, false);
      stepName.textContent = STEP_NAMES[mark.step];
      label.hidden = false;
      // Right of and above the pointer, clear of the marks around the hovered one;
      // or on the other side where that would leave the container.
      const { offsetWidth: width, offsetHeight: height } = label;
      const gapPx = offsetPx / 2;
      const above = y - gapPx - leaderPx - height >= room.top;
      const left = Math.max(0, Math.round(x + offsetPx + width > room.right ? x - offsetPx - width : x + offsetPx));
      const top = Math.max(0, Math.round(above ? y - gapPx - leaderPx - height : y + gapPx + leaderPx));
      label.style.transform = `translate(${left}px, ${top}px)`;
      // The leader stands in the point's own column, from the label's near edge toward the mark. It is
      // placed from the inside of the label's border.
      leader.style.left = `${Math.round(x) - left - label.clientLeft}px`;
      leader.style.top = `${(above ? height : -leaderPx) - label.clientTop}px`;
      leader.style.height = `${leaderPx}px`;
    },
    hide() {
      label.hidden = true;
    },
  };
}
