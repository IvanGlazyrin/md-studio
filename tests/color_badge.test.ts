import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorBadge, isColorValue } from "../src/components/docs/ColorBadge";
import { compileMarkdown } from "../src/lib/vault/mdx-compiler";
import { mdxComponents } from "../src/components/mdx/mdx-components";

describe("ColorBadge & Color Swatches", () => {
  describe("isColorValue validator", () => {
    it("recognizes valid hex colors of 3, 4, 6 and 8 hex digits", () => {
      expect(isColorValue("#030712")).toBe(true);
      expect(isColorValue("#0284c7")).toBe(true);
      expect(isColorValue("#15803d")).toBe(true);
      expect(isColorValue("#fff")).toBe(true);
      expect(isColorValue("#FFFFFF")).toBe(true);
      expect(isColorValue("#000000ff")).toBe(true);
    });

    it("recognizes rgb, rgba, hsl and hsla colors", () => {
      expect(isColorValue("rgb(255, 0, 0)")).toBe(true);
      expect(isColorValue("rgba(0, 0, 0, 0.5)")).toBe(true);
      expect(isColorValue("hsl(210, 100%, 50%)")).toBe(true);
    });

    it("rejects non-color hashes and general text", () => {
      expect(isColorValue("#REG-01")).toBe(false);
      expect(isColorValue("#12")).toBe(false);
      expect(isColorValue("#5.1")).toBe(false);
      expect(isColorValue("Terrain3D")).toBe(false);
      expect(isColorValue("git status")).toBe(false);
    });
  });

  describe("ColorBadge Component", () => {
    it("renders swatch pill with inline style and accessibility attributes", () => {
      const html = renderToStaticMarkup(
        React.createElement(ColorBadge, { color: "#030712" }, "#030712")
      );

      expect(html).toContain('style="background-color:#030712"');
      expect(html).toContain('data-testid="color-swatch"');
      expect(html).toContain('aria-label="Цветовой код #030712"');
      expect(html).toContain('title="Цвет: #030712 (нажмите, чтобы скопировать)"');
      expect(html).toContain("#030712");
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
    });
  });

  describe("MDX Compilation with Color Badges", () => {
    it("automatically wraps inline hex codes in ColorBadge with visual swatches", async () => {
      const source = `Цвет океана: \`#030712\`, а цвет неба: \`#0284c7\`. Обычный код: \`npm run build\`.`;
      const content = await compileMarkdown(source, {
        components: mdxComponents,
      });
      const html = renderToStaticMarkup(content);

      expect(html).toContain('style="background-color:#030712"');
      expect(html).toContain('style="background-color:#0284c7"');
      expect(html).toContain("npm run build");
      // The regular code does NOT have a color swatch
      expect(html).not.toContain('style="background-color:npm run build"');
    });

    it("renders gradient preview bar in tables with elevation color transitions", async () => {
      const tableSource = `
| Диапазон | Цветовой градиент (HEX) | Пояс |
| :--- | :--- | :--- |
| **$< 0\\text{ м}$** | \`#030712\` $\\to$ \`#0284c7\` | Морской шельф |
| **$0 – 150\\text{ м}$** | \`#15803d\` $\\to$ \`#22c55e\` | Приморье |
`;
      const content = await compileMarkdown(tableSource, {
        components: mdxComponents,
      });
      const html = renderToStaticMarkup(content);

      // Contains swatches for each color
      expect(html).toContain('style="background-color:#030712"');
      expect(html).toContain('style="background-color:#0284c7"');
      expect(html).toContain('style="background-color:#15803d"');
      expect(html).toContain('style="background-color:#22c55e"');

      // Contains gradient preview bars
      expect(html).toContain("linear-gradient(to right, #030712, #0284c7)");
      expect(html).toContain("linear-gradient(to right, #15803d, #22c55e)");
      expect(html).toContain('title="Градиент: от #030712 до #0284c7"');
    });
  });
});
