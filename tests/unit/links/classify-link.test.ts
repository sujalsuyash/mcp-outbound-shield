import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../helpers/load-policies";
import { classifyLink } from "../../../src/links/classify-link";

const GH = "https://github.com/my-org/assets";

describe("classifyLink", () => {
  it("trusts allowlisted URLs and returns the canonical form (fragment kept for links)", () => {
    expect(classifyLink(`${GH}/logo.png#top`, "markdown_link", MATRIX)).toEqual({ kind: "trusted", canonical: `${GH}/logo.png#top` });
    expect(classifyLink(`HTTPS://GITHUB.COM/my-org/assets/a.png`, "html_a_href", MATRIX)).toEqual({ kind: "trusted", canonical: `${GH}/a.png` });
  });
  it("trusts an allowed relative link when a __relative__ rule exists", () => {
    expect(classifyLink("/icons/a.png", "markdown_link", EXTRA)).toEqual({ kind: "trusted", canonical: "/icons/a.png" });
  });
  it("treats clean web URLs that are not allowlisted as untrusted_web (T-27)", () => {
    expect(classifyLink("https://evil.com/x?d=S", "markdown_link", MATRIX)).toEqual({ kind: "untrusted_web", canonical: "https://evil.com/x?d=S" });
  });
  it("treats an http URL as untrusted_web even though the evaluator rejects the scheme (T-26)", () => {
    expect(classifyLink("http://www.attacker.com/x?d=SECRET", "markdown_autolink", MATRIX)).toEqual({
      kind: "untrusted_web", canonical: "http://www.attacker.com/x?d=SECRET"
    });
  });
  it("treats an allowlist miss on an allowed host (query not allowed) as untrusted_web", () => {
    expect(classifyLink(`${GH}/logo.png?x=1`, "markdown_link", MATRIX)).toMatchObject({ kind: "untrusted_web" });
  });
  it.each([
    "javascript:alert(1)", "data:text/html,x", "https://github.com@evil.com/", "https://127.0.0.1/", "/relative", "", "https://", "https://x.com/&amp;"
  ])("marks %j as unusable (T-28 for javascript:)", (url) => {
    expect(classifyLink(url, "html_a_href", MATRIX)).toEqual({ kind: "unusable" });
  });
});
