import { sanitize } from '../../src/pipeline/sanitize';

// A custom policy specifically for shadow mode
const shadowPolicy = {
  version: 1,
  renderer_profile: { unfurls_links: true },
  // CRITICAL: Set to log only, do not strip or drop
  on_violation: "log_only", 
  on_error: "log_only",
  allowlist: {
    "github.com": { allowed_paths: ["/my-org/*"], allow_query: true }
  }
};

const legitimateEnterpriseOutput = `
I have reviewed the architecture. You can find the main documentation here:
[System Architecture](https://github.com/my-org/docs/blob/main/arch.md)

Here is the Mermaid flow you requested:
\`\`\`mermaid
graph TD;
    A-->B;
\`\`\`

The server logs show a timeout on \`api.internal.corp\`.
`;

const result = sanitize(legitimateEnterpriseOutput, shadowPolicy);

// The output should be 100% identical to the input.
console.assert(
  result === legitimateEnterpriseOutput, 
  "Shadow mode altered legitimate text!"
);
console.log("Shadow Mode Test Passed: Benign data remained intact.");