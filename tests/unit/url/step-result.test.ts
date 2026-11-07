import { describe, expect, it } from "vitest";
import { pass, reject, toVerdict } from "../../../src/url/step-result";

describe("step results", () => {
  it("pass wraps a value", () => {
    expect(pass(5)).toEqual({ ok: true, value: 5 });
  });
  it("reject carries a reason, and a detail only when given", () => {
    expect(reject("ip_host")).toEqual({ ok: false, reason: "ip_host" });
    expect(reject("ip_host", "127.0.0.1")).toEqual({ ok: false, reason: "ip_host", detail: "127.0.0.1" });
    expect("detail" in reject("ip_host")).toBe(false);
  });
  it("toVerdict converts a rejection to a public verdict", () => {
    expect(toVerdict(reject("hex_run"))).toEqual({ allow: false, reason: "hex_run" });
    expect(toVerdict(reject("hex_run", "x"))).toEqual({ allow: false, reason: "hex_run", detail: "x" });
  });
});
