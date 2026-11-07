// Result type shared by the URL pipeline steps, plus the conversion to a public verdict.
import type { RejectReason } from "../types/reject-reason";
import type { Verdict } from "../types/verdict";

export interface Rejected {
  readonly ok: false;
  readonly reason: RejectReason;
  readonly detail?: string;
}

export type StepResult<T> = { readonly ok: true; readonly value: T } | Rejected;

export function pass<T>(value: T): StepResult<T> {
  return { ok: true, value };
}

export function reject(reason: RejectReason, detail?: string): Rejected {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

export function toVerdict(rejected: Rejected): Verdict {
  return rejected.detail === undefined
    ? { allow: false, reason: rejected.reason }
    : { allow: false, reason: rejected.reason, detail: rejected.detail };
}
