// Decides whether the labels in front of an allowlisted host are acceptable for that entry.
import type { AllowlistEntry } from "../types/policy";

const WILDCARD_LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)?$/;
const ALL_HEX = /^[0-9a-f]+$/;

export function hasSubdomainRules(entry: AllowlistEntry): boolean {
  return entry.allow_subdomains || entry.allowed_subdomains.length > 0;
}

/** `prefix` is the part of the hostname before ".<allowlisted host>", for example "cdn". */
export function isAllowedSubdomain(prefix: string, entry: AllowlistEntry, maxLabelLength: number): boolean {
  if (entry.allowed_subdomains.length > 0) return entry.allowed_subdomains.includes(prefix);
  if (!entry.allow_subdomains) return false;
  if (prefix.length === 0 || prefix.length > maxLabelLength || prefix.includes(".")) return false;
  if (!WILDCARD_LABEL.test(prefix)) return false;
  return !(prefix.length >= 10 && ALL_HEX.test(prefix));
}
