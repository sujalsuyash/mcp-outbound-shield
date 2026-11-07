import { describe, expect, it } from "vitest";
import { parsed } from "../../../helpers/load-policies";
import { checkAuthority } from "../../../../src/url/steps/08-check-authority";

describe("step 8: authority", () => {
  it("passes ordinary hosts", () => {
    expect(checkAuthority(parsed("https://github.com/x"))).toMatchObject({ ok: true });
    expect(checkAuthority(parsed("https://a.b.c.example.org:8443/x"))).toMatchObject({ ok: true });
  });
  it.each(["https://u@a.com/", "https://u:p@a.com/", "https://:p@a.com/", "https://github.com@evil.com/"])(
    "rejects credentials in %s", (url) => {
      expect(checkAuthority(parsed(url))).toMatchObject({ ok: false, reason: "credentials_present" });
    });
  it.each(["https://127.0.0.1/", "https://2130706433/", "https://0x7f.1/", "https://0177.0.0.1/", "https://[::1]/", "https://[2001:db8::1]/", "https://[::ffff:127.0.0.1]/"])(
    "rejects IP host %s", (url) => {
      expect(checkAuthority(parsed(url))).toMatchObject({ ok: false, reason: "ip_host" });
    });
  it("rejects a trailing-dot host", () => {
    expect(checkAuthority(parsed("https://github.com./"))).toMatchObject({ ok: false, reason: "trailing_dot_host" });
  });
  it("does not mistake hostnames that merely contain digits for IPs", () => {
    expect(checkAuthority(parsed("https://1password.com/"))).toMatchObject({ ok: true });
    expect(checkAuthority(parsed("https://a1.b2.c3.d4.example.com/"))).toMatchObject({ ok: true });
  });
});
