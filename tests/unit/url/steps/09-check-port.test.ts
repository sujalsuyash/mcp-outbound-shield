import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX, parsed } from "../../../helpers/load-policies";
import { checkPort } from "../../../../src/url/steps/09-check-port";

describe("step 9: port", () => {
  it("passes when no port is present or the default is elided", () => {
    expect(checkPort(parsed("https://github.com/x"), MATRIX)).toMatchObject({ ok: true });
    expect(checkPort(parsed("https://github.com:443/x"), MATRIX)).toMatchObject({ ok: true });
  });
  it("rejects a non-default port that is not an allowlist key", () => {
    expect(checkPort(parsed("https://github.com:8080/x"), MATRIX)).toMatchObject({ ok: false, reason: "port_not_allowed" });
    expect(checkPort(parsed("http://localhost:9090/x"), EXTRA)).toMatchObject({ ok: false, reason: "port_not_allowed" });
  });
  it("passes when host:port is an allowlist key", () => {
    expect(checkPort(parsed("http://localhost:8080/x"), EXTRA)).toMatchObject({ ok: true });
  });
  it("does not let one host borrow another host's port", () => {
    expect(checkPort(parsed("https://github.com:8080/x"), EXTRA)).toMatchObject({ ok: false });
  });
});
