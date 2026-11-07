// Types and constants describing the state passed between URL pipeline steps.
export const RELATIVE_BASE = "https://__relative__.invalid/";
export const RELATIVE_HOST = "__relative__.invalid";

/** Output of step 5: a string ready for the WHATWG parser. */
export interface ResolvedInput {
  readonly text: string;
  readonly relative: boolean;
}

/** Output of step 6: a parsed URL. For relative input the host is the placeholder host. */
export interface ParsedUrl {
  readonly url: URL;
  readonly relative: boolean;
}
