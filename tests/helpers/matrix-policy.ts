// The raw policies used by the spec test matrix (SPEC.md section 14).
// "matrix" is the policy in the spec. "extra" adds hosts needed for edge cases the spec table cannot reach.
export const MATRIX_POLICY_RAW = {
  version: 1,
  on_violation: "strip_node",
  on_error: "drop_message",
  link_handling_mode: "defang_untrusted",
  allowlist: {
    "github.com": {
      allowed_paths: ["/my-org/assets/*.png"],
      allow_query: false,
      max_uri_length: 250
    },
    "api.corp.internal": {
      allowed_paths: ["/chart/*"],
      allow_query: true,
      allowed_query_params: ["theme", "size"],
      max_param_value_length: 10
    },
    "static.internal": {
      allowed_subdomains: ["cdn"],
      allowed_paths: ["/img/*.png"],
      allow_query: false
    }
  }
} as const;

export const EXTRA_POLICY_RAW = {
  ...MATRIX_POLICY_RAW,
  allow_http: true,
  allowlist: {
    ...MATRIX_POLICY_RAW.allowlist,
    __relative__: { allowed_paths: ["/icons/*.png"] },
    "localhost:8080": { allowed_paths: ["/dev/*.png"] },
    "wild.example.net": {
      allowed_paths: ["/w/*.png"],
      allow_subdomains: true,
      acknowledge_wildcard_risk: true
    },
    "deep.example.org": { allowed_paths: ["/d/**"] },
    "long.example.org": { allowed_paths: ["/l/**"], max_uri_length: 60 },
    "blobs.example.org": { allowed_paths: ["/blob/*"], allow_uuid_or_sha_paths: true }
  }
} as const;

export type PolicyName = "matrix" | "extra";

export const POLICIES: Record<PolicyName, unknown> = {
  matrix: MATRIX_POLICY_RAW,
  extra: EXTRA_POLICY_RAW
};
