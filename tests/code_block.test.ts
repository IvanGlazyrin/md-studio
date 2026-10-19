import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { highlightCode } from "../src/lib/syntax-highlighter";
import { CodeBlock } from "../src/components/docs/CodeBlock";
import { compileMarkdown } from "../src/lib/vault/mdx-compiler";
import { mdxComponents } from "../src/components/mdx/mdx-components";

describe("CodeBlock & Syntax Highlighting", () => {
  describe("highlightCode utility", () => {
    it("highlights GDScript with Godot 4 annotations and keywords", () => {
      const gdCode = `@tool\nextends EditorScript\n\nfunc _run() -> void:\n    var file = FileAccess.open("res://roads.json")\n    # Комментарий`;
      const res = highlightCode(gdCode, "gdscript");

      expect(res.language).toBe("gdscript");
      expect(res.displayLanguage).toBe("GDScript");
      expect(res.lineCount).toBe(6);
      expect(res.highlightedHtml).toContain('class="token annotation builtin">@tool</span>');
      expect(res.highlightedHtml).toContain('class="token keyword">extends</span>');
      expect(res.highlightedHtml).toContain('class="token keyword">func</span>');
      expect(res.highlightedHtml).toContain('class="token keyword">var</span>');
      expect(res.highlightedHtml).toContain('class="token string">"res://roads.json"</span>');
      expect(res.highlightedHtml).toContain('class="token comment"># Комментарий</span>');
    });

    it("resolves language aliases (gd, py, sh, ps1, ts)", () => {
      expect(highlightCode("var x = 1", "gd").language).toBe("gdscript");
      expect(highlightCode("import os", "py").language).toBe("python");
      expect(highlightCode("echo hello", "sh").language).toBe("bash");
      expect(highlightCode("dir", "ps1").language).toBe("powershell");
      expect(highlightCode("const a = 1", "ts").language).toBe("typescript");
    });

    it("safely handles plaintext and unknown languages by escaping HTML", () => {
      const text = `if a < b && b > c: print("hi")`;
      const res = highlightCode(text, "unknown_lang");

      expect(res.language).toBe("unknown_lang");
      expect(res.displayLanguage).toBe("UNKNOWN_LANG");
      expect(res.highlightedHtml).toContain("&lt;");
      expect(res.highlightedHtml).toContain("&amp;&amp;");
      expect(res.highlightedHtml).toContain("&gt;");
    });
  });

  describe("CodeBlock Component", () => {
    it("renders code block with language badge, copy button and line numbers", () => {
      const gdCode = `@tool\nextends EditorScript\n\nfunc _run():\n    pass`;
      const html = renderToStaticMarkup(
        React.createElement(CodeBlock, {
          language: "gdscript",
          rawCode: gdCode,
        })
      );

      expect(html).toContain("GDScript");
      expect(html).toContain("Копировать");
      expect(html).toContain('aria-label="Скопировать код"');
      expect(html).toContain('class="token annotation builtin">@tool</span>');
      // Line numbers column
      expect(html).toContain(">1<");
      expect(html).toContain(">5<");
    });
  });

  describe("MDX Integration with CodeBlock", () => {
    it("renders fenced gdscript block in MDX with full syntax highlighting and chrome", async () => {
      const source = `
#### Скрипт создания дорог
\`\`\`gdscript
@tool
extends EditorScript

func _run() -> void:
    var a = 42
\`\`\`
`;
      const content = await compileMarkdown(source, {
        components: mdxComponents,
      });
      const html = renderToStaticMarkup(content);

      expect(html).toContain("GDScript");
      expect(html).toContain("Копировать");
      expect(html).toContain('class="token annotation builtin">@tool</span>');
      expect(html).toContain('class="token keyword">extends</span>');
      expect(html).toContain('class="token keyword">func</span>');
      expect(html).toContain('class="token keyword">var</span>');
      expect(html).toContain('class="token number">42</span>');
    });

    it("preserves mermaid diagrams without wrapping them in CodeBlock", async () => {
      const source = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;
      const content = await compileMarkdown(source, {
        components: mdxComponents,
      });
      const html = renderToStaticMarkup(content);

      // Mermaid diagrams render with MermaidDiagram, not CodeBlock
      expect(html).toContain("Загрузка диаграммы…");
      expect(html).not.toContain("Копировать");
    });
  });
});
