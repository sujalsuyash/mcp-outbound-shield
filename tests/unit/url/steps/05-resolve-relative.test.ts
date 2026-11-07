import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../../helpers/load-policies";
import { resolveRelative } from "../../../../src/url/steps/05-resolve-relative";

describe("step 5: resolve relative", () => {
  it("prefixes protocol-relative URLs with https:", () => {
    expect(resolveRelative("//a.com/x", MATRIX)).toEqual({ ok: true, value: { text: "https://a.com/x", relative: false } });
    expect(resolveRelative("///a.com/x", MATRIX)).toEqual({ ok: true, value: { text: "https:///a.com/x", relative: false } });
  });

  it.each(["https://a.com/x", "HTTPS://a.com", "http://a.com", "javascript:alert(1)", "data:text/html,x", "https:/a.com", "https:a.com", "a+b.c-d:x"])(
    "treats %s as absolute", (input) => {
      expect(resolveRelative(input, MATRIX)).toEqual({ ok: true, value: { text: input, relative: false } });
    });

  it("allows absolute-path relatives only with a __relative__ entry", () => {
    expect(resolveRelative("/icons/a.png", EXTRA)).toEqual({ ok: true, value: { text: "/icons/a.png", relative: true } });
    expect(resolveRelative("/icons/a.png", MATRIX)).toMatchObject({ ok: false, reason: "relative_not_allowed" });
  });

  it.each(["icons/a.png", "", "./a.png", "../a.png", "?x=1", "#frag", "a.com/x", "1http://x"])(
    "rejects %j even with a __relative__ entry", (input) => {
      expect(resolveRelative(input, EXTRA)).toMatchObject({ ok: false, reason: "relative_not_allowed" });
    });
});
