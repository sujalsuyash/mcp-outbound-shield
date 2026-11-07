import { describe, expect, it } from "vitest";
import { parseWhatwg } from "../../../../src/url/steps/06-parse-whatwg";

describe("step 6: WHATWG parse", () => {
  it("parses absolute URLs and lowercases scheme and host", () => {
    const r = parseWhatwg({ text: "HTTPS://GITHUB.COM/x", relative: false });
    expect(r.ok && r.value.url.href).toBe("https://github.com/x");
    expect(r.ok && r.value.relative).toBe(false);
  });
  it("accepts the lenient forms browsers accept", () => {
    for (const text of ["https:/github.com/x", "https:github.com/x", "https:///github.com/x"]) {
      const r = parseWhatwg({ text, relative: false });
      expect(r.ok && r.value.url.hostname).toBe("github.com");
    }
  });
  it("resolves relatives against the placeholder base and resolves dot-segments", () => {
    const r = parseWhatwg({ text: "/icons/../secret/a.png", relative: true });
    expect(r.ok && r.value.url.pathname).toBe("/secret/a.png");
    expect(r.ok && r.value.relative).toBe(true);
  });
  it.each(["https://", "https://[::1", "https://a b.com", "https://1.2.3.4.5/", "https://a.com:99999/"])(
    "fails closed on %s", (text) => {
      expect(parseWhatwg({ text, relative: false })).toMatchObject({ ok: false, reason: "parse_failed" });
    });
  it("normalizes numeric hosts to dotted-quad so step 8 can see them", () => {
    const r = parseWhatwg({ text: "https://2130706433/x", relative: false });
    expect(r.ok && r.value.url.hostname).toBe("127.0.0.1");
  });
  it("refuses a relative URL that resolves to a different host (defense in depth)", () => {
    // Unreachable through evaluateUrl (step 5 never passes // as relative), but the guard must hold on its own.
    expect(parseWhatwg({ text: "//evil.com/x", relative: true })).toMatchObject({ ok: false, reason: "parse_failed" });
  });
});
