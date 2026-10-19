import { visit } from "unist-util-visit";
import type { Root } from "mdast";

// `[ \t]*`, not `\s*`: a bare `> [!note]` must not pull the next line in as its title.
const CALLOUT_MARKER = /^\[!([a-zA-Z0-9_-]+)\][ \t]*(.*)$/m;

/**
 * Turns Obsidian callouts (`> [!note] Title`) into blockquotes carrying
 * `data-callout-type` / `data-callout-title`, which the docs page renders
 * with the `Callout` component.
 */
export function remarkObsidianCallouts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node) => {
      const firstChild = node.children[0];
      if (firstChild?.type !== "paragraph") return;
      const firstText = firstChild.children[0];
      if (firstText?.type !== "text") return;

      const match = firstText.value.match(CALLOUT_MARKER);
      if (!match) return;

      const calloutType = match[1].toLowerCase();
      firstText.value = firstText.value.replace(CALLOUT_MARKER, "").trim();
      node.data = {
        ...node.data,
        hProperties: {
          className: ["callout", `callout-${calloutType}`],
          "data-callout-type": calloutType,
          "data-callout-title": match[2] || match[1],
        },
      };
    });
  };
}
