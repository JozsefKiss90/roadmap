/**
 * The check the accessibility script makes on a state's text: every piece of
 * text on show meets the contrast contract against the surface it stands on,
 * and keeps to the text floor. The script reads one entry for each piece of
 * text, with its colour and the colour of the surface under it.
 *
 * The contrast contract (references/style-guide.md): 4.5 to 1 for text, and
 * 3 to 1 for large text, which is 24 pixels, or 18.7 pixels at weight 600.
 * The text floor: 12 pixels for a name and 11 for a count or a tag, which are
 * the text set in the mono face.
 *
 * It measures text of the page. The names drawn on the canvas are checked by
 * the style guide's contrast rows (`npm run contrast`).
 *
 * @typedef {readonly [number, number, number]} Rgb A colour with no transparency, as three channels from 0 to 255.
 * @typedef {{ name: string, colour: Rgb, surface: Rgb, sizePx: number, weight: number, mono: boolean }} TextStyle
 */

const TEXT_MINIMUM = 4.5;
const LARGE_TEXT_MINIMUM = 3;
const LARGE_PX = 24;
const LARGE_HEAVY_PX = 18.7;
const HEAVY_WEIGHT = 600;
const NAME_FLOOR_PX = 12;
const TAG_FLOOR_PX = 11;

function channelLuminance(/** @type {number} */ value) {
  const fraction = value / 255;
  return fraction <= 0.04045 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
}

const luminance = (/** @type {Rgb} */ colour) =>
  0.2126 * channelLuminance(colour[0]) + 0.7152 * channelLuminance(colour[1]) + 0.0722 * channelLuminance(colour[2]);

/**
 * The WCAG 2.x contrast ratio between two colours, from 1 to 21.
 * @param {Rgb} first
 * @param {Rgb} second
 */
export function contrastOf(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/**
 * What is wrong with a state's text. Text of one name with one fault is reported once, with how many more there are.
 *
 * @param {readonly TextStyle[] | null} texts What the page reported, or null if it reported nothing.
 * @returns {string[]}
 */
export function textFaults(texts) {
  if (!texts || texts.length === 0) return ['the page did not report its text'];
  /** @type {Map<string, number>} */
  const found = new Map();
  const note = (/** @type {string} */ fault) => found.set(fault, (found.get(fault) ?? 0) + 1);
  for (const { name, colour, surface, sizePx, weight, mono } of texts) {
    const large = sizePx >= LARGE_PX || (sizePx >= LARGE_HEAVY_PX && weight >= HEAVY_WEIGHT);
    const minimum = large ? LARGE_TEXT_MINIMUM : TEXT_MINIMUM;
    const ratio = contrastOf(colour, surface);
    if (ratio < minimum) note(`text is below ${minimum} to 1: "${name}", ${Math.round(ratio * 100) / 100} to 1`);
    const floor = mono ? TAG_FLOOR_PX : NAME_FLOOR_PX;
    if (sizePx < floor) note(`text is below the text floor of ${floor} pixels: "${name}", ${sizePx} pixels`);
  }
  return [...found].map(([fault, times]) => (times > 1 ? `${fault} (and ${times - 1} more like it)` : fault));
}
