// Runs the URL and vector matrix. Each row stays a todo until the module it needs exists:
//   evaluator rows -> src/url/evaluate-url.ts, sanitize rows -> src/pipeline/sanitize.ts.
// When a module lands, replace its todos with the real assertions (one loop over URL_CASES).
import { describe, it } from "vitest";
import { URL_CASES } from "../fixtures/url-matrix";

describe("URL matrix: evaluator", () => {
  for (const c of URL_CASES) {
    if (c.evaluator) it.todo(`${c.id} ${c.title}`);
  }
});

describe("URL matrix: sanitizer", () => {
  for (const c of URL_CASES) {
    if (c.sanitize) it.todo(`${c.id} ${c.title}`);
  }
});
