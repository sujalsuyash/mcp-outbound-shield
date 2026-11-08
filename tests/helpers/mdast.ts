// Parses Markdown with the same family of parser the reference renderer uses, and lists node types.
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface MdNode {
  type: string;
  children?: MdNode[];
}

export function parseMarkdown(text: string): MdNode {
  return unified().use(remarkParse).use(remarkGfm).parse(text) as MdNode;
}

export function nodeTypes(text: string): Set<string> {
  const types = new Set<string>();
  const walk = (node: MdNode): void => {
    types.add(node.type);
    node.children?.forEach(walk);
  };
  walk(parseMarkdown(text));
  return types;
}
