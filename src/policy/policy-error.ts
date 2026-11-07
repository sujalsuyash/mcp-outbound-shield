// Error type thrown when a policy fails to load. Carries every problem found, not just the first.
export class PolicyError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid policy:\n- ${issues.join("\n- ")}`);
    this.name = "PolicyError";
    this.issues = issues;
  }
}
