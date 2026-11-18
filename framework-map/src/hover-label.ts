/**
 * hover-label: the small label beside the pointer that names the mark under
 * it. It gives the tool's name and its cluster, and nothing else. Where the
 * breadcrumb already names the cluster, it gives the name alone.
 *
 * The scene shows and hides it. It is part of the picture, like the names the
 * labels module draws, so it is hidden from assistive technology: the detail
 * card and the outline tree say the same in words.
 */

export interface HoverLabel {
  /**
   * Shows the label beside a point of the container, in pixels from its top
   * left corner. The label stays left of `room.right` and under `room.top`, where the room for it ends.
   * @param offsetPx How far the label stands from the point, to the right and above.
   */
  show(x: number, y: number, room: { top: number; right: number }, tool: string, cluster: string | null, offsetPx: number): void;
  hide(): void;
}

export function createHoverLabel(container: HTMLElement): HoverLabel {
  const label = document.createElement('div');
  label.className = 'hover-label';
  label.setAttribute('aria-hidden', 'true');
  label.hidden = true;
  const name = document.createElement('span');
  name.className = 'hover-label-name';
  const cluster = document.createElement('span');
  cluster.className = 'hover-label-cluster';
  label.append(name, cluster);
  container.append(label);

  return {
    show(x, y, room, toolName, clusterName, offsetPx) {
      name.textContent = toolName;
      cluster.textContent = clusterName ?? '';
      cluster.hidden = clusterName === null;
      label.hidden = false;
      // Right of and above the pointer, clear of the marks around the hovered one;
      // or on the other side where that would leave the container.
      const { offsetWidth: width, offsetHeight: height } = label;
      const left = x + offsetPx + width > room.right ? x - offsetPx - width : x + offsetPx;
      const top = y - offsetPx - height < room.top ? y + offsetPx : y - offsetPx - height;
      label.style.transform = `translate(${Math.max(0, Math.round(left))}px, ${Math.max(0, Math.round(top))}px)`;
    },
    hide() {
      label.hidden = true;
    },
  };
}
