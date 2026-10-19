"use client";

import React, { useState, type ComponentProps } from "react";

import { isColorValue } from "@/lib/color";
export { isColorValue };

export interface ColorBadgeProps extends ComponentProps<"code"> {
  color: string;
  children?: React.ReactNode;
}

export function ColorBadge({
  color,
  children,
  className = "",
  ...props
}: ColorBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(color);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      // Clipboard write failed in non-secure or restricted iframe context
    }
  };

  return (
    <code
      className={`group relative inline-flex items-center gap-1.5 rounded-[4px] border border-border/80 bg-muted/40 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-foreground align-middle transition-colors hover:border-primary/50 hover:bg-muted/70 cursor-pointer select-all ${className}`}
      onClick={handleCopy}
      title={copied ? "Скопировано!" : `Цвет: ${color} (нажмите, чтобы скопировать)`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopy(e as unknown as React.MouseEvent);
        }
      }}
      aria-label={`Цветовой код ${color}${copied ? ", скопировано" : ""}`}
      {...props}
    >
      <span
        className="relative inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border border-white/30 shadow-xs ring-1 ring-black/20 overflow-hidden"
        style={{ backgroundColor: color }}
        aria-hidden="true"
        data-testid="color-swatch"
      >
        {/* Subtle checkerboard behind transparent or near-black colors */}
        <span
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), repeating-linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%, #ccc)",
            backgroundPosition: "0 0, 4px 4px",
            backgroundSize: "8px 8px",
          }}
        />
      </span>
      <span>{children}</span>
      {copied && (
        <span
          className="text-[10px] font-sans font-semibold text-primary animate-in fade-in"
          aria-live="polite"
        >
          ✓
        </span>
      )}
    </code>
  );
}
