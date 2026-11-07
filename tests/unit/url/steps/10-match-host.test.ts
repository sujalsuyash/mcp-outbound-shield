import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX, parsed } from "../../../helpers/load-policies";
import { matchHost } from "../../../../src/url/steps/10-match-host";

const host = (url: string, loaded = MATRIX) => matchHost(parsed(url), loaded);
const rel = (url: string, loaded = MATRIX) => matchHost(parsed(url, true), loaded);

describe("step 10: host", () => {
  it("returns the entry for an exact host", () => {
    const r = host("https://github.com/x");
    expect(r.ok && r.value.host).toBe("github.com");
  });
  it("matches the host:port key for an explicit port", () => {
    const r = host("http://localhost:8080/x", EXTRA);
    expect(r.ok && r.value.host).toBe("localhost:8080");
  });
  it("does not match host:port keys without the port", () => {
    expect(host("http://localhost/x", EXTRA)).toMatchObject({ ok: false, reason: "host_not_allowed" });
  });

  it("allows a listed subdomain and returns the parent entry", () => {
    const r = host("https://cdn.static.internal/x");
    expect(r.ok && r.value.host).toBe("static.internal");
  });
  it("rejects unlisted labels with subdomain_not_allowed", () => {
    for (const h of ["u0vdukvuxorbvee.static.internal", "mfrggzdfmz.static.internal", "a.cdn.static.internal"]) {
      expect(host(`https://${h}/x`), h).toMatchObject({ ok: false, reason: "subdomain_not_allowed" });
    }
  });
  it("rejects subdomains of hosts that have no subdomain rules with host_not_allowed", () => {
    expect(host("https://x.github.com/x")).toMatchObject({ ok: false, reason: "host_not_allowed" });
    expect(host("https://x.api.corp.internal/x")).toMatchObject({ ok: false, reason: "host_not_allowed" });
  });
  it("rejects lookalikes and suffix tricks", () => {
    for (const h of ["evilgithub.com", "github.com.evil.com", "notstatic.internal", "github.co", "githubxcom", "attacker.com"]) {
      expect(host(`https://${h}/x`), h).toMatchObject({ ok: false, reason: "host_not_allowed" });
    }
  });

  it("applies open-wildcard rules", () => {
    expect(host("https://x.wild.example.net/x", EXTRA)).toMatchObject({ ok: true });
    expect(host("https://wild.example.net/x", EXTRA)).toMatchObject({ ok: true });
    expect(host("https://a.b.wild.example.net/x", EXTRA)).toMatchObject({ ok: false, reason: "subdomain_not_allowed" });
  });

  it("returns the __relative__ entry for relative URLs, and rejects when there is none", () => {
    const r = rel("https://__relative__.invalid/icons/a.png", EXTRA);
    expect(r.ok && r.value.host).toBe("__relative__");
    expect(rel("https://__relative__.invalid/icons/a.png", MATRIX)).toMatchObject({ ok: false, reason: "relative_not_allowed" });
  });
  it("never treats the placeholder host as a real host", () => {
    expect(host("https://__relative__.invalid/icons/a.png", EXTRA)).toMatchObject({ ok: false, reason: "host_not_allowed" });
  });
});
