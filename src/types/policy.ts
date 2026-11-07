// Type: the shape of a fully resolved policy (all defaults filled in). Mirrors policy.json keys.
export type StreamMode = "buffered" | "incremental_prefix";
export type LinkHandlingMode = "allow" | "warn" | "defang_untrusted" | "strip_untrusted";
export type OnViolation = "strip_node" | "replace_placeholder" | "defang";
export type OnError = "drop_message" | "abort_stream";
export type RichBlocksMode = "inert";

export interface Limits {
  max_input_bytes: number;
  max_construct_bytes: number;
  max_depth: number;
  max_nodes: number;
}

export interface DefaultHeuristics {
  max_uri_length: number;
  max_segment_entropy: number;
  max_path_depth: number;
  max_segment_length: number;
  max_subdomain_label_length: number;
}

export interface AllowlistEntry {
  allowed_paths: string[];
  allowed_subdomains: string[];
  allow_subdomains: boolean;
  acknowledge_wildcard_risk: boolean;
  allow_query: boolean;
  allowed_query_params: string[];
  max_param_value_length: number;
  max_uri_length?: number | undefined;
  path_case_insensitive: boolean;
  allow_uuid_or_sha_paths: boolean;
}

export interface Policy {
  version: 1;
  renderer_profile: { unfurls_links: boolean };
  stream_mode: StreamMode;
  link_handling_mode: LinkHandlingMode;
  on_violation: OnViolation;
  on_error: OnError;
  rich_blocks: RichBlocksMode;
  allow_http: boolean;
  limits: Limits;
  default_heuristics: DefaultHeuristics;
  allowlist: Record<string, AllowlistEntry>;
}
