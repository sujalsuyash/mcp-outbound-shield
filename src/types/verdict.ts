// Type: result of URL evaluation (allow with canonical URL, or reject with a reason).
import type { RejectReason } from "./reject-reason";

export type Verdict =
  | { readonly allow: true; readonly canonical: string }
  | { readonly allow: false; readonly reason: RejectReason; readonly detail?: string };
