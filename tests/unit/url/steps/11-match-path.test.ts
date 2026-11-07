import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX, parsed } from "../../../helpers/load-policies";
import { matchPath } from "../../../../src/url/steps/11-match-path";

const H = MATRIX.policy.default_heuristics;
const github = MATRIX.entries.get("github.com")!;
const deep = EXTRA.entries.get("deep.example.org")!;
const run = (url: string, entry = github) => matchPath(parsed(url), entry, H);

describe("step 11: path", () => {
  it("passes a path matching the pattern", () => {
    expect(run("https://github.com/my-org/assets/logo.png")).toMatchObject({ ok: true });
  });
  it("rejects a path that matches no pattern", () => {
    for (const p of ["/other/x.png", "/my-org/assets/x.jpg", "/my-org/assets/a/b.png", "/"]) {
      expect(run(`https://github.com${p}`), p).toMatchObject({ ok: false, reason: "path_not_allowed" });
    }
  });
  it("judges the path after dot-segments are resolved", () => {
    expect(run("https://github.com/my-org/assets/../../evil/leak.png")).toMatchObject({ ok: false, reason: "path_not_allowed" });
    expect(run("https://github.com/my-org/x/../assets/ok.png")).toMatchObject({ ok: true });
  });
  it.each(["a~b.png", "a!b.png", "a$b.png", "a(b.png", "a,b.png", "a=b.png", "a@b.png", "a:b.png", 'a"b.png', "a<b.png", "a b.png"])(
    "rejects characters outside the segment set: %s", (name) => {
      expect(run(`https://github.com/my-org/assets/${name}`)).toMatchObject({ ok: false, reason: "path_charset" });
    });
  it("rejects empty segments, including a trailing slash, as path_charset", () => {
    expect(run("https://github.com/my-org//assets/x.png")).toMatchObject({ ok: false, reason: "path_charset" });
    expect(run("https://github.com/my-org/assets/")).toMatchObject({ ok: false, reason: "path_charset" });
  });

  it("enforces the segment length limit exactly (64)", () => {
    const at = (n: number) => `https://deep.example.org/d/${"g".repeat(n)}`;
    expect(run(at(64), deep)).toMatchObject({ ok: true });
    expect(run(at(65), deep)).toMatchObject({ ok: false, reason: "path_charset" });
  });
  it("enforces the depth limit exactly (6 segments)", () => {
    expect(run("https://deep.example.org/d/a/b/c/d/e", deep)).toMatchObject({ ok: true });
    expect(run("https://deep.example.org/d/a/b/c/d/e/f", deep)).toMatchObject({ ok: false, reason: "path_too_deep" });
  });
  it("checks charset before depth, and depth before the pattern", () => {
    expect(run("https://deep.example.org/d/a/b/c/d/e/f~", deep)).toMatchObject({ reason: "path_charset" });
    expect(run("https://github.com/a/b/c/d/e/f/g.png")).toMatchObject({ reason: "path_too_deep" });
  });
  it("handles a very long segment without scanning it", () => {
    const started = Date.now();
    run(`https://github.com/my-org/assets/${"a".repeat(1_000_000)}.png`);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
