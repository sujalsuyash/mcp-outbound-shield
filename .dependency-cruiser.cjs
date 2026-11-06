/** Enforces the layering: no cycles; lower layers never import higher ones. */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "types-import-nothing", severity: "error",
      from: { path: "^src/types" }, to: { path: "^src/(?!types)" } },
    { name: "policy-only-types", severity: "error",
      from: { path: "^src/policy" }, to: { path: "^src/(?!types|policy)" } },
    { name: "url-only-types-policy", severity: "error",
      from: { path: "^src/url" }, to: { path: "^src/(?!types|policy|url)" } },
    { name: "csp-only-types-policy", severity: "error",
      from: { path: "^src/csp" }, to: { path: "^src/(?!types|policy|csp)" } }
  ],
  options: { tsConfig: { fileName: "tsconfig.json" } }
};
