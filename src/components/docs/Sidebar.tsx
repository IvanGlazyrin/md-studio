import React from "react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "@/components/docs/NavGroups";
import type { NavSection } from "@/lib/vault/navigation";

export function Sidebar({
  sections,
  currentPath,
  className,
  showHeading = true,
}: {
  sections: NavSection[];
  currentPath: string;
  /** Overrides the default column box, e.g. when reused inside the drawer. */
  className?: string;
  /** The drawer carries its own title bar, so it suppresses this one. */
  showHeading?: boolean;
}) {
  return (
    <aside
      className={cn(
        "sticky top-14 max-h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-background/90 p-4",
        className
      )}
    >
      <nav aria-label="Разделы">
        {showHeading && (
          <div className="mb-6 font-mono text-xs font-bold uppercase tracking-widest text-primary">
            РАЗДЕЛЫ
          </div>
        )}
        <div className="space-y-1">
          {sections.map((sec) => (
            <CollapsibleSection
              key={sec.title}
              section={sec}
              currentPath={currentPath}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
