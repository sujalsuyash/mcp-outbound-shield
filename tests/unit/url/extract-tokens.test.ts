import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../helpers/load-policies";
import { extractTokens } from "../../../src/url/extract-tokens";

const github = MATRIX.entries.get("github.com")!;
const api = MATRIX.entries.get("api.corp.internal")!;
const deep = EXTRA.entries.get("deep.example.org")!;

describe("extractTokens", () => {
  it("skips literal pattern segments and strips image extensions", () => {
    expect(extractTokens(new URL("https://github.com/my-org/assets/Logo.PNG"), github)).toEqual(["Logo"]);
  });
  it("compares literals case-insensitively", () => {
    expect(extractTokens(new URL("https://github.com/MY-ORG/ASSETS/x.png"), github)).toEqual(["x"]);
  });
  it("keeps non-image extensions", () => {
    expect(extractTokens(new URL("https://deep.example.org/d/file.bin"), deep)).toEqual(["file.bin"]);
  });
  it("returns query values, using empty for valueless parameters", () => {
    expect(extractTokens(new URL("https://api.corp.internal/chart/1?theme=dark&size=big"), api)).toEqual(["1", "dark", "big"]);
    expect(extractTokens(new URL("https://api.corp.internal/chart/1?theme&size=big"), api)).toEqual(["1", "big"]);
  });
  it("drops empty tokens", () => {
    expect(extractTokens(new URL("https://github.com/my-org/assets/.png"), github)).toEqual([]);
  });
  it("includes every segment under a ** pattern except the literals", () => {
    expect(extractTokens(new URL("https://deep.example.org/d/a/b/c.png"), deep)).toEqual(["a", "b", "c"]);
  });
});
