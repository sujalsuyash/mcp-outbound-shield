// Semantic checks on a resolved policy's allowlist: host keys, wildcard acknowledgment, query rules.
import { parse } from "tldts";
import type { AllowlistEntry, Policy } from "../types/policy";
import { SHARED_HOSTING_SUFFIXES } from "./shared-hosting-list";

export interface AllowlistValidation {
  errors: string[];
  warnings: string[];
}

export const RELATIVE_KEY = "__relative__";

const HOST_KEY =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::([0-9]{1,5}))?$/;
const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PARAM_NAME = /^[A-Za-z0-9._-]+$/;

function splitHostKey(key: string): { host: string; port: string | null } {
  const match = /^(.*?)(?::([0-9]+))?$/.exec(key);
  return { host: match?.[1] ?? key, port: match?.[2] ?? null };
}

function checkHostKey(key: string, errors: string[], warnings: string[]): void {
  if (!HOST_KEY.test(key)) {
    errors.push(`${key}: not a valid lowercase ASCII hostname (IDN hosts must use punycode)`);
    return;
  }
  const { host, port } = splitHostKey(key);
  if (port !== null && (Number(port) < 1 || Number(port) > 65535 || port === "443")) {
    errors.push(`${key}: invalid or default port (omit :443)`);
  }
  if (/^[0-9.]+$/.test(host) || parse(host).isIp) {
    errors.push(`${key}: IP addresses cannot be allowlisted`);
    return;
  }
  if (SHARED_HOSTING_SUFFIXES.includes(host)) {
    errors.push(`${key}: shared-hosting domain; anyone can register a subdomain`);
    return;
  }
  if (host !== "localhost" && parse(host, { allowPrivateDomains: true }).publicSuffix === host) {
    errors.push(`${key}: is a public suffix, not a specific host`);
    return;
  }
  if (SHARED_HOSTING_SUFFIXES.some((suffix) => host.endsWith(`.${suffix}`))) {
    warnings.push(`${key}: lives on shared hosting; confirm you control this exact subdomain`);
  }
}

function checkEntry(key: string, entry: AllowlistEntry, errors: string[], warnings: string[]): void {
  if (entry.allowed_paths.length === 0) errors.push(`${key}: allowed_paths must not be empty`);

  if (entry.allow_subdomains && !entry.acknowledge_wildcard_risk) {
    errors.push(`${key}: allow_subdomains requires "acknowledge_wildcard_risk": true`);
  }
  if (entry.allow_subdomains && entry.acknowledge_wildcard_risk) {
    warnings.push(`${key}: open wildcard subdomains can leak data into DNS logs; prefer allowed_subdomains`);
  }
  if (entry.allow_subdomains && entry.allowed_subdomains.length > 0) {
    errors.push(`${key}: use either allow_subdomains or allowed_subdomains, not both`);
  }
  for (const label of entry.allowed_subdomains) {
    if (!LABEL.test(label)) errors.push(`${key}: invalid subdomain label "${label}"`);
  }

  if (entry.allow_query && entry.allowed_query_params.length === 0) {
    errors.push(`${key}: allow_query requires a non-empty allowed_query_params`);
  }
  if (!entry.allow_query && entry.allowed_query_params.length > 0) {
    errors.push(`${key}: allowed_query_params is set but allow_query is false`);
  }
  for (const name of entry.allowed_query_params) {
    if (!PARAM_NAME.test(name)) errors.push(`${key}: invalid query parameter name "${name}"`);
  }
  if (new Set(entry.allowed_query_params).size !== entry.allowed_query_params.length) {
    errors.push(`${key}: duplicate names in allowed_query_params`);
  }
}

export function validateAllowlist(policy: Policy): AllowlistValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, entry] of Object.entries(policy.allowlist)) {
    if (key === RELATIVE_KEY) {
      if (entry.allow_subdomains || entry.allowed_subdomains.length > 0) {
        errors.push(`${key}: subdomain settings make no sense for relative URLs`);
      }
    } else {
      checkHostKey(key, errors, warnings);
    }
    checkEntry(key, entry, errors, warnings);
  }
  return { errors, warnings };
}
