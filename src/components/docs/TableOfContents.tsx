"use client";

import React, { useEffect, useState } from "react";
import type { HeadingItem } from "@/lib/vault/toc";
import { cn } from "@/lib/utils";

export interface TableOfContentsProps {
  headings?: HeadingItem[];
  /** Optional override for testing or manual active heading control. */
  activeIdOverride?: string;
}

export function TableOfContents({ headings, activeIdOverride }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (activeIdOverride !== undefined) {
      return;
    }

    if (!headings || headings.length === 0) return;

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings, activeIdOverride]);

  if (!headings || headings.length === 0) return null;

  const currentActiveId = activeIdOverride ?? activeId;

  return (
    <nav
      aria-label="Оглавление страницы"
      className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto p-4 text-xs xl:block"
    >
      <div className="mb-3 font-mono font-bold uppercase tracking-wider text-muted-foreground">
        На этой странице
      </div>
      <ul className="space-y-2 border-l border-border pl-3">
        {headings.map((h) => {
          const isActive = h.id === currentActiveId;
          return (
            <li key={h.id} style={{ marginLeft: `${Math.max(0, h.level - 2) * 8}px` }}>
              <a
                href={`#${h.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "inline-block rounded px-1 py-0.5 leading-snug transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60",
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
