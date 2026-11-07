// Type + data: which element/attribute/node a URL came from, and whether it loads without a click.
export const VECTORS = [
  "markdown_image",
  "markdown_definition",
  "markdown_link",
  "markdown_autolink",
  "html_img_src",
  "html_a_href"
] as const;

export type Vector = (typeof VECTORS)[number];

/** Auto-fetch vectors load without a click; link vectors need a click (unless the UI unfurls). */
export type VectorKind = "auto_fetch" | "link";

/** Reference definitions count as auto-fetch because an image can resolve to them. */
export const VECTOR_KIND: Record<Vector, VectorKind> = {
  markdown_image: "auto_fetch",
  markdown_definition: "auto_fetch",
  markdown_link: "link",
  markdown_autolink: "link",
  html_img_src: "auto_fetch",
  html_a_href: "link"
};
