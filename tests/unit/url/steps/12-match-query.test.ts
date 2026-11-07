import { describe, expect, it } from "vitest";
import { MATRIX, parsed } from "../../../helpers/load-policies";
import { matchQuery } from "../../../../src/url/steps/12-match-query";

const api = MATRIX.entries.get("api.corp.internal")!.entry; // theme,size; value max 10
const github = MATRIX.entries.get("github.com")!.entry; // no query
const base = "https://api.corp.internal/chart/1";
const q = (query: string, entry = api) => matchQuery(parsed(`${base}${query}`), entry);

describe("step 12: query", () => {
  it("passes URLs with no query on any entry", () => {
    expect(matchQuery(parsed("https://github.com/x.png"), github)).toMatchObject({ ok: true });
    expect(q("")).toMatchObject({ ok: true });
  });
  it("rejects any query, even empty, when queries are not allowed", () => {
    for (const s of ["?a=1", "?", "?a"]) {
      expect(matchQuery(parsed(`https://github.com/x.png${s}`), github), s).toMatchObject({ ok: false, reason: "query_not_allowed" });
    }
  });
  it("ignores a ? that only appears in the fragment", () => {
    expect(matchQuery(parsed("https://github.com/x.png#a?b"), github)).toMatchObject({ ok: true });
  });
  it("passes listed parameters in any order, and valueless or empty values", () => {
    for (const s of ["?theme=dark&size=big", "?size=big&theme=dark", "?theme=", "?theme"]) {
      expect(q(s), s).toMatchObject({ ok: true });
    }
  });
  it.each([
    ["?x=1", "query_param_not_allowed"], ["?Theme=a", "query_param_not_allowed"], ["?=a", "query_param_not_allowed"],
    ["?theme=a&s1=SE", "query_param_not_allowed"], ["?theme=a&theme=b", "query_param_duplicate"],
    ["?theme=a&", "query_value_invalid"], ["?&theme=a", "query_value_invalid"], ["?", "query_value_invalid"],
    ["?theme=a&&size=b", "query_value_invalid"], ["?theme=a:b", "query_value_invalid"],
    ["?theme=a/b", "query_value_invalid"], ["?theme=a+b", "query_value_invalid"], ["?theme=a;size=b", "query_value_invalid"],
    ["?theme=%41", "query_value_invalid"], ["?theme=a=b", "query_value_invalid"]
  ])("%s -> %s", (query, reason) => {
    expect(q(query)).toMatchObject({ ok: false, reason });
  });
  it("enforces the value length limit exactly (10)", () => {
    expect(q(`?theme=${"a".repeat(10)}`)).toMatchObject({ ok: true });
    expect(q(`?theme=${"a".repeat(11)}`)).toMatchObject({ ok: false, reason: "query_value_invalid" });
  });
});
