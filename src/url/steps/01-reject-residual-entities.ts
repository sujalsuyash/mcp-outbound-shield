// Step 1: reject URLs that still contain &...; entity patterns (the parser already decoded one layer).
import { pass, reject, type StepResult } from "../step-result";

const ENTITY = /&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;

export function rejectResidualEntities(raw: string): StepResult<string> {
  return ENTITY.test(raw) ? reject("double_encoded", "entity left after parsing") : pass(raw);
}
