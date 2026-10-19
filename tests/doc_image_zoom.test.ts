import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocImage } from "../src/components/docs/DocImage";
import { ZoomControls } from "../src/components/docs/ZoomControls";
import { mdxComponents } from "../src/components/mdx/mdx-components";
import { compileMarkdown } from "../src/lib/vault/mdx-compiler";

describe("DocImage zoom and fullscreen viewer", () => {
  it("exports DocImage and ZoomControls components", () => {
    expect(typeof DocImage).toBe("function");
    expect(typeof ZoomControls).toBe("function");
  });

  it("renders image inside figure with accessible zoom controls", () => {
    const html = renderToStaticMarkup(
      React.createElement(DocImage, {
        src: "/api/vault/image?file=assets/maps/world_map_graph-v3.png",
        alt: "Топологическая карта бесшовного мира",
      })
    );

    expect(html).toContain("<figure");
    expect(html).toContain('aria-label="Топологическая карта бесшовного мира"');
    expect(html).toContain('src="/api/vault/image?file=assets/maps/world_map_graph-v3.png"');
    expect(html).toContain('alt="Топологическая карта бесшовного мира"');
    expect(html).toContain('aria-label="Уменьшить"');
    expect(html).toContain('aria-label="Увеличить"');
    expect(html).toContain('aria-label="Сбросить масштаб"');
    expect(html).toContain('aria-label="Открыть во весь экран"');
  });

  it("returns null when src is missing or empty", () => {
    const html = renderToStaticMarkup(React.createElement(DocImage, { src: "" }));
    expect(html).toBe("");
  });

  it("compiles markdown image into interactive DocImage via mdxComponents", async () => {
    const markdown = "![Топология мира](/api/vault/image?file=assets/maps/world_map_graph-v3.png)";
    const content = await compileMarkdown(markdown, {
      components: mdxComponents,
    });
    const html = renderToStaticMarkup(content);

    // Verifies standalone image is unwrapped from <p> to avoid HTML nesting warnings
    expect(html).not.toMatch(/<p>\s*<figure/);
    expect(html).toContain("<figure");
    expect(html).toContain('src="/api/vault/image?file=assets/maps/world_map_graph-v3.png"');
    expect(html).toContain('alt="Топология мира"');
    expect(html).toContain('aria-label="Открыть во весь экран"');
    expect(html).toContain('aria-label="Увеличить"');
  });
});
