// Heuristic: Shannon entropy (bits per character) of a long token. Returns true on a hit.
const MIN_LENGTH = 21;

export function shannonEntropy(token: string): number {
  const counts = new Map<string, number>();
  for (const char of token) counts.set(char, (counts.get(char) ?? 0) + 1);
  const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function hasHighEntropy(token: string, maxEntropy: number): boolean {
  return token.length >= MIN_LENGTH && shannonEntropy(token) > maxEntropy;
}
