import { describe, expect, it } from "vitest";
import { emitCanonical } from "../../../src/url/emit-canonical";

describe("emitCanonical", () => {
  it("emits the full href for absolute URLs", () => {
    const url = new URL("https://a.com/x.png?y=1#f");
    expect(emitCanonical({ url, relative: false }, url)).toBe("https://a.com/x.png?y=1#f");
  });
  it("emits path, query and fragment only for relative URLs", () => {
    const url = new URL("/icons/a.png?y=1#f", "https://__relative__.invalid/");
    expect(emitCanonical({ url, relative: true }, url)).toBe("/icons/a.png?y=1#f");
  });
  it("uses the URL it is given, not the parsed one (after fragment stripping)", () => {
    const parsedUrl = new URL("https://a.com/x#f");
    const stripped = new URL("https://a.com/x");
    expect(emitCanonical({ url: parsedUrl, relative: false }, stripped)).toBe("https://a.com/x");
  });
});
