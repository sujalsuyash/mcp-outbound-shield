import { describe, expect, it } from "vitest";
import { defangUrl } from "../../../src/defang/defang-url";

describe("defangUrl", () => {
  it.each([
    ["https://evil.com/x?d=S", "hxxps://evil[.]com/x?d=S"],
    ["http://evil.com", "hxxp://evil[.]com"],
    ["HTTPS://EVIL.COM/A", "hxxps://EVIL[.]COM/A"],
    ["https://a.b.c.example.org:8443/p.q?r=s.t#u.v", "hxxps://a[.]b[.]c[.]example[.]org:8443/p.q?r=s.t#u.v"],
    ["www.attacker.com/x?d=SECRET", "www[.]attacker[.]com/x?d=SECRET"],
    ["evil.com", "evil[.]com"],
    ["https://user@evil.com/x", "hxxps://user@evil[.]com/x"],
    ["ftp://evil.com/x", "ftp[:]//evil[.]com/x"],
    ["javascript:alert(1)", "javascript[:]alert(1)"],
    ["data:text/html,hello", "data[:]text/html,hello"],
    ["  https://evil.com  ", "hxxps://evil[.]com"],
    ["//evil.com/x", "//evil[.]com/x"],
    ["https:///evil.com/x", "hxxps:///evil[.]com/x"],
    ["///evil.com", "///evil[.]com"]
  ])("%s -> %s", (input, expected) => {
    expect(defangUrl(input)).toBe(expected);
  });

  it("shows invisible and non-ASCII characters visibly", () => {
    expect(defangUrl("https://evil.com/a\u200bb")).toBe("hxxps://evil[.]com/a<U+200B>b");
    expect(defangUrl("https://g\u0131thub.com")).toBe("hxxps://g<U+0131>thub[.]com");
    expect(defangUrl("a b")).toBe("a<U+0020>b");
  });
  it("never leaves a fetchable or auto-linkable scheme or host", () => {
    for (const url of ["https://evil.com", "http://evil.com", "//evil.com", "www.evil.com", "ftp://evil.com"]) {
      const out = defangUrl(url);
      expect(out, url).not.toMatch(/https?:\/\//i);
      expect(out, url).not.toMatch(/\.com/);
    }
  });
  it("handles the empty string", () => {
    expect(defangUrl("")).toBe("");
  });
});
