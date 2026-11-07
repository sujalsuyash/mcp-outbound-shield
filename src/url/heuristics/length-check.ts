// Heuristic: total URL length ceiling. Returns true when the URL is too long.
export function exceedsLength(href: string, maxLength: number): boolean {
  return href.length > maxLength;
}
