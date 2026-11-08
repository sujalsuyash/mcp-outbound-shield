// Builds an audit event with attacker-influenced text made safe to log: truncated, controls removed.
import type { AuditEvent } from "./audit-event";

export const MAX_AUDIT_TEXT = 120;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const clipped = value.slice(0, MAX_AUDIT_TEXT + 1).replace(CONTROL, "?");
  return clipped.length > MAX_AUDIT_TEXT ? `${clipped.slice(0, MAX_AUDIT_TEXT)}…` : clipped;
}

export function makeAuditEvent(input: AuditEvent): AuditEvent {
  const detail = clean(input.detail);
  const subject = clean(input.subject);
  return {
    category: input.category,
    action: input.action,
    ...(input.vector !== undefined ? { vector: input.vector } : {}),
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(detail !== undefined ? { detail } : {}),
    ...(subject !== undefined ? { subject } : {})
  };
}
