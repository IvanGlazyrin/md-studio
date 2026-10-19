import { visit } from "unist-util-visit";
import type { Root } from "mdast";

const BLOCKS = new Set(["heading", "paragraph", "listItem", "tableRow", "code"]);

/**
 * Stamps `data-line` (1-based line of the block's start in the raw `.md` file)
 * on the blocks a reader can attach a note to. `lineOffset` is the number of
 * lines (frontmatter) cut off before the markdown was parsed.
 *
 * Blockquotes are skipped: the callout plugin owns their `hProperties`, and
 * their paragraphs carry the line. A paragraph that starts on the same line as
 * its list item is skipped so the line has exactly one owner.
 */
export function remarkSourceLines({ lineOffset = 0 }: { lineOffset?: number } = {}) {
  return (tree: Root) => {
    visit(tree, (node, _index, parent) => {
      if (!BLOCKS.has(node.type) || !node.position) return;
      const line = node.position.start.line;
      if (node.type === "paragraph" && parent?.type === "listItem" && parent.position?.start.line === line) {
        return;
      }
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, "data-line": String(line + lineOffset) },
      };
    });
  };
}
