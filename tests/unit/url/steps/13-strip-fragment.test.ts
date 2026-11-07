import { describe, expect, it } from "vitest";
import { VECTORS, VECTOR_KIND } from "../../../../src/types/vector";
import { parsed } from "../../../helpers/load-policies";
import { stripFragment } from "../../../../src/url/steps/13-strip-fragment";

describe("step 13: fragment", () => {
  const p = parsed("https://a.com/x.png#frag");
  it("strips the fragment for every auto-fetch vector", () => {
    for (const v of VECTORS.filter((x) => VECTOR_KIND[x] === "auto_fetch")) {
      expect(stripFragment(p, v).href, v).toBe("https://a.com/x.png");
    }
  });
  it("keeps the fragment for every link vector", () => {
    for (const v of VECTORS.filter((x) => VECTOR_KIND[x] === "link")) {
      expect(stripFragment(p, v).href, v).toBe("https://a.com/x.png#frag");
    }
  });
  it("removes an empty trailing # too", () => {
    expect(stripFragment(parsed("https://a.com/x.png#"), "markdown_image").href).toBe("https://a.com/x.png");
  });
  it("does not modify its input", () => {
    stripFragment(p, "markdown_image");
    expect(p.url.hash).toBe("#frag");
  });
  it("covers every vector", () => {
    expect(VECTORS.every((v) => VECTOR_KIND[v] !== undefined)).toBe(true);
  });
});
