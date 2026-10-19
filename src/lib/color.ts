/**
 * Pure color validation utilities, safe to invoke from both Server and Client Components.
 */

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_REGEX = /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*[\d.]+%?)?\s*\)$/i;
const HSL_COLOR_REGEX = /^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*[\d.]+%?)?\s*\)$/i;

export function isColorValue(str: string): boolean {
  const s = str.trim();
  return HEX_COLOR_REGEX.test(s) || RGB_COLOR_REGEX.test(s) || HSL_COLOR_REGEX.test(s);
}
