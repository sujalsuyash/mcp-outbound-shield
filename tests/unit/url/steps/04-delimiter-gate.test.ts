import { describe, expect, it } from "vitest";
import { delimiterGate } from "../../../../src/url/steps/04-delimiter-gate";

describe("step 4: delimiter gate", () => {
  it.each([
    "https://a.com\\b", "https:\\\\a.com/x", "https://a.com/x?y=%25", "https://a.com/%2525",
    "https://a.com/a%2fb", "https://a.com/%2e%2e/x", "https://g%69thub.com/x", "https://a.com/a;b",
    "https://a.com/a;b?c=d", "https://a.com/%41#frag", "https://a.com/x;y#z"
  ])("rejects %s", (input) => {
    expect(delimiterGate(input)).toMatchObject({ ok: false, reason: "illegal_delimiter" });
  });

  it.each(["https://a.com/x?y=%41", "https://a.com/x?y=a;b", "https://a.com/x#a%41", "https://a.com/x#a;b", "https://a.com/x?a%41#b"])(
    "leaves %s for later steps (percent or semicolon only after ? or #)", (input) => {
      expect(delimiterGate(input)).toEqual({ ok: true, value: input });
    });

  it("rejects %25 in any case and anywhere", () => {
    expect(delimiterGate("https://a.com/x?y=%25")).toMatchObject({ ok: false });
    expect(delimiterGate("https://a.com/x#%25")).toMatchObject({ ok: false });
  });

  it("passes ordinary URLs", () => {
    expect(delimiterGate("https://a.com/a/b.png?x=1&y=2#f")).toEqual({
      ok: true, value: "https://a.com/a/b.png?x=1&y=2#f"
    });
  });
});
