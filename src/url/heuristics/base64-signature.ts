// Heuristic: Base64 signature in a dynamic token. Returns true on a hit.
const BASE64_LIKE = /^[A-Za-z0-9_-]{14,}={0,2}$/;

export function hasBase64Signature(token: string): boolean {
  if (token.includes("=") || /%3d/i.test(token)) return true;
  if (!BASE64_LIKE.test(token)) return false;
  return /[A-Z]/.test(token) && /[a-z]/.test(token) && /[0-9]/.test(token);
}
