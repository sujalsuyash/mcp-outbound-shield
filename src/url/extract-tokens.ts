// Extracts the "dynamic" tokens heuristics inspect: non-literal path segments (minus image extension)
// and query values.
import type { CompiledEntry } from "../policy/load-policy";

const IMAGE_EXTENSION = /\.(?:png|jpe?g|svg|gif|webp)$/i;

export function extractTokens(url: URL, entry: CompiledEntry): string[] {
  const literals = new Set(entry.patterns.flatMap((p) => p.literals.map((l) => l.toLowerCase())));

  const pathTokens = url.pathname
    .split("/")
    .filter((segment) => segment !== "" && !literals.has(segment.toLowerCase()))
    .map((segment) => segment.replace(IMAGE_EXTENSION, ""));

  const queryTokens = url.search
    .slice(1)
    .split("&")
    .map((pair) => (pair.includes("=") ? pair.slice(pair.indexOf("=") + 1) : ""));

  return [...pathTokens, ...queryTokens].filter((token) => token !== "");
}
