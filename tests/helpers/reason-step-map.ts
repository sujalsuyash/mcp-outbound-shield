// Data: which URL pipeline step (SPEC.md section 3) produces each reject reason.
import type { RejectReason } from "../../src/types/reject-reason";

export const REASON_STEP: Record<RejectReason, number | null> = {
  double_encoded: 1,
  illegal_char: 3,
  illegal_delimiter: 4,
  relative_not_allowed: 5,
  parse_failed: 6,
  scheme_not_allowed: 7,
  credentials_present: 8,
  ip_host: 8,
  trailing_dot_host: 8,
  port_not_allowed: 9,
  host_not_allowed: 10,
  subdomain_not_allowed: 10,
  path_charset: 11,
  path_too_deep: 11,
  path_not_allowed: 11,
  query_not_allowed: 12,
  query_param_not_allowed: 12,
  query_param_duplicate: 12,
  query_value_invalid: 12,
  uri_too_long: 14,
  base64_signature: 14,
  hex_run: 14,
  high_entropy: 14,
  // Not reachable from input; covered by a dedicated unit test that forces an exception.
  internal_error: null
};
