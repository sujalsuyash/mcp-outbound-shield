// Type + data: every reason code the URL evaluator can reject with.
export const REJECT_REASONS = [
  "double_encoded",
  "illegal_char",
  "illegal_delimiter",
  "relative_not_allowed",
  "parse_failed",
  "scheme_not_allowed",
  "credentials_present",
  "ip_host",
  "trailing_dot_host",
  "port_not_allowed",
  "host_not_allowed",
  "subdomain_not_allowed",
  "path_not_allowed",
  "path_charset",
  "path_too_deep",
  "query_not_allowed",
  "query_param_not_allowed",
  "query_param_duplicate",
  "query_value_invalid",
  "uri_too_long",
  "base64_signature",
  "hex_run",
  "high_entropy",
  "internal_error"
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];
