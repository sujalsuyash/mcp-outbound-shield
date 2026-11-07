// Turns path patterns like /a/*.png into matcher objects. Pure; throws PolicyError on a bad pattern.
import { PolicyError } from "./policy-error";

export interface CompiledPathPattern {
  readonly source: string;
  /** True if the (already canonical) pathname matches this pattern. */
  readonly matches: (pathname: string) => boolean;
}

const SEGMENT_CHAR_CLASS = "[A-Za-z0-9._-]";
const PATTERN_SEGMENT = /^[A-Za-z0-9._*-]+$/;
const PATHNAME_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_PATTERN_LENGTH = 512;
const MAX_MATCHED_SEGMENT_LENGTH = 255;
const MAX_STARS_PER_SEGMENT = 2;

type SegmentMatcher = (segment: string) => boolean;

function fail(source: string, why: string): never {
  throw new PolicyError([`path pattern "${source}": ${why}`]);
}

function escapeLiteral(text: string): string {
  return text.replace(/[.\-]/g, "\\$&");
}

function buildSegmentMatcher(segment: string, caseInsensitive: boolean): SegmentMatcher {
  if (!segment.includes("*")) {
    return caseInsensitive
      ? (s) => s.toLowerCase() === segment.toLowerCase()
      : (s) => s === segment;
  }
  const body = segment.split("*").map(escapeLiteral).join(`${SEGMENT_CHAR_CLASS}+`);
  const regex = new RegExp(`^${body}$`, caseInsensitive ? "i" : "");
  return (s) => regex.test(s);
}

function checkPatternSyntax(source: string, segments: string[]): void {
  if (source.length > MAX_PATTERN_LENGTH) fail(source, "pattern is too long");
  if (!source.startsWith("/")) fail(source, "must start with /");
  if (/[?#%;\\]/.test(source)) fail(source, "must not contain ? # % ; or backslash");

  segments.forEach((segment, index) => {
    if (segment === "") fail(source, "empty segment (// or trailing /) is not allowed");
    if (segment === "." || segment === "..") fail(source, "dot segments are not allowed");
    if (!PATTERN_SEGMENT.test(segment)) fail(source, `illegal character in segment "${segment}"`);
    if (segment.includes("**") && segment !== "**") {
      fail(source, `"**" must be a whole segment, found "${segment}"`);
    }
    if (segment === "**" && index !== segments.length - 1) {
      fail(source, '"**" is only allowed as the final segment');
    }
    const stars = segment.split("*").length - 1;
    if (segment !== "**" && stars > MAX_STARS_PER_SEGMENT) {
      fail(source, `at most ${MAX_STARS_PER_SEGMENT} "*" per segment`);
    }
  });
}

export function compilePathPattern(source: string, caseInsensitive: boolean): CompiledPathPattern {
  if (source === "/") {
    return { source, matches: (pathname) => pathname === "/" };
  }

  const segments = source.slice(1).split("/");
  checkPatternSyntax(source, segments);

  const hasGlobstar = segments[segments.length - 1] === "**";
  const fixed = hasGlobstar ? segments.slice(0, -1) : segments;
  const matchers = fixed.map((segment) => buildSegmentMatcher(segment, caseInsensitive));

  const matches = (pathname: string): boolean => {
    if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname === "/") return false;
    const parts = pathname.slice(1).split("/");
    if (parts.some((p) => p === "" || p.length > MAX_MATCHED_SEGMENT_LENGTH)) return false;

    if (hasGlobstar ? parts.length <= matchers.length : parts.length !== matchers.length) {
      return false;
    }
    if (!matchers.every((match, i) => match(parts[i] as string))) return false;
    if (!hasGlobstar) return true;

    return parts
      .slice(matchers.length)
      .every((p) => PATHNAME_SEGMENT.test(p) && p !== "." && p !== "..");
  };

  return { source, matches };
}
