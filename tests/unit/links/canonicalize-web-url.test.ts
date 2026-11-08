import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../helpers/load-policies";
import { canonicalizeWebUrl } from "../../../src/links/canonicalize-web-url";

const c = (url: string, loaded = MATRIX) => canonicalizeWebUrl(url, loaded);

describe("canonicalizeWebUrl", () => {
  it.each([
    ["https://example.com/a%20b", "https://example.com/a%20b"],
    ["HTTP://Example.COM", "http://example.com/"],
    ["  https://example.com/x  ", "https://example.com/x"],
    ["https://example.com/x#frag", "https://example.com/x#frag"],
    ["https://example.com:8443/x?y=1;z", "https://example.com:8443/x?y=1;z"],
    ["https:/example.com/x", "https://example.com/x"],
    ["//example.com/x", "https://example.com/x"],
    ["https://example.com/caf\u00e9", "https://example.com/caf%C3%A9"],
    ["https://exa\tmple.com/x", "https://example.com/x"]
  ])("accepts %j -> %s", (input, expected) => {
    expect(c(input)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)", "data:text/html,x", "ftp://example.com/x", "mailto:a@b.com", "blob:https://a.com/u",
    "https://user@example.com/", "https://u:p@example.com/", "https://example.com@evil.com/",
    "https://127.0.0.1/", "https://[::1]/", "https://example.com./x",
    "/relative", "relative/path", "", "   ", "https://", "https://[::1",
    "https://example.com/a&amp;b", "https://example.com/&#46;"
  ])("rejects %j", (input) => {
    expect(c(input)).toBeNull();
  });

  it("does not accept relative URLs even when a __relative__ entry exists", () => {
    expect(c("/icons/a.png", EXTRA)).toBeNull();
  });
  it("returns the parser's own href (what a browser would navigate to)", () => {
    for (const input of ["https://EXAMPLE.com/a/../b", "https://example.com/a b"]) {
      expect(c(input)).toBe(new URL(input).href);
    }
  });
  it("never throws, whatever it is given", () => {
    for (const bad of [undefined, null, 5, {}, "\ud800", "https://\u0000"]) {
      expect(() => c(bad as unknown as string)).not.toThrow();
    }
  });
});
