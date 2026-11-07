// Step 13: remove the fragment for auto-fetch vectors. Returns a copy; the input is not modified.
import { VECTOR_KIND, type Vector } from "../../types/vector";
import type { ParsedUrl } from "../url-state";

export function stripFragment(parsed: ParsedUrl, vector: Vector): URL {
  const copy = new URL(parsed.url.href);
  if (VECTOR_KIND[vector] === "auto_fetch") copy.hash = "";
  return copy;
}
