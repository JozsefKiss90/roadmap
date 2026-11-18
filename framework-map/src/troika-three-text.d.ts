/** troika-three-text ships no types. This declares only what the map uses. */
declare module 'troika-three-text' {
  import type { Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    /** The URL of a .ttf, .otf or .woff file. woff2 is not supported. */
    font: string | null;
    fontSize: number;
    lineHeight: number | 'normal';
    maxWidth: number;
    textAlign: 'left' | 'right' | 'center' | 'justify';
    anchorX: number | 'left' | 'center' | 'right';
    anchorY: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
    color: string | number;
    /** What the typeset text covers, from its anchor: left, bottom, right, top. Null until the first sync. */
    readonly textRenderInfo: { blockBounds: [number, number, number, number] } | null;
    /** Typesets the text; `done` runs once the result is in place. */
    sync(done?: () => void): void;
    dispose(): void;
  }
}
