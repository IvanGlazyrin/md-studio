import { compile } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import React, { type ReactElement } from "react";

// Native MDX component dictionary type definition to avoid missing ambient mdx/types module declaration
export type MDXComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [KM in keyof React.JSX.IntrinsicElements | string]?: React.ComponentType<any>;
};
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import type { VaultIndex } from "./indexer";
import { sanitizeMdxSource } from "./sanitize-mdx";
import { remarkObsidianCallouts } from "./plugins/remark-obsidian-callouts";
import { remarkSourceLines } from "./plugins/remark-source-lines";

export interface CompileMarkdownOptions {
  /** Resolves Obsidian wikilinks to docs URLs. */
  index?: Pick<VaultIndex, "fileMap">;
  /** Directory of the document relative to the vault root, for relative image paths. */
  docDirRel?: string;
  /** Source lines cut off before `markdown` (frontmatter), so `data-line` matches the file. */
  lineOffset?: number;
  components?: MDXComponents;
}

/**
 * Renders an Obsidian-flavoured vault note: rewrites wikilinks, images and
 * JSX-hostile characters, then compiles it as MDX with GFM tables, callouts
 * and heading ids that match `extractHeadings`.
 *
 * Compiles with @mdx-js/mdx directly: next-mdx-remote's jsxDEV call is
 * incompatible with React 19 in dev mode.
 */
export async function compileMarkdown(
  markdown: string,
  { index, docDirRel, lineOffset = 0, components = {} }: CompileMarkdownOptions = {}
): Promise<ReactElement> {
  const compiled = await compile(sanitizeMdxSource(markdown, index, docDirRel), {
    remarkPlugins: [
      remarkGfm,
      remarkMath,
      remarkObsidianCallouts,
      [remarkSourceLines, { lineOffset }],
    ],
    rehypePlugins: [rehypeSlug, [rehypeKatex, { strict: false }]],
    outputFormat: "function-body",
    development: false,
  });

  const { default: MDXContent } = new Function(String(compiled))(runtime);
  return React.createElement(MDXContent, { components });
}
