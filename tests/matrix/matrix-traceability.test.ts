// Checks the fixture itself: coverage of reasons, steps, vectors and spec rows, plus consistency
// with the real WHATWG parser and with the step order. Runs before the evaluator exists.
import { describe, expect, it } from "vitest";
import { POLICIES } from "../helpers/matrix-policy";
import { preParseOracle } from "../helpers/pre-parse-oracle";
import { REASON_STEP } from "../helpers/reason-step-map";
import { URL_CASES, type EvaluatorCheck } from "../fixtures/url-matrix";
import { loadPolicy } from "../../src/policy/load-policy";
import { REJECT_REASONS } from "../../src/types/reject-reason";
import { VECTORS, VECTOR_KIND } from "../../src/types/vector";

const evaluatorRows = URL_CASES.flatMap((c) => (c.evaluator ? [{ id: c.id, ...c.evaluator }] : []));

const SPEC_IDS = [
  "T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07", "T-08a", "T-08b", "T-09", "T-10", "T-11",
  "T-12a", "T-12b", "T-12c", "T-13", "T-14", "T-15", "T-16", "T-17", "T-18", "T-19", "T-20a", "T-20b",
  "T-21", "T-22", "T-23", "T-24", "T-25", "T-26", "T-27", "T-28", "T-29", "T-30", "T-31", "T-32",
  "T-33", "T-34", "T-35"
];

/** Reasons that cannot be triggered by input; each needs its own dedicated unit test. */
const NOT_INPUT_REACHABLE = new Set(["internal_error"]);

describe("fixture shape", () => {
  it("has unique ids", () => {
    const ids = URL_CASES.map((c) => c.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("contains every row of the spec table", () => {
    const ids = new Set(URL_CASES.map((c) => c.id));
    expect(SPEC_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("gives every row at least one check", () => {
    expect(URL_CASES.filter((c) => !c.evaluator && !c.sanitize).map((c) => c.id)).toEqual([]);
  });

  it("keeps documented limitations as allow verdicts", () => {
    for (const c of URL_CASES.filter((x) => x.category === "limitation")) {
      expect(c.evaluator?.expect.allow, c.id).toBe(true);
    }
  });

  it("loads both test policies", () => {
    expect(() => loadPolicy(POLICIES.matrix)).not.toThrow();
    expect(() => loadPolicy(POLICIES.extra)).not.toThrow();
  });
});

describe("coverage", () => {
  it("exercises every reject reason", () => {
    const covered = new Set(
      evaluatorRows.flatMap((r) => (r.expect.allow ? [] : [r.expect.reason]))
    );
    const missing = REJECT_REASONS.filter((r) => !covered.has(r) && !NOT_INPUT_REACHABLE.has(r));
    expect(missing).toEqual([]);
  });

  it("maps every reject reason to a pipeline step", () => {
    expect(REJECT_REASONS.filter((r) => !(r in REASON_STEP))).toEqual([]);
  });

  it("exercises every pipeline step 1..14", () => {
    const steps = new Set<number>();
    for (const r of evaluatorRows) {
      if (!r.expect.allow) {
        const step = REASON_STEP[r.expect.reason];
        if (step !== null) steps.add(step);
      }
      r.exercises?.forEach((s) => steps.add(s));
    }
    const missing = Array.from({ length: 14 }, (_, i) => i + 1).filter((s) => !steps.has(s));
    expect(missing).toEqual([]);
  });

  it("exercises every vector", () => {
    const used = new Set(evaluatorRows.map((r) => r.vector));
    expect(VECTORS.filter((v) => !used.has(v))).toEqual([]);
  });

  it("covers both allow and reject for every vector", () => {
    for (const v of VECTORS) {
      const rows = evaluatorRows.filter((r) => r.vector === v);
      expect(rows.some((r) => r.expect.allow), `${v} allow`).toBe(true);
      expect(rows.some((r) => !r.expect.allow), `${v} reject`).toBe(true);
    }
  });
});

describe("consistency with the step order (oracle for steps 1 to 4)", () => {
  for (const r of evaluatorRows) {
    it(`${r.id} reaches the step that should decide it`, () => {
      const oracle = preParseOracle(r.url);
      if (r.expect.allow) {
        expect(oracle.failedStep).toBeNull();
        return;
      }
      const step = REASON_STEP[r.expect.reason];
      if (step !== null && step <= 4) {
        expect(oracle.failedStep).toBe(step);
      } else {
        expect(oracle.failedStep).toBeNull();
      }
    });
  }
});

describe("consistency with the real WHATWG parser", () => {
  const canonicalFor = (r: EvaluatorCheck): string | null => {
    const { stripped } = preParseOracle(r.url);
    if (stripped === "" || (!stripped.startsWith("//") && !/^[a-z][a-z0-9+.-]*:/i.test(stripped))) {
      return null; // relative: canonical form is path-only and is not checked here
    }
    const absolute = stripped.startsWith("//") ? `https:${stripped}` : stripped;
    const parsed = new URL(absolute);
    if (VECTOR_KIND[r.vector] === "auto_fetch") parsed.hash = "";
    return parsed.href;
  };

  for (const r of evaluatorRows.filter((x) => x.expect.allow)) {
    it(`${r.id} canonical form equals what the browser parser produces`, () => {
      const expected = canonicalFor(r);
      if (expected === null) return;
      expect(r.expect.allow && r.expect.canonical).toBe(expected);
      expect(new URL(expected).href).toBe(expected);
    });
  }

  for (const r of evaluatorRows.filter((x) => !x.expect.allow)) {
    const step = !r.expect.allow ? REASON_STEP[r.expect.reason] : null;
    if (step === null || step <= 6) continue;
    it(`${r.id} parses successfully, so it can reach step ${step}`, () => {
      const { stripped } = preParseOracle(r.url);
      const isAbsolutePathRelative = stripped.startsWith("/") && !stripped.startsWith("//");
      const target = isAbsolutePathRelative
        ? new URL(stripped, "https://relative.invalid/")
        : new URL(stripped.startsWith("//") ? `https:${stripped}` : stripped);
      expect(target.href.length).toBeGreaterThan(0);
    });
  }
});
