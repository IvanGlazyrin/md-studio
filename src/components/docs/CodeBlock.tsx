"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { highlightCode } from "@/lib/syntax-highlighter";

export interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  language?: string;
  rawCode?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  children,
  className = "",
  language: explicitLanguage,
  rawCode: explicitRawCode,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract code text and language from children if not provided explicitly
  let rawCode = explicitRawCode ?? "";
  let language = explicitLanguage ?? "";

  if (!rawCode && children) {
    const childArray = React.Children.toArray(children);
    const codeElement = childArray[0];

    if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(codeElement)) {
      const codeClass = codeElement.props.className || className || "";
      const langMatch = codeClass.match(/language-(\w+)/);
      if (langMatch) {
        language = langMatch[1];
      }
      rawCode = String(codeElement.props.children ?? "").replace(/\n$/, "");
    } else if (typeof children === "string") {
      rawCode = children.replace(/\n$/, "");
    }
  }

  const { highlightedHtml, displayLanguage, lineCount } = highlightCode(rawCode, language);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Clipboard write failed in non-secure or restricted context
    }
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="group relative my-6 overflow-hidden rounded-xl border border-border/80 bg-[#070b14] shadow-xl ring-1 ring-white/5">
      {/* Top chrome bar */}
      <div className="flex h-10 items-center justify-between border-b border-border/60 bg-muted/20 px-4 text-xs">
        <div className="flex items-center gap-2.5">
          {/* Decorative terminal dots */}
          <div className="flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-xs" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-xs" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-xs" />
          </div>

          <div className="h-3.5 w-px bg-border/60" aria-hidden="true" />

          {/* Language badge */}
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
            {displayLanguage}
          </span>

          {lineCount > 1 && (
            <span className="hidden font-mono text-[11px] text-muted-foreground/70 sm:inline">
              {lineCount} {lineCount === 1 ? "строка" : lineCount < 5 ? "строки" : "строк"}
            </span>
          )}
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-muted/40 hover:text-foreground active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          title={copied ? "Скопировано в буфер!" : "Скопировать код"}
          aria-label={copied ? "Скопировано в буфер" : "Скопировать код"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Скопировано!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="font-sans">Копировать</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="code-scroll flex max-h-[600px] overflow-auto py-3 text-sm leading-relaxed">
        {showLineNumbers && lineCount > 1 && (
          <div
            className="flex select-none flex-col border-r border-border/30 bg-muted/5 py-1 pl-3 pr-3 text-right font-mono text-xs text-muted-foreground/40"
            aria-hidden="true"
          >
            {lineNumbers.map((num) => (
              <span key={num} className="leading-[1.65]">
                {num}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-x-auto px-4 py-1">
          <pre className="m-0 bg-transparent p-0 font-mono text-[13px] leading-[1.65]">
            <code
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className={`font-mono ${language ? `language-${language}` : ""}`}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}
