import { describe, expect, it } from "vitest";
import { makeAuditEvent, MAX_AUDIT_TEXT } from "../../../src/audit/make-audit-event";

describe("makeAuditEvent", () => {
  it("keeps only the fields that are set", () => {
    expect(makeAuditEvent({ category: "url_violation", action: "stripped" })).toEqual({
      category: "url_violation", action: "stripped"
    });
    expect("detail" in makeAuditEvent({ category: "url_violation", action: "stripped" })).toBe(false);
  });
  it("copies every field", () => {
    expect(makeAuditEvent({
      category: "url_violation", action: "defanged", vector: "markdown_image", reason: "host_not_allowed",
      detail: "d", subject: "https://evil.com/x"
    })).toEqual({
      category: "url_violation", action: "defanged", vector: "markdown_image", reason: "host_not_allowed",
      detail: "d", subject: "https://evil.com/x"
    });
  });
  it("replaces control characters so a subject cannot forge log lines", () => {
    const e = makeAuditEvent({ category: "url_violation", action: "stripped", subject: "a\nb\r\u0000c\u2028d\u009fe" });
    expect(e.subject).toBe("a?b??c?d?e");
  });
  it("truncates long text exactly at the limit", () => {
    const at = makeAuditEvent({ category: "url_violation", action: "stripped", subject: "x".repeat(MAX_AUDIT_TEXT) });
    expect(at.subject).toBe("x".repeat(MAX_AUDIT_TEXT));
    const over = makeAuditEvent({ category: "url_violation", action: "stripped", detail: "x".repeat(MAX_AUDIT_TEXT + 1) });
    expect(over.detail).toBe(`${"x".repeat(MAX_AUDIT_TEXT)}…`);
  });
  it("is fast on huge input", () => {
    const started = Date.now();
    makeAuditEvent({ category: "url_violation", action: "stripped", subject: "x".repeat(5_000_000) });
    expect(Date.now() - started).toBeLessThan(200);
  });
});
