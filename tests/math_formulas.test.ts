import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { compileMarkdown } from "../src/lib/vault/mdx-compiler";
import { sanitizeMdxSource } from "../src/lib/vault/sanitize-mdx";

describe("Math formula rendering pipeline (remark-math + rehype-katex)", () => {
  it("renders inline math as KaTeX HTML and MathML", async () => {
    const markdown = "Размер холста: $2400 \\times 1600\\text{ px}$.";
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-html"');
    expect(html).toContain("2400");
    expect(html).toContain("×");
    expect(html).toContain("1600");
    expect(html).toContain("px");
  });

  it("supports Cyrillic units in \\text{...}", async () => {
    const markdown = "Дистанция $24\\text{ км}$ и высота $150\\text{ м}$.";
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain("км");
    expect(html).toContain("м");
  });

  it("renders subscripts, greek letters and superscripts", async () => {
    const markdown = "Базовый уровень ($Z_0$), минимум ($Z_{\\min}$), размах ($\\Delta Z$) и площадь $384\\text{ км}^2$.";
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain("Z");
    expect(html).toContain("min");
    expect(html).toContain("Δ");
    expect(html).toContain("384");
  });

  it("renders equations with multi-word Cyrillic text", async () => {
    const markdown = "$1\\text{ единица Godot} = 1\\text{ метр}$";
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain("единица Godot");
    expect(html).toContain("метр");
  });

  it("renders block display math ($$...$$)", async () => {
    const markdown = "$$\nZ(x, y) = Z_0 + \\Delta Z\n$$";
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex-display"');
    expect(html).toContain("Z(x, y)");
  });

  it("preserves currency ranges without mangling or treating as math", async () => {
    const markdown = "Машины класса C ($30k–$65k) и убежища за $150k–$750k.";
    const sanitized = sanitizeMdxSource(markdown);
    expect(sanitized).toContain("&#36;30k–&#36;65k");
    expect(sanitized).toContain("&#36;150k–&#36;750k");

    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);
    expect(html).toContain("$30k–$65k");
    expect(html).toContain("$150k–$750k");
  });

  it("renders table with math formulas across cells matching the user screenshot", async () => {
    const markdown = `
| Параметр | Значение в 2D | Значение в 3D |
| :--- | :--- | :--- |
| **Размер холста** | $2400 \\times 1600\\text{ px}$ | $24000 \\times 16000\\text{ м}$ |
| **Масштаб** | **$1\\text{ px} = 10\\text{ м}$** | **$1\\text{ м} = 0.1\\text{ px}$** |
| **Уровень моря ($Z_0$)** | $Z = 0.0\\text{ м}$ | $Y = 0.0$ |
`;
    const content = await compileMarkdown(markdown);
    const html = renderToStaticMarkup(content);

    expect(html).toContain("<table");
    expect(html).toContain('class="katex"');
    expect(html).toContain("2400");
    expect(html).toContain("1600");
    expect(html).toContain("24000");
    expect(html).toContain("16000");
    expect(html).toContain("Z");
    expect(html).toContain("0");
  });
});
