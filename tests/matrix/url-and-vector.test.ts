// Runs the URL and vector matrix.
//  - evaluator rows run against src/url/evaluate-url.ts
//  - sanitizer rows stay todo until src/pipeline/sanitize.ts exists
import { describe, expect, it } from "vitest";
import { LOADED } from "../helpers/load-policies";
import { URL_CASES } from "../fixtures/url-matrix";
import { evaluateUrl } from "../../src/url/evaluate-url";

describe("URL matrix: evaluator", () => {
  for (const c of URL_CASES) {
    const e = c.evaluator;
    if (!e) continue;
    it(`${c.id} ${c.title}`, () => {
      const verdict = evaluateUrl(e.url, e.vector, LOADED[e.policy]);
      if (e.expect.allow) {
        expect(verdict).toEqual({ allow: true, canonical: e.expect.canonical });
      } else {
        expect(verdict).toMatchObject({ allow: false, reason: e.expect.reason });
      }
    });
  }
});

describe("URL matrix: sanitizer", () => {
  for (const c of URL_CASES) {
    if (c.sanitize) it.todo(`${c.id} ${c.title}`);
  }
});
