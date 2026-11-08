import { describe, expect, it } from "vitest";
import { ConsoleSink } from "../../../src/audit/console-sink";

describe("ConsoleSink", () => {
  it("writes one JSON line tagged with the source", () => {
    const lines: string[] = [];
    new ConsoleSink((l) => lines.push(l)).record({ category: "url_violation", action: "stripped", reason: "host_not_allowed" });
    expect(lines.length).toBe(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      source: "mcp-outbound-shield", category: "url_violation", action: "stripped", reason: "host_not_allowed"
    });
  });
  it("cannot be tricked into writing a second line by a newline in the subject", () => {
    const lines: string[] = [];
    new ConsoleSink((l) => lines.push(l)).record({ category: "url_violation", action: "stripped", subject: "a\n{\"fake\":1}" });
    expect(lines[0]).not.toContain("\n");
    expect(JSON.parse(lines[0] as string).subject).toBe("a\n{\"fake\":1}");
  });
});
