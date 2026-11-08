import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { toInertHtml, toInertMarkdown } from "../../../src/defang/inert-text";
import { nodeTypes } from "../../helpers/mdast";

describe("toInertMarkdown", () => {
  it("wraps each non-blank line in its own code span and defangs URLs", () => {
    expect(toInertMarkdown("hello")).toBe("`hello`");
    expect(toInertMarkdown("a\n\nb")).toBe("`a`\n\n`b`");
    expect(toInertMarkdown("see https://evil.com")).toBe("`see hxxps://evil[.]com`");
    expect(toInertMarkdown("   \n")).toBe("\n");
  });
  it("uses a delimiter longer than any backtick run, padded at the edges", () => {
    expect(toInertMarkdown("a`b")).toBe("``a`b``");
    expect(toInertMarkdown("`a")).toBe("`` `a ``");
    expect(toInertMarkdown("```")).toBe("```` ``` ````");
  });
  it("normalizes line endings", () => {
    expect(toInertMarkdown("a\r\nb\rc")).toBe("`a`\n`b`\n`c`");
  });

  const dangerous = [
    "![a](https://evil.com/x)", "[x](https://evil.com)", "<img src=x onerror=1>", "<https://evil.com>",
    "[1]: https://evil.com/x", "![a][1]", "```", "~~~", "`", "``", "\n", "\n\n", "# heading", "- item",
    "1. item", "> quote", "| a | b |", "|---|---|", "---", "===", "https://evil.com/x", "www.evil.com",
    "&amp;", "\\", " ", "    code", "[^1]: note", "<!-- c -->", "$$x$$", "\t"
  ];
  it("renders as literal text for every dangerous construct (parsed with remark + GFM)", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...dangerous), { minLength: 1, maxLength: 12 }).map((p) => p.join("")), (text) => {
        const types = [...nodeTypes(toInertMarkdown(text))];
        const unexpected = types.filter((t) => !["root", "paragraph", "inlineCode", "text"].includes(t));
        expect(unexpected, JSON.stringify(text)).toEqual([]);
      }),
      { numRuns: 4000 }
    );
  });
  it("round-trips the visible content of simple lines", () => {
    expect([...nodeTypes(toInertMarkdown("plain words"))]).toContain("inlineCode");
  });
});

describe("toInertHtml", () => {
  it("escapes markup characters and defangs URLs", () => {
    expect(toInertHtml(`<img src="x" onerror='1'>&`)).toBe("&lt;img src=&quot;x&quot; onerror=&#39;1&#39;&gt;&amp;");
    expect(toInertHtml("https://evil.com")).toBe("hxxps://evil[.]com");
  });
  it("leaves no markup characters behind", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (text) => {
        expect(toInertHtml(text)).not.toMatch(/[<>"']/);
      }),
      { numRuns: 1000 }
    );
  });
});
