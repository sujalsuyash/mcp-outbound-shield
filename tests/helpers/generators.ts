// fast-check generators for URL-like input. Mix of structured near-misses and arbitrary text.
import fc from "fast-check";
import { VECTORS } from "../../src/types/vector";

const PIECES = [
  "", "/", "/my-org/assets/", "/chart/", "/img/", "..", "/..", "%2e", "%2f", "%25", "%41", ";", "\\",
  "?", "&", "=", "#", "a", "1", "theme=a", "U0VDUkVU", "\t", "\n", " ", "\u200b", "\u202e", "@", ":",
  "//", "https:", "http:", "data:", "javascript:", "&amp;", "&#x2e;", "[", "]", "github.com",
  "evil.com", ".png", "%", "~", "\"", "<", ">"
];

export const urlLike = fc
  .array(fc.constantFrom(...PIECES), { minLength: 1, maxLength: 16 })
  .map((parts) => parts.join(""));

const segment = fc.string({
  unit: fc.constantFrom(..."abcXYZ019-._~%;:".split("")),
  minLength: 0,
  maxLength: 24
});

const randomMix = fc
  .tuple(
    fc.constantFrom("https://", "HTTPS://", "//", "http://", "https:/", "https:"),
    fc.constantFrom(
      "github.com", "GITHUB.COM", "api.corp.internal", "cdn.static.internal", "static.internal",
      "evil.com", "github.com:8080", "127.0.0.1", "github.com.", "x.wild.example.net", "localhost:8080"
    ),
    fc.constantFrom("/my-org/assets/", "/chart/", "/img/", "/my-org/assets/../", "/d/a/b/", "/icons/", "/"),
    segment,
    fc.constantFrom("", ".png", ".png;x"),
    fc.constantFrom("", "?theme=dark", "?theme=a&size=b", "?x=1", "?theme=U0VDUkVUX0RBVEE", "?", "?theme=a&theme=b"),
    fc.constantFrom("", "#f", "#")
  )
  .map(([scheme, host, dir, name, ext, query, frag]) => `${scheme}${host}${dir}${name}${ext}${query}${frag}`);

/** Host, matching directory, extension, and queries that make sense for that host. */
const WELL_FORMED = [
  { host: "github.com", dir: "/my-org/assets/", ext: ".png", queries: [""] },
  { host: "GITHUB.COM", dir: "/my-org/assets/", ext: ".png", queries: [""] },
  { host: "api.corp.internal", dir: "/chart/", ext: "", queries: ["", "?theme=dark", "?size=big&theme=a", "?theme=a&theme=b", "?x=1"] },
  { host: "cdn.static.internal", dir: "/img/", ext: ".png", queries: [""] },
  { host: "static.internal", dir: "/img/", ext: ".png", queries: [""] },
  { host: "x.wild.example.net", dir: "/w/", ext: ".png", queries: [""] },
  { host: "localhost:8080", dir: "/dev/", ext: ".png", queries: [""] }
] as const;

const goodName = fc.string({ unit: fc.constantFrom(..."abcdefghij0123456789-_.".split("")), minLength: 1, maxLength: 12 });
const badName = fc.string({ unit: fc.constantFrom(..."abc019-._~%;:\"'<>@ ".split("")), minLength: 1, maxLength: 12 });
const DEFECTS = ["", "", "", "", "", "", "#f", "#", "?", "%2e", "..", "/..", "\u200b", ";x", "@evil.com", "&amp;"];

const wellFormed = fc
  .tuple(
    fc.constantFrom("https://", "https://", "https://", "HTTPS://", "//", "https:/", "https:", "http://"),
    fc.constantFrom(...WELL_FORMED),
    fc.oneof({ weight: 8, arbitrary: goodName }, { weight: 1, arbitrary: badName }),
    fc.constantFrom(...DEFECTS),
    fc.constantFrom("", "", "#top", "#")
  )
  .chain(([scheme, shape, name, defect, frag]) =>
    fc.constantFrom(...shape.queries).map(
      (query) => `${scheme}${shape.host}${shape.dir}${name}${shape.ext}${defect}${query}${frag}`
    )
  );

export const structuredUrl = fc.oneof(
  { weight: 5, arbitrary: wellFormed },
  { weight: 2, arbitrary: randomMix }
);

export const anyText = fc.string({ maxLength: 120 });
export const anyCodeUnits = fc.string({ unit: "binary", maxLength: 80 });

export const anyInput = fc.oneof(
  { weight: 4, arbitrary: structuredUrl },
  { weight: 3, arbitrary: urlLike },
  { weight: 1, arbitrary: anyText },
  { weight: 1, arbitrary: anyCodeUnits }
);

export const anyVector = fc.constantFrom(...VECTORS);
export const anyPolicyName = fc.constantFrom("matrix", "extra" as const);
