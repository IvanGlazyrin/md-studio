import GithubSlugger from "github-slugger";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Slugifies a single heading. Uses the same algorithm as `rehype-slug`, which
 * generates the `id` attributes on the rendered page, so TOC links always
 * resolve to a real anchor.
 *
 * Standalone calls cannot deduplicate — use `extractHeadings` for a whole
 * document, which shares one slugger and suffixes repeats (`-1`, `-2`, ...)
 * exactly as `rehype-slug` does.
 */
export function slugifyHeading(text: string): string {
  return new GithubSlugger().slug(text);
}

/**
 * Reduces heading markdown to the text `rehype-slug` sees on the rendered page:
 * wikilinks become their alias, inline formatting marks are dropped.
 */
export function headingText(markdown: string): string {
  return markdown
    .replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_, p1, p2) => p2 || (p1.includes("#") ? p1.split("#")[1] : p1))
    .replace(/[`*_~]/g, "")
    .trim();
}

export function extractHeadings(markdown: string): HeadingItem[] {
  if (!markdown) return [];
  const cleanMarkdown = markdown.replace(/\r\n/g, "\n").replace(/```[\s\S]*?```/g, "");
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const headings: HeadingItem[] = [];
  const slugger = new GithubSlugger();
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(cleanMarkdown)) !== null) {
    const level = match[1].length;
    const text = headingText(match[2]);
    const id = slugger.slug(text);
    headings.push({ id, text, level });
  }
  return headings;
}
