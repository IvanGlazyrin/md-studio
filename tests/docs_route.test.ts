import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/docs/Sidebar";
import { TableOfContents } from "../src/components/docs/TableOfContents";
import { type HeadingItem, extractHeadings } from "../src/lib/vault/toc";
import DocsLayout from "../src/app/(docs)/layout";
import DocPage from "../src/app/(docs)/docs/[[...slug]]/page";
import matter from "gray-matter";
import { resolveDocPath } from "../src/lib/vault/reader";
import { VAULT_DIR } from "../src/lib/vault/config";
import { buildNav, type NavGroup, type NavSection } from "../src/lib/vault/navigation";
import { groupContainsActiveUrl } from "../src/lib/vault/nav-active";

describe("Vault Path Mapping", () => {
  it("resolves the root index to vault/00_index.md", async () => {
    const indexPath = path.join(VAULT_DIR, "00_index.md");
    const stat = await fs.stat(indexPath);
    expect(stat.isFile()).toBe(true);
  });

  it("resolves root and nested slugs using resolveDocPath", async () => {
    const rootPath = await resolveDocPath("00_index");
    expect(rootPath).toBeTruthy();
    expect(rootPath?.endsWith("00_index.md")).toBe(true);

    const nested = await resolveDocPath("01_getting_started/01_install");
    expect(nested).toBeTruthy();
    expect(nested).toContain("01_install");

    const folder = await resolveDocPath("02_guides");
    expect(folder).toBeTruthy();
    expect(folder).toContain("02_guides");

    const nonExistent = await resolveDocPath("invalid_doc_slug_xyz");
    expect(nonExistent).toBeNull();
  });
});

describe("Sidebar Navigation Component", () => {
  const sections: NavSection[] = [
    {
      title: "Основы",
      items: [
        { title: "00_Главный индекс", url: "/docs" },
        { title: "Глоссарий", url: "/docs/glossary" },
      ],
    },
    {
      title: "Мир и Карта",
      items: [
        { title: "01_Мир и Регионы", url: "/docs/01_world" },
      ],
    },
  ];

  it("renders sidebar with sections and items", () => {
    const element = Sidebar({ sections, currentPath: "/docs" });
    expect(element).toBeDefined();
    expect(element.type).toBe("aside");
    expect(element.props.className).toContain("w-64");
  });

  it("identifies active link correctly and includes accessibility attributes", () => {
    const element = Sidebar({ sections, currentPath: "/docs/glossary" });
    expect(element).toBeDefined();
    expect(element.props.children).toBeDefined();

    const html = renderToStaticMarkup(element);
    expect(html).toContain('aria-label="Разделы"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('focus-visible:ring-2');
  });
});

describe("TableOfContents Component", () => {
  it("returns empty markup when headings array is empty or undefined", () => {
    expect(renderToStaticMarkup(React.createElement(TableOfContents, { headings: [] }))).toBe("");
    expect(renderToStaticMarkup(React.createElement(TableOfContents, { headings: undefined }))).toBe("");
  });

  it("renders table of contents when headings are provided with navigation landmark and focus styles", () => {
    const headings: HeadingItem[] = [
      { id: "overview", text: "Обзор", level: 2 },
      { id: "mechanics", text: "Механики", level: 3 },
    ];
    const element = React.createElement(TableOfContents, { headings });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('aria-label="Оглавление страницы"');
    expect(html).toContain('focus-visible:ring-2');
  });

  it("renders active heading with aria-current='location' when activeIdOverride is provided", () => {
    const headings: HeadingItem[] = [
      { id: "overview", text: "Обзор", level: 2 },
      { id: "mechanics", text: "Механики", level: 3 },
    ];
    const element = React.createElement(TableOfContents, { headings, activeIdOverride: "mechanics" });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('font-medium text-primary');
  });
});

describe("extractHeadings Helper", () => {
  it("extracts markdown headings with unicode cyrillic anchors", () => {
    const markdown = `
# Заголовок H1 (пропускается)
Введение в документ.

## Лазурный берег
Серпантины и побережье.

### Физика дрифта & APEX
Подробности управления.

## Финал
Заключение.
`;
    const headings = extractHeadings(markdown);
    expect(headings).toHaveLength(3);
    expect(headings[0]).toEqual({
      id: "лазурный-берег",
      text: "Лазурный берег",
      level: 2,
    });
    expect(headings[1].level).toBe(3);
    expect(headings[1].text).toContain("Физика дрифта");
    expect(headings[2]).toEqual({
      id: "финал",
      text: "Финал",
      level: 2,
    });
  });

  it("ignores headings inside code blocks", () => {
    const markdown = `
## Реальный заголовок
\`\`\`gdscript
# ## Это комментарий в коде
func _ready():
    pass
\`\`\`
### Второй реальный
`;
    const headings = extractHeadings(markdown);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Реальный заголовок");
    expect(headings[1].text).toBe("Второй реальный");
  });

  it("handles wikilinks with alias and target in headings", () => {
    const markdown = `
## Секция [[01_section#part|Часть раздела]]
Текст.
### [[02_section|Дрифт]]
`;
    const headings = extractHeadings(markdown);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Секция Часть раздела");
    expect(headings[0].id).toBe("секция-часть-раздела");
    expect(headings[1].text).toBe("Дрифт");
    expect(headings[1].id).toBe("дрифт");
  });

  it("handles empty or heading-free markdown", () => {
    expect(extractHeadings("")).toEqual([]);
    expect(extractHeadings("Just text without headings.")).toEqual([]);
  });
});

describe("DocsLayout Component", () => {
  it("renders layout wrapper with header and child content", async () => {
    const child = React.createElement("div", { id: "test-child" }, "Child Content");
    const layoutElement = await DocsLayout({ children: child });
    expect(layoutElement).toBeDefined();

    // The mobile nav-drawer provider wraps a full-height shell that holds the
    // header and the routed content.
    const shell = layoutElement.props.children;
    expect(shell.props.className).toContain("min-h-screen");

    const [header, content] = shell.props.children;
    expect(header.type).toBe("header");
    expect(content.props.children).toEqual(expect.arrayContaining([child]));
  });
});

describe("DocPage Route Component", () => {
  it("renders root index page when slug is undefined", async () => {
    const pageElement = await DocPage({ params: Promise.resolve({}) });
    expect(pageElement).toBeDefined();
    expect(pageElement.type).toBe("div");
  });

  it("renders specific chapter page when slug is provided", async () => {
    const pageElement = await DocPage({
      params: Promise.resolve({ slug: ["01_getting_started/01_install"] }),
    });
    expect(pageElement).toBeDefined();
    expect(pageElement.type).toBe("div");
  });

  it("throws notFound error when slug does not match any file", async () => {
    await expect(
      DocPage({
        params: Promise.resolve({ slug: ["non_existent_page_12345"] }),
      })
    ).rejects.toThrow();
  });

  it("renders heading elements with matching id attributes for TOC anchor navigation", async () => {
    const pageElement = await DocPage({
      params: Promise.resolve({ slug: ["01_getting_started/01_install"] }),
    });
    expect(pageElement).toBeDefined();

    const html = renderToStaticMarkup(pageElement);
    expect(html).toContain('id="');
    expect(html).toMatch(/<h[2-4][^>]*id="[^"]+"/);
  });

  it("renders wikilinks as styled HTML links in rendered doc", async () => {
    const pageElement = await DocPage({
      params: Promise.resolve({ slug: ["01_getting_started/01_install"] }),
    });
    const html = renderToStaticMarkup(pageElement);
    expect(html).toContain('href="/docs/');
    expect(html).toContain("text-primary");
  });
});

describe("extractHeadings anchor uniqueness", () => {
  it("disambiguates repeated heading text with numeric suffixes", () => {
    const markdown = `
#### Галерея концепт-артов региона
Первый регион.
#### Галерея концепт-артов региона
Второй регион.
#### Галерея концепт-артов региона
Третий регион.
`;
    const headings = extractHeadings(markdown);
    expect(headings.map((h) => h.id)).toEqual([
      "галерея-концепт-артов-региона",
      "галерея-концепт-артов-региона-1",
      "галерея-концепт-артов-региона-2",
    ]);
  });

  it("produces ids identical to the rehype-slug anchors rendered on the page", async () => {
    const { unified } = await import("unified");
    const remarkParse = (await import("remark-parse")).default;
    const remarkRehype = (await import("remark-rehype")).default;
    const rehypeSlug = (await import("rehype-slug")).default;
    const { visit } = await import("unist-util-visit");

    const markdown = await fs.readFile(
      path.join(VAULT_DIR, "02_guides", "01_writing.md"),
      "utf-8"
    );
    const body = matter(markdown).content;

    const tree = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSlug)
      .run(unified().use(remarkParse).parse(body));

    const renderedIds: string[] = [];
    visit(tree as never, "element", (node: { tagName: string; properties?: { id?: unknown } }) => {
      if (/^h[2-4]$/.test(node.tagName) && node.properties?.id) {
        renderedIds.push(String(node.properties.id));
      }
    });

    expect(extractHeadings(body).map((h) => h.id)).toEqual(renderedIds);
  });
});

