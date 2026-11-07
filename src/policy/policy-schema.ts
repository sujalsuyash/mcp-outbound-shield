// Schema definition (zod) for policy.json. Structure and types only; semantic checks live elsewhere.
import { z } from "zod";
import type { Policy } from "../types/policy";
import { DEFAULT_ENTRY_VALUES, DEFAULT_HEURISTICS, DEFAULT_LIMITS } from "./default-policy";

const positiveInt = z.number().int().positive();

const limitsSchema = z.strictObject({
  max_input_bytes: positiveInt.default(DEFAULT_LIMITS.max_input_bytes),
  max_construct_bytes: positiveInt.default(DEFAULT_LIMITS.max_construct_bytes),
  max_depth: positiveInt.default(DEFAULT_LIMITS.max_depth),
  max_nodes: positiveInt.default(DEFAULT_LIMITS.max_nodes)
});

const heuristicsSchema = z.strictObject({
  max_uri_length: positiveInt.default(DEFAULT_HEURISTICS.max_uri_length),
  max_segment_entropy: z.number().positive().max(8).default(DEFAULT_HEURISTICS.max_segment_entropy),
  max_path_depth: positiveInt.default(DEFAULT_HEURISTICS.max_path_depth),
  max_segment_length: positiveInt.default(DEFAULT_HEURISTICS.max_segment_length),
  max_subdomain_label_length: positiveInt.default(DEFAULT_HEURISTICS.max_subdomain_label_length)
});

const entrySchema = z.strictObject({
  allowed_paths: z.array(z.string()),
  allowed_subdomains: z.array(z.string()).default(() => []),
  allow_subdomains: z.boolean().default(DEFAULT_ENTRY_VALUES.allow_subdomains),
  acknowledge_wildcard_risk: z.boolean().default(DEFAULT_ENTRY_VALUES.acknowledge_wildcard_risk),
  allow_query: z.boolean().default(DEFAULT_ENTRY_VALUES.allow_query),
  allowed_query_params: z.array(z.string()).default(() => []),
  max_param_value_length: positiveInt.default(DEFAULT_ENTRY_VALUES.max_param_value_length),
  max_uri_length: positiveInt.optional(),
  path_case_insensitive: z.boolean().default(DEFAULT_ENTRY_VALUES.path_case_insensitive),
  allow_uuid_or_sha_paths: z.boolean().default(DEFAULT_ENTRY_VALUES.allow_uuid_or_sha_paths)
});

export const policySchema: z.ZodType<Policy, unknown> = z.strictObject({
  version: z.literal(1),
  renderer_profile: z
    .strictObject({ unfurls_links: z.boolean().default(true) })
    .default(() => ({ unfurls_links: true })),
  stream_mode: z.enum(["buffered", "incremental_prefix"]).default("incremental_prefix"),
  link_handling_mode: z
    .enum(["allow", "warn", "defang_untrusted", "strip_untrusted"])
    .default("defang_untrusted"),
  on_violation: z.enum(["strip_node", "replace_placeholder", "defang"]).default("strip_node"),
  on_error: z.enum(["drop_message", "abort_stream"]).default("drop_message"),
  rich_blocks: z.literal("inert").default("inert"),
  allow_http: z.boolean().default(false),
  limits: limitsSchema.default(() => limitsSchema.parse({})),
  default_heuristics: heuristicsSchema.default(() => heuristicsSchema.parse({})),
  allowlist: z.record(z.string(), entrySchema).default(() => ({}))
});
