import { describe, expect, it } from "vitest";
import { charGate } from "../../../../src/url/steps/03-char-gate";

describe("step 3: character gate", () => {
  it("passes every printable ASCII character", () => {
    const all = Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) => String.fromCharCode(0x21 + i)).join("");
    expect(charGate(all)).toEqual({ ok: true, value: all });
  });

  const bad: Array<[string, string]> = [
    ["space", " "], ["NUL", "\u0000"], ["control", "\u0001"], ["TAB", "\t"], ["DEL", "\u007f"],
    ["C1 control", "\u0085"], ["no-break space", "\u00a0"], ["zero-width space", "\u200b"],
    ["soft hyphen", "\u00ad"], ["bidi override", "\u202e"], ["BOM", "\ufeff"], ["tag character", "\u{e0041}"],
    ["variation selector", "\ufe0f"], ["latin dotless i", "\u0131"], ["emoji", "\u{1f600}"], ["lone surrogate", "\ud800"]
  ];
  for (const [name, ch] of bad) {
    it(`rejects ${name}`, () => {
      expect(charGate(`https://a.com/${ch}x`)).toMatchObject({ ok: false, reason: "illegal_char" });
    });
  }

  it("reports the code point", () => {
    expect(charGate("a\u200bb")).toMatchObject({ detail: "U+200B" });
  });
  it("passes the empty string (later steps decide)", () => {
    expect(charGate("")).toEqual({ ok: true, value: "" });
  });
});
