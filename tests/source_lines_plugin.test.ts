import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { renderToStaticMarkup } from "react-dom/server";
import { compileMarkdown } from "../src/lib/vault/mdx-compiler";
import { frontmatterLineCount } from "../src/lib/vault/reader";

async function html(markdown: string, lineOffset = 0): Promise<string> {
  return renderToStaticMarkup(await compileMarkdown(markdown, { lineOffset }));
}

/** Mimics what the docs page does: split frontmatter, compile the body with the offset. */
async function htmlOfFile(raw: string): Promise<string> {
  const { content } = matter(raw);
  return html(content, frontmatterLineCount(raw, content));
}

const BODY = [
  "# Title", // 1
  "", // 2
  "Paragraph one.", // 3
  "", // 4
  "- item a", // 5
  "- item b", // 6
  "  - nested", // 7
  "", // 8
  "| h1 | h2 |", // 9
  "| -- | -- |", // 10
  "| c1 | c2 |", // 11
  "", // 12
  "```txt", // 13
  "code", // 14
  "```", // 15
].join("\n");

describe("remarkSourceLines", () => {
  it("stamps data-line on headings, paragraphs, list items, table rows and code", async () => {
    const out = await html(BODY);
    expect(out).toMatch(/<h1[^>]*data-line="1"/);
    expect(out).toMatch(/<p[^>]*data-line="3"/);
    expect(out).toMatch(/<li[^>]*data-line="5"/);
    expect(out).toMatch(/<li[^>]*data-line="6"/);
    expect(out).toMatch(/<li[^>]*data-line="7"/);
    expect(out).toMatch(/<tr[^>]*data-line="9"/);
    expect(out).toMatch(/<tr[^>]*data-line="11"/);
    expect(out).toMatch(/<code[^>]*data-line="13"/);
  });

  it("does not stamp a second element for the paragraph inside a list item", async () => {
    const out = await html("- item a\n- item b\n");
    expect(out.match(/data-line="1"/g)).toHaveLength(1);
    expect(out.match(/data-line="2"/g)).toHaveLength(1);
  });

  it("stamps the paragraphs of a loose list item once, on the item's line", async () => {
    const out = await html("- first\n\n  second para\n");
    expect(out.match(/data-line="1"/g)).toHaveLength(1);
    expect(out).toMatch(/<p[^>]*data-line="3"/);
  });

  it("adds the offset to every line", async () => {
    const out = await html(BODY, 4);
    expect(out).toMatch(/<h1[^>]*data-line="5"/);
    expect(out).toMatch(/<tr[^>]*data-line="15"/);
    expect(out).not.toMatch(/data-line="1"/);
  });

  it("keeps callout attributes and marks the paragraph, not the blockquote", async () => {
    const out = await html("> [!note] Заголовок\n> Текст заметки.\n");
    expect(out).toMatch(/<blockquote[^>]*data-callout-type="note"/);
    expect(out).not.toMatch(/<blockquote[^>]*data-line/);
    expect(out).toMatch(/<p[^>]*data-line="1"/);
  });

  it("marks plain blockquote paragraphs too", async () => {
    expect(await html("> quoted line\n")).toMatch(/<p[^>]*data-line="1"/);
  });
});

describe("frontmatterLineCount", () => {
  const cases: [string, string, number][] = [
    ["LF", "---\ntitle: A\n---\n# H\n\ntext\n", 3],
    ["LF, blank line after ---", "---\ntitle: A\n---\n\n# H", 3],
    ["CRLF", "---\r\ntitle: A\r\n---\r\n\r\n# H\r\n", 3],
    ["no frontmatter", "# no fm\ntext", 0],
  ];
  it.each(cases)("[RF4] counts the frontmatter lines (%s)", (_label, raw, expected) => {
    expect(frontmatterLineCount(raw, matter(raw).content)).toBe(expected);
  });

  it("returns 0 when the content is not a suffix of the raw text", () => {
    expect(frontmatterLineCount("abc", "zzz")).toBe(0);
  });
});

describe("line numbers match the raw file", () => {
  // raw file:  1 ---  2 title  3 ---  4 (blank)  5 # H  6 (blank)  7 text
  it.each([
    ["LF", "---\ntitle: A\n---\n\n# H\n\ntext\n"],
    ["CRLF", "---\r\ntitle: A\r\n---\r\n\r\n# H\r\n\r\ntext\r\n"],
  ])("[RF4] %s file with frontmatter", async (_label, raw) => {
    const out = await htmlOfFile(raw);
    expect(out).toMatch(/<h1[^>]*data-line="5"/);
    expect(out).toMatch(/<p[^>]*data-line="7"/);
  });

  it("[RF4] file without frontmatter", async () => {
    const out = await htmlOfFile("# H\n\ntext\n");
    expect(out).toMatch(/<h1[^>]*data-line="1"/);
    expect(out).toMatch(/<p[^>]*data-line="3"/);
  });
});
