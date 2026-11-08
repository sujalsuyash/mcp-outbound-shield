import { describe, expect, it } from "vitest";
import { applyLinkMode, WARNING_MARKER, type LinkInput, type LinkPart } from "../../../src/links/apply-link-mode";

const trusted = { kind: "trusted", canonical: "https://github.com/a.png" } as const;
const untrusted = { kind: "untrusted_web", canonical: "https://evil.com/x?d=S" } as const;
const unusable = { kind: "unusable" } as const;

const run = (over: Partial<LinkInput> & Pick<LinkInput, "mode" | "classification">): LinkPart[] =>
  applyLinkMode({ text: "click", autolink: false, ...over });

describe("applyLinkMode: trusted links are kept in every mode", () => {
  for (const mode of ["allow", "warn", "defang_untrusted", "strip_untrusted"] as const) {
    it(mode, () => {
      expect(run({ mode, classification: trusted })).toEqual([{ kind: "link", url: trusted.canonical, text: "click" }]);
    });
  }
});

describe("applyLinkMode: untrusted web links", () => {
  const link = { kind: "link", url: untrusted.canonical, text: "click" } as const;

  it("allow keeps the link", () => {
    expect(run({ mode: "allow", classification: untrusted })).toEqual([link]);
  });
  it("warn keeps the link and adds a visible marker", () => {
    expect(run({ mode: "warn", classification: untrusted })).toEqual([link, { kind: "text", value: WARNING_MARKER }]);
    expect(WARNING_MARKER).toContain("⚠️");
  });
  it("defang_untrusted shows text plus the defanged URL (T-27)", () => {
    expect(run({ mode: "defang_untrusted", classification: untrusted })).toEqual([
      { kind: "text", value: "click" }, { kind: "text", value: " (" },
      { kind: "code", value: "hxxps://evil[.]com/x?d=S" }, { kind: "text", value: ")" }
    ]);
  });
  it("defang_untrusted with empty link text shows only the defanged URL", () => {
    expect(run({ mode: "defang_untrusted", classification: untrusted, text: " " })).toEqual([
      { kind: "code", value: "hxxps://evil[.]com/x?d=S" }
    ]);
  });
  it("strip_untrusted keeps only the text", () => {
    expect(run({ mode: "strip_untrusted", classification: untrusted })).toEqual([{ kind: "text", value: "click" }]);
  });
  it("defangs URL-looking link text in every text-only outcome, so it cannot be auto-linked again", () => {
    const text = "https://evil.com/x";
    expect(run({ mode: "strip_untrusted", classification: untrusted, text })).toEqual([{ kind: "text", value: "hxxps://evil[.]com/x" }]);
    expect(run({ mode: "defang_untrusted", classification: untrusted, text })[0]).toEqual({ kind: "text", value: "hxxps://evil[.]com/x" });
  });
});

describe("applyLinkMode: autolinks (the text is the URL)", () => {
  const auto = { autolink: true, text: "www.attacker.com/x?d=SECRET" } as const;
  const classification = { kind: "untrusted_web", canonical: "http://www.attacker.com/x?d=SECRET" } as const;

  it("defang_untrusted replaces the literal with a defanged code span (T-26)", () => {
    expect(run({ mode: "defang_untrusted", classification, ...auto })).toEqual([
      { kind: "code", value: "www[.]attacker[.]com/x?d=SECRET" }
    ]);
  });
  it("strip_untrusted removes it entirely (keeping the text would re-create the autolink)", () => {
    expect(run({ mode: "strip_untrusted", classification, ...auto })).toEqual([]);
  });
  it("allow and warn keep it", () => {
    expect(run({ mode: "allow", classification, ...auto })).toHaveLength(1);
    expect(run({ mode: "warn", classification, ...auto })).toHaveLength(2);
  });
});

describe("applyLinkMode: unusable links become defanged text in every mode (T-28)", () => {
  for (const mode of ["allow", "warn", "defang_untrusted", "strip_untrusted"] as const) {
    it(mode, () => {
      expect(run({ mode, classification: unusable, text: "x" })).toEqual([{ kind: "text", value: "x" }]);
      expect(run({ mode, classification: unusable, text: "see https://evil.com", autolink: false })).toEqual([
        { kind: "text", value: "see hxxps://evil[.]com" }
      ]);
    });
  }
  it("an unusable autolink is shown as defanged text, not dropped silently or linked", () => {
    expect(run({ mode: "strip_untrusted", classification: unusable, autolink: true, text: "javascript:alert(1)" })).toEqual([
      { kind: "text", value: "javascript:alert(1)" }
    ]);
  });
});

describe("applyLinkMode: no output ever carries a live untrusted URL", () => {
  it("only link parts can carry a URL, and only for allow, warn, or trusted links", () => {
    for (const mode of ["defang_untrusted", "strip_untrusted"] as const) {
      for (const cls of [untrusted, unusable] as const) {
        const parts = run({ mode, classification: cls });
        expect(parts.some((p) => p.kind === "link"), `${mode}/${cls.kind}`).toBe(false);
      }
    }
  });
});
