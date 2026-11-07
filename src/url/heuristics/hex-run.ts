// Heuristic: a long contiguous run of hex digits in a dynamic token. Returns true on a hit.
const HEX_RUN = /[0-9a-fA-F]{20,}/;

export function hasHexRun(token: string): boolean {
  return HEX_RUN.test(token);
}
