import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../helpers/load-policies";
import { evaluateUrl } from "../../../src/url/evaluate-url";

const GH = "https://github.com/my-org/assets";

describe("evaluateUrl", () => {
  it("returns the canonical URL for an allowed input", () => {
    expect(evaluateUrl(`  HTTPS://GITHUB.COM/my-org/assets/logo.png#f `, "markdown_image", MATRIX)).toEqual({
      allow: true, canonical: `${GH}/logo.png`
    });
  });

  it("reports the earliest failing step when several apply", () => {
    // Step 1 (entity), step 3 (char), step 4 (;), step 9 (port), step 10 (host) would all fire.
    expect(evaluateUrl("https://evil.com:8080/a;b&amp;\u200b", "markdown_image", MATRIX)).toMatchObject({ reason: "double_encoded" });
    expect(evaluateUrl("https://evil.com:8080/a;b\u200b", "markdown_image", MATRIX)).toMatchObject({ reason: "illegal_char" });
    expect(evaluateUrl("https://evil.com:8080/a;b", "markdown_image", MATRIX)).toMatchObject({ reason: "illegal_delimiter" });
    expect(evaluateUrl("https://evil.com:8080/ab", "markdown_image", MATRIX)).toMatchObject({ reason: "port_not_allowed" });
    expect(evaluateUrl("https://evil.com/ab", "markdown_image", MATRIX)).toMatchObject({ reason: "host_not_allowed" });
  });

  it("keeps the fragment on link vectors and drops it on auto-fetch vectors", () => {
    expect(evaluateUrl(`${GH}/a.png#top`, "markdown_link", MATRIX)).toMatchObject({ canonical: `${GH}/a.png#top` });
    expect(evaluateUrl(`${GH}/a.png#top`, "markdown_image", MATRIX)).toMatchObject({ canonical: `${GH}/a.png` });
  });

  it("is deterministic and does not mutate the policy", () => {
    const before = JSON.stringify([...MATRIX.entries.keys()]);
    const a = evaluateUrl(`${GH}/a.png`, "markdown_image", MATRIX);
    const b = evaluateUrl(`${GH}/a.png`, "markdown_image", MATRIX);
    expect(a).toEqual(b);
    expect(JSON.stringify([...MATRIX.entries.keys()])).toBe(before);
  });

  it("fails closed with internal_error when something throws", () => {
    const broken = { ...MATRIX };
    Object.defineProperty(broken, "entries", { get() { throw new Error("boom"); } });
    expect(evaluateUrl(`${GH}/a.png`, "markdown_image", broken)).toEqual({ allow: false, reason: "internal_error" });
  });
  it("fails closed on non-string input", () => {
    for (const bad of [undefined, null, 42, {}, []]) {
      expect(evaluateUrl(bad as unknown as string, "markdown_image", MATRIX), String(bad)).toEqual({ allow: false, reason: "internal_error" });
    }
  });

  it("handles relative URLs through the __relative__ entry", () => {
    expect(evaluateUrl("/icons/a.png", "html_img_src", EXTRA)).toEqual({ allow: true, canonical: "/icons/a.png" });
    expect(evaluateUrl("/icons/a.png", "html_img_src", MATRIX)).toMatchObject({ reason: "relative_not_allowed" });
  });
});
