// Rewrites a URL so nothing can fetch or auto-link it: hxxps://evil[.]com/path. Display only.
const SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):(\/\/)?/;

/** Replaces anything outside printable ASCII with a visible <U+XXXX> marker. */
function makeVisible(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    out += code >= 0x21 && code <= 0x7e ? char : `<U+${code.toString(16).toUpperCase().padStart(4, "0")}>`;
  }
  return out;
}

function defangAuthority(rest: string): string {
  const slashes = /^\/*/.exec(rest)?.[0] ?? "";
  const body = rest.slice(slashes.length);
  const boundary = body.search(/[/?#]/);
  const host = boundary === -1 ? body : body.slice(0, boundary);
  return slashes + host.replace(/\./g, "[.]") + body.slice(host.length);
}

export function defangUrl(url: string): string {
  const visible = makeVisible(url.trim());
  const match = SCHEME.exec(visible);
  if (match === null) return defangAuthority(visible);

  const scheme = (match[1] as string).toLowerCase();
  const rest = visible.slice(match[0].length);
  if (match[2] === undefined) return `${match[1]}[:]${rest}`;

  const web = scheme === "http" || scheme === "https";
  const head = web ? `hxx${scheme.slice(3)}://` : `${match[1]}[:]//`;
  return head + defangAuthority(rest);
}