describe("generated vault navigation", () => {
  function collectUrls(group: NavGroup): string[] {
    return [...(group.items ?? []).map((i) => i.url), ...(group.groups ?? []).flatMap(collectUrls)];
  }

  it("turns folders into sections and labels them from the folder name", async () => {
    const nav = await buildNav();
    expect(nav.map((s) => s.title)).toEqual([
      "Заметки",
      "01 · Getting started",
      "02 · Guides",
      "03 · Reference",
    ]);
    expect(nav[0].items[0]).toEqual({ title: "Главная", url: "/docs" });
  });

  it("labels pages from nav_title and orders them by nav_order", async () => {
    const nav = await buildNav();
    const gettingStarted = nav.find((s) => s.title.startsWith("01"))!;
    expect(gettingStarted.items.map((i) => i.title)).toEqual(["Установка", "Настройка папки"]);
  });

  it("leaves out folders that hold assets", async () => {
    const titles = (await buildNav()).map((s) => s.title);
    expect(titles.some((t) => t.toLowerCase().includes("assets"))).toBe(false);
  });

  it("every nav URL resolves to a real file", async () => {
    const urls = (await buildNav()).flatMap(collectUrls);
    expect(urls.length).toBeGreaterThan(5);
    const missing: string[] = [];
    for (const url of urls) {
      if (!(await resolveDocPath(url.replace(/^\/docs\/?/, "")))) missing.push(url);
    }
    expect(missing).toEqual([]);
  });
});

describe("nav active-path helpers", () => {
  it("groupContainsActiveUrl finds nested matches", () => {
    const group: NavGroup = {
      title: "Notes",
      items: [{ title: "Install", url: "/docs/01_getting_started/01_install" }],
    };
    expect(groupContainsActiveUrl({ title: "Guides", groups: [group] }, group.items![0].url)).toBe(true);
    expect(groupContainsActiveUrl(group, "/docs/03_reference/01_frontmatter")).toBe(false);
  });
});
