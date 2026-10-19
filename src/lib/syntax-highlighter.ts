import Prism from "prismjs";

// Load languages in strict dependency order:
// 1. C-like base
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-glsl";

// 2. JavaScript / TypeScript
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";

// 3. Python & GDScript
import "prismjs/components/prism-python";
import "prismjs/components/prism-gdscript";

// 4. Shell, JSON, YAML, Markdown
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-powershell";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

// Enhance GDScript grammar with Godot 4 annotations (@tool, @export, @onready, etc.)
if (Prism.languages.gdscript) {
  Prism.languages.insertBefore("gdscript", "keyword", {
    annotation: {
      pattern: /@\w+/,
      alias: "builtin",
    },
  });
}

const LANGUAGE_ALIASES: Record<string, string> = {
  gd: "gdscript",
  gdshader: "glsl",
  shader: "glsl",
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  ps: "powershell",
  ps1: "powershell",
  cs: "csharp",
  yml: "yaml",
  md: "markdown",
};

const DISPLAY_NAMES: Record<string, string> = {
  gdscript: "GDScript",
  glsl: "GDShader / GLSL",
  python: "Python",
  json: "JSON",
  powershell: "PowerShell",
  bash: "Bash",
  typescript: "TypeScript",
  javascript: "JavaScript",
  csharp: "C#",
  yaml: "YAML",
  markdown: "Markdown",
  plaintext: "Code",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface HighlightResult {
  code: string;
  highlightedHtml: string;
  language: string;
  displayLanguage: string;
  lineCount: number;
}

export function highlightCode(rawCode: string, langName?: string): HighlightResult {
  const code = (rawCode ?? "").replace(/\r\n/g, "\n");
  const normalizedLang = (langName || "").toLowerCase().trim();
  const resolvedLang = LANGUAGE_ALIASES[normalizedLang] || normalizedLang || "plaintext";

  const lines = code.split("\n");
  // Don't count trailing empty line from standard EOF newline
  const lineCount = lines.length > 1 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;

  const grammar = Prism.languages[resolvedLang];
  let highlightedHtml: string;

  if (grammar) {
    highlightedHtml = Prism.highlight(code, grammar, resolvedLang);
  } else {
    highlightedHtml = escapeHtml(code);
  }

  const displayLanguage = DISPLAY_NAMES[resolvedLang] || (resolvedLang ? resolvedLang.toUpperCase() : "Code");

  return {
    code,
    highlightedHtml,
    language: resolvedLang,
    displayLanguage,
    lineCount: Math.max(1, lineCount),
  };
}
