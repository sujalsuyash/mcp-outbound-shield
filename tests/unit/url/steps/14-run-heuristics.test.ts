import { describe, expect, it } from "vitest";
import { EXTRA, MATRIX } from "../../../helpers/load-policies";
import { runHeuristics } from "../../../../src/url/steps/14-run-heuristics";

const H = MATRIX.policy.default_heuristics;
const github = MATRIX.entries.get("github.com")!;
const long = EXTRA.entries.get("long.example.org")!; // max_uri_length 60
const blobs = EXTRA.entries.get("blobs.example.org")!; // allow_uuid_or_sha_paths
const run = (url: string, entry = github) => runHeuristics(new URL(url), entry, H);
const GH = "https://github.com/my-org/assets";

describe("step 14: heuristics", () => {
  it("passes ordinary URLs, including literal pattern segments", () => {
    expect(run(`${GH}/logo.png`)).toMatchObject({ ok: true });
    expect(run(`${GH}/architecture-overview-diagram.png`)).toMatchObject({ ok: true });
  });

  it("enforces the entry's max_uri_length exactly (60)", () => {
    const prefix = "https://long.example.org/l/";
    const at = (n: number) => `${prefix}${"g".repeat(n - prefix.length)}`;
    expect(run(at(60), long)).toMatchObject({ ok: true });
    expect(run(at(61), long)).toMatchObject({ ok: false, reason: "uri_too_long" });
  });
  it("falls back to the default length when the entry has none", () => {
    const url = `https://api.corp.internal/chart/${"g".repeat(300)}`;
    expect(runHeuristics(new URL(url), MATRIX.entries.get("api.corp.internal")!, H)).toMatchObject({ reason: "uri_too_long" });
  });

  it("flags Base64, hex runs and high entropy in path tokens, and strips the image extension first", () => {
    expect(run(`${GH}/U0VDUkVUX0RBVEE.png`)).toMatchObject({ reason: "base64_signature" });
    expect(run(`${GH}/${"a".repeat(32)}.png`)).toMatchObject({ reason: "hex_run" });
    expect(run(`${GH}/qwertyuiopasdfghjklzxcvbnm.png`)).toMatchObject({ reason: "high_entropy" });
  });
  it("inspects query values too", () => {
    const api = MATRIX.entries.get("api.corp.internal")!;
    expect(runHeuristics(new URL("https://api.corp.internal/chart/1?theme=AbCdEfGh1jKlMn"), api, H)).toMatchObject({ reason: "base64_signature" });
  });
  it("allows long hex when allow_uuid_or_sha_paths is set, but not Base64", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    expect(run(`https://blobs.example.org/blob/${sha}`, blobs)).toMatchObject({ ok: true });
    expect(run("https://blobs.example.org/blob/U0VDUkVUX0RBVEE", blobs)).toMatchObject({ reason: "base64_signature" });
  });
  it("applies the checks in order: length, Base64, hex, entropy", () => {
    expect(run(`https://long.example.org/l/${"U0VDUkVUX0RBVEE".repeat(3)}`, long)).toMatchObject({ reason: "uri_too_long" });
  });
});
