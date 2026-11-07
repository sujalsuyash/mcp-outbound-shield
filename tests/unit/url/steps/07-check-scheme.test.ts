import { describe, expect, it } from "vitest";
import { parsed } from "../../../helpers/load-policies";
import { checkScheme } from "../../../../src/url/steps/07-check-scheme";

describe("step 7: scheme", () => {
  it("allows https", () => {
    expect(checkScheme(parsed("https://a.com/"), false)).toEqual({ ok: true, value: undefined });
  });
  it("allows http only when enabled", () => {
    expect(checkScheme(parsed("http://a.com/"), false)).toMatchObject({ ok: false, reason: "scheme_not_allowed" });
    expect(checkScheme(parsed("http://a.com/"), true)).toMatchObject({ ok: true });
  });
  it.each(["javascript:alert(1)", "data:text/html,x", "blob:https://a.com/u", "file:///etc/passwd", "ws://a.com/", "wss://a.com/", "ftp://a.com/", "vbscript:x", "about:blank"])(
    "rejects %s even when http is enabled", (url) => {
      expect(checkScheme(parsed(url), true)).toMatchObject({ ok: false, reason: "scheme_not_allowed" });
    });
});
