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
   * left corner. The label stays left of `rightEdge`, where the room for it ends.
   */
  show(x: number, y: number, rightEdge: number, tool: string, cluster: string | null): void;
  hide(): void;
}

export function createHoverLabel(container: HTMLElement, offsetPx: number): HoverLabel {
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
    show(x, y, rightEdge, toolName, clusterName) {
      name.textContent = toolName;
      cluster.textContent = clusterName ?? '';
      cluster.hidden = clusterName === null;
      label.hidden = false;
      // Right of and above the pointer, clear of the marks around the hovered one;
      // or on the other side where that would leave the container.
      const { offsetWidth: width, offsetHeight: height } = label;
      const left = x + offsetPx + width > rightEdge ? x - offsetPx - width : x + offsetPx;
      const top = y - offsetPx - height < 0 ? y + offsetPx : y - offsetPx - height;
      label.style.transform = `translate(${Math.max(0, Math.round(left))}px, ${Math.max(0, Math.round(top))}px)`;
    },
    hide() {
      label.hidden = true;
    },
  };
}
