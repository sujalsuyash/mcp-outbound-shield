import { describe, expect, it } from "vitest";
import { compilePathPattern } from "../../../src/policy/compile-path-patterns";
import { PolicyError } from "../../../src/policy/policy-error";

const m = (pattern: string, path: string, ci = false) => compilePathPattern(pattern, ci).matches(path);

describe("compilePathPattern: matching", () => {
  it("* matches exactly one segment with an extension", () => {
    expect(m("/my-org/assets/*.png", "/my-org/assets/logo.png")).toBe(true);
    expect(m("/my-org/assets/*.png", "/my-org/assets/a/b.png")).toBe(false);
    expect(m("/my-org/assets/*.png", "/my-org/assets/SE/CR/ET.png")).toBe(false);
    expect(m("/my-org/assets/*.png", "/my-org/assets/logo.jpg")).toBe(false);
  });

  it("* needs at least one character", () => {
    expect(m("/a/*.png", "/a/.png")).toBe(false);
    expect(m("/a/*", "/a/x")).toBe(true);
  });

  it("literal segments match exactly", () => {
    expect(m("/a/b.png", "/a/b.png")).toBe(true);
    expect(m("/a/b.png", "/a/c.png")).toBe(false);
    expect(m("/a/b.png", "/a/b.png/extra")).toBe(false);
  });

  it("is case-sensitive by default and case-insensitive on request", () => {
    expect(m("/My-Org/*.png", "/my-org/x.png")).toBe(false);
    expect(m("/My-Org/*.png", "/my-org/x.png", true)).toBe(true);
    expect(m("/My-Org/*.png", "/MY-ORG/X.PNG", true)).toBe(true);
  });

  it("** matches one or more trailing segments, never zero", () => {
    expect(m("/sites/pub/**", "/sites/pub/a")).toBe(true);
    expect(m("/sites/pub/**", "/sites/pub/a/b/c.png")).toBe(true);
    expect(m("/sites/pub/**", "/sites/pub")).toBe(false);
    expect(m("/sites/pub/**", "/sites/pub/")).toBe(false);
    expect(m("/sites/pub/**", "/sites/other/a")).toBe(false);
  });

  it("** still enforces the segment character set", () => {
    expect(m("/sites/pub/**", "/sites/pub/a b")).toBe(false);
    expect(m("/sites/pub/**", "/sites/pub/a%2fb")).toBe(false);
    expect(m("/sites/pub/**", "/sites/pub/..")).toBe(false);
  });

  it("root pattern matches only /", () => {
    expect(m("/", "/")).toBe(true);
    expect(m("/", "/a")).toBe(false);
  });

  it("rejects empty segments, trailing slash, and over-long segments", () => {
    expect(m("/a/*", "/a//b")).toBe(false);
    expect(m("/a/*", "/a/")).toBe(false);
    expect(m("/a/*", `/a/${"x".repeat(256)}`)).toBe(false);
  });

  it("rejects non-absolute pathnames", () => {
    expect(m("/a/*", "a/b")).toBe(false);
  });
});

describe("compilePathPattern: invalid patterns", () => {
  const bad = [
    "no-slash",
    "/a//b",
    "/a/",
    "/a/../b",
    "/a/./b",
    "/a/**/b",
    "/a/b**",
    "/a/***.png",
    "/a/*.*.*.png",
    "/a/%41",
    "/a?x=1",
    "/a#frag",
    "/a;x",
    "/a\\b",
    "/a/b c",
    `/${"a".repeat(600)}`
  ];
  for (const pattern of bad) {
    it(`throws for ${JSON.stringify(pattern.slice(0, 30))}`, () => {
      expect(() => compilePathPattern(pattern, false)).toThrow(PolicyError);
    });
  }
});

describe("compilePathPattern: literals", () => {
  it("lists segments without wildcards", () => {
    expect(compilePathPattern("/my-org/assets/*.png", false).literals).toEqual(["my-org", "assets"]);
    expect(compilePathPattern("/sites/pub/**", false).literals).toEqual(["sites", "pub"]);
    expect(compilePathPattern("/a/b.png", false).literals).toEqual(["a", "b.png"]);
    expect(compilePathPattern("/", false).literals).toEqual([]);
  });
});
