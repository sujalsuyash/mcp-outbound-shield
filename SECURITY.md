# Security policy

`mcp-outbound-shield` is a security tool, so reports about it are taken seriously.

> **Status: pre-alpha.** There are no supported releases yet and the project must not be relied on in production. Reports are still welcome, and early findings are the most valuable.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report privately using either:

1. GitHub's **"Report a vulnerability"** button under the repository's **Security** tab (private vulnerability reporting)

Please include:

- What you found and why it matters
- A minimal input (Markdown/HTML/URL) and the `policy.json` that reproduces it
- What the shield emitted, and what a renderer or browser did with it
- The renderer or browser and version you tested, if relevant
- Whether you would like to be credited

## What counts as a vulnerability

In scope:

- **Policy bypass:** output in which a URL that the policy should reject reaches an auto-fetching position (image, resource hint, stylesheet, frame, and similar), including after rendering by a browser.
- **Parser differential:** input the shield reads one way and a browser or reference renderer reads another, so that something fetches that the shield did not evaluate.
- **Fail-open behavior:** any input or condition where an error, timeout, size limit, or malformed policy lets unverified content through instead of failing closed.
- **Canonicalization errors:** emitted URLs that differ from what was evaluated.
- **Streaming inconsistency:** streamed output that differs from buffered output in a way that exposes unsanitized content.
- **Denial of service** from small inputs (catastrophic regex backtracking, unbounded memory or CPU) that bypasses the configured limits.
- **Policy loader flaws** that accept an unsafe policy it should refuse.

Out of scope (see "Not covered" in the README):

- Data leaving through outbound tool calls or APIs invoked by the model
- Sensitive data printed as plain text, or social engineering of the user
- Ordinary links that require a deliberate click, when your renderer does not unfurl them
- Attacks that depend on an allowlisted host being attacker-controlled (expired domains, open redirects, shared hosting). These are configuration risks documented in the README, but a way to make the shield *accept* a host that is not on the allowlist is in scope.
- Rendering behavior of clients the project has not claimed to support
- Known, documented limitations (the `L-xx` rows in `tests/fixtures/url-matrix.ts`), unless you can show they are worse than documented

## What to expect

This is a volunteer-run project, so these are goals, not guarantees:

- Acknowledgement of your report within about 7 days
- An assessment and a fix or mitigation plan as soon as practical
- Coordinated disclosure: please allow up to 90 days before publishing details, shorter if a fix ships sooner. We will agree a date with you.
- Credit in the release notes and advisory, if you want it

Every confirmed bypass is added to the test matrix as a permanent regression row before the fix is released.

## Good-faith research

Testing against your own installation of this project, and against browsers or renderers you control, is welcome. Please do not test against systems you do not own or have permission to test, and do not access or exfiltrate data that is not yours.
