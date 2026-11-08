import { describe, expect, it } from "vitest";
import { defangText } from "../../../src/defang/defang-text";

describe("defangText", () => {
  it("defangs URLs inside prose and leaves the rest alone", () => {
    expect(defangText("see https://evil.com/x?d=1 now")).toBe("see hxxps://evil[.]com/x?d=1 now");
    expect(defangText("go to www.evil.com or ftp://a.b/c")).toBe("go to www[.]evil[.]com or ftp[:]//a[.]b/c");
  });
  it("leaves plain text, version numbers and sentences alone", () => {
    for (const t of ["hello world.", "v1.2.3", "e.g. this", "a.b", "", "click here"]) expect(defangText(t), t).toBe(t);
  });
  it("defangs every URL when there are several", () => {
    expect(defangText("http://a.com http://b.com")).toBe("hxxp://a[.]com hxxp://b[.]com");
  });
  it("is linear-time on adversarial input", () => {
    const started = Date.now();
    defangText("a.".repeat(200_000));
    defangText(`${"a".repeat(200_000)}:`);
    defangText("www.".repeat(50_000));
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
