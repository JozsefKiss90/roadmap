/**
 * press: what a press on the canvas is. It tells a tap from a drag, from a
 * finger held in place, and from a gesture of two fingers. No DOM in it: the
 * scene feeds it the pointer's events and acts on what it reports.
 *
 * - A **tap** is a press let go where it began. It is a click: it selects.
 * - A **drag** is a press that moved away. The orbit controls turn the stack
 *   with it, and it reports nothing. A finger that has moved away has dragged,
 *   wherever it is let go. A mouse is judged by where it is let go alone, as
 *   it was before the map knew fingers.
 * - A **hold** is a finger that rests in place. It stands in for a mouse's
 *   hover, so letting go is then no tap. A mouse has its hover and no hold.
 * - Two fingers are a pinch, which changes the camera's distance. Neither
 *   finger taps or holds, however little it moved.
 */

/** A point of the picture, in pixels. */
export interface PressPoint {
  x: number;
  y: number;
}

/** A pointer's event, as the press needs it. */
export interface PressPointer extends PressPoint {
  /** The pointer's own number: each finger on the screen has one. */
  id: number;
  /** Whether the pointer is a finger on a touch screen. */
  touch: boolean;
  /** Whether the press is with the first button. A finger's always is. */
  primary: boolean;
}

/** How far a press may move and still be a tap, and how long a finger rests before it is a hold. */
export interface PressSettings {
  /** A mouse press that moves further than this is a drag. */
  slopPx: number;
  /** The same for a finger, which is less steady. */
  touchSlopPx: number;
  /** How long a finger rests in place before the press is a hold. */
  holdMs: number;
}

/** What the scene tells the press of: each pointer's events on the canvas, as they come. */
export interface Press {
  down(pointer: PressPointer): void;
  move(pointer: PressPointer): void;
  up(pointer: PressPointer): void;
  /** The browser has taken the press away, as when it starts to scroll the page. */
  cancel(id: number): void;
}

/**
 * @param on What a press turned out to be. `tap` is told whether it was a finger's; `hold` is a finger's always.
 */
export function createPress(
  settings: PressSettings,
  on: { tap(at: PressPoint, byFinger: boolean): void; hold(at: PressPoint): void },
): Press {
  /** The pointers that are down. */
  const down = new Set<number>();
  /** The press that may still be a tap or a hold: one pointer, which has not moved away. */
  let candidate: { id: number; x: number; y: number; touch: boolean } | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  const drop = (): void => {
    clearTimeout(holdTimer);
    candidate = null;
  };
  const movedAway = (pointer: PressPoint): boolean =>
    candidate !== null &&
    Math.hypot(pointer.x - candidate.x, pointer.y - candidate.y) > (candidate.touch ? settings.touchSlopPx : settings.slopPx);

  return {
    down(pointer) {
      down.add(pointer.id);
      drop();
      // A second finger makes the press a pinch, and any button but the first is not a click.
      if (down.size > 1 || !pointer.primary) return;
      candidate = { id: pointer.id, x: pointer.x, y: pointer.y, touch: pointer.touch };
      if (!pointer.touch) return;
      const at = { x: pointer.x, y: pointer.y };
      holdTimer = setTimeout(() => {
        drop();
        on.hold(at);
      }, settings.holdMs);
    },
    move(pointer) {
      if (candidate?.id === pointer.id && candidate.touch && movedAway(pointer)) drop();
    },
    up(pointer) {
      down.delete(pointer.id);
      const tapped = candidate?.id === pointer.id && !movedAway(pointer) ? candidate : null;
      drop();
      if (tapped) on.tap({ x: pointer.x, y: pointer.y }, tapped.touch);
    },
    cancel(id) {
      down.delete(id);
      drop();
    },
  };
}
