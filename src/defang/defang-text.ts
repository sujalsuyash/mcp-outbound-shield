// Defangs every URL-looking substring inside free text, so text cannot be auto-linked by a renderer.
import { defangUrl } from "./defang-url";

// Scheme length is bounded on purpose: an unbounded run of [a-z0-9+.-] is quadratic on crafted input.
const URL_LIKE = /(?:\b[a-z][a-z0-9+.-]{0,19}:\/\/|\bwww\.)[^\s<>"'`]*/gi;

export function defangText(text: string): string {
  return text.replace(URL_LIKE, (match) => defangUrl(match));
}
