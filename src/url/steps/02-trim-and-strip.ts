// Step 2: trim leading/trailing C0 controls and spaces, remove tab/LF/CR anywhere (as WHATWG parsers do).
// Written as a loop on purpose: a regex trim is quadratic on crafted input.
export function trimAndStrip(raw: string): string {
  let start = 0;
  let end = raw.length;
  while (start < end && raw.charCodeAt(start) <= 0x20) start += 1;
  while (end > start && raw.charCodeAt(end - 1) <= 0x20) end -= 1;
  return raw.slice(start, end).replace(/[\t\n\r]/g, "");
}
