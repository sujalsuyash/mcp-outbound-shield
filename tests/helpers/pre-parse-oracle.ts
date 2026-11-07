// Independent, minimal oracle for URL pipeline steps 1 to 4 (SPEC.md section 3).
// Used only to check that fixture rows are consistent with the step order. It is deliberately
// separate from src/url so the two implementations can be compared later.
export interface OracleResult {
  /** First step among 1, 3, 4 that rejects, or null if the string reaches the parser. */
  failedStep: 1 | 3 | 4 | null;
  /** The string after step 2 (trim and strip). */
  stripped: string;
}

const ENTITY = /&(#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;

export function preParseOracle(raw: string): OracleResult {
  if (ENTITY.test(raw)) return { failedStep: 1, stripped: raw };

  const stripped = raw
    .replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "")
    .replace(/[\t\n\r]/g, "");

  // eslint-disable-next-line no-control-regex
  if (/[^\u0021-\u007e]/.test(stripped)) return { failedStep: 3, stripped };

  const beforeQuery = stripped.split(/[?#]/, 1)[0] ?? "";
  if (stripped.includes("\\") || /%25/i.test(stripped) || /[%;]/.test(beforeQuery)) {
    return { failedStep: 4, stripped };
  }
  return { failedStep: null, stripped };
}
