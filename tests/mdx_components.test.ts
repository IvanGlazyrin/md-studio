import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CarGallery } from "../src/components/docs/CarGallery";

describe("Interactive MDX Components", () => {
  describe("CarGallery Component", () => {
    it("exports CarGallery React component", () => {
      expect(typeof CarGallery).toBe("function");
    });

    it("renders gallery with accessible ARIA attributes and controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(CarGallery, {
          title: "Обложка раздела",
          images: [
            { url: "/art/one.jpg", name: "one.jpg" },
            { url: "/art/two.jpg", name: "two.jpg" },
          ],
        })
      );

      expect(html).toContain("ГАЛЕРЕЯ // Обложка раздела");
      expect(html).toContain('aria-label="Развернуть во весь экран"');
      expect(html).toContain('aria-label="Просмотреть во весь экран: one.jpg"');
      expect(html).toContain('aria-label="Предыдущее изображение"');
      expect(html).toContain('aria-label="Следующее изображение"');
      expect(html).toContain('aria-label="Перейти к изображению 1 из 2: one.jpg"');
      expect(html).toContain('aria-current="true"');
      expect(html).toContain("focus-visible:ring-2");
    });
  });

  describe("MDX Compilation Pipeline", () => {
    it("compiles MDX with wikilinks and callouts", async () => {
      const { compileMarkdown } = await import("../src/lib/vault/mdx-compiler");
      const source = `## Секция 1

Check [[01_getting_started/01_install|Установка]].
Math: $Z_{\text{base}}$ and frequency <200 Гц.

> [!NOTE] Внимание
> Важное примечание.
`;

      const content = await compileMarkdown(source, {
        index: { fileMap: { "01_getting_started/01_install": "/docs/01_getting_started/01_install" } },
      });

      const html = renderToStaticMarkup(content);
      expect(html).toContain('id="секция-1"');
      expect(html).toContain('href="/docs/01_getting_started/01_install"');
      expect(html).toContain("Установка");
      expect(html).toContain("callout-note");
    }, 15000);

    it("compiles a note from the bundled vault", async () => {
      const { compileMarkdown } = await import("../src/lib/vault/mdx-compiler");
      const { readDoc } = await import("../src/lib/vault/reader");
      const { buildIndex } = await import("../src/lib/vault/indexer");

      const doc = await readDoc("00_index");
      expect(doc).not.toBeNull();

      const content = await compileMarkdown(doc!.content, {
        index: await buildIndex(),
        docDirRel: doc!.dirRel,
      });

      const html = renderToStaticMarkup(content);
      expect(html).toContain("Markdown-хранилища");
      // Wikilinks of the index point to real pages of the demo vault.
      expect(html).toContain('href="/docs/01_getting_started/01_install"');
    }, 15000);
  });
});
