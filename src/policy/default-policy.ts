// Data: default policy values. No logic.
import type { AllowlistEntry, DefaultHeuristics, Limits } from "../types/policy";

export const DEFAULT_LIMITS: Limits = {
  max_input_bytes: 1_048_576,
  max_construct_bytes: 4096,
  max_depth: 64,
  max_nodes: 10_000
};

export const DEFAULT_HEURISTICS: DefaultHeuristics = {
  max_uri_length: 200,
  max_segment_entropy: 4.2,
  max_path_depth: 6,
  max_segment_length: 64,
  max_subdomain_label_length: 16
};

export const DEFAULT_ENTRY_VALUES: Omit<AllowlistEntry, "allowed_paths"> = {
  allowed_subdomains: [],
  allow_subdomains: false,
  acknowledge_wildcard_risk: false,
  allow_query: false,
  allowed_query_params: [],
  max_param_value_length: 32,
  path_case_insensitive: false,
  allow_uuid_or_sha_paths: false
};
