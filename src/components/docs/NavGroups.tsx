"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup, NavItem, NavSection } from "@/lib/vault/navigation";
import { groupContainsActiveUrl } from "@/lib/vault/nav-active";

const FOCUS_RING = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60";

const ITEM_LINK_CLASS = `block rounded px-2.5 py-1.5 text-xs transition ${FOCUS_RING}`;

const GROUP_BUTTON_CLASS = `flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground ${FOCUS_RING}`;

const SECTION_BUTTON_CLASS = `flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/70 transition hover:bg-secondary/60 hover:text-foreground ${FOCUS_RING}`;

function toDomId(value: string): string {
  return value.replace(/[^a-z0-9а-яё-]+/gi, "-").toLowerCase();
}

const STORAGE_EVENT = "docs-nav-storage";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // Private mode
  }
}

function writeStored(key: string, open: boolean) {
  try {
    localStorage.setItem(key, open ? "1" : "0");
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // Private mode — collapsing still works for this page.
  }
}

/**
 * Open/closed state of a nav branch. The branch holding the current page is
 * open; others follow the user's last choice, remembered in localStorage. A
 * toggle on the current page wins until the user navigates elsewhere.
 * The server render (no storage) shows only the active branch open.
 */
function usePersistedOpen(storageKey: string, containsActive: boolean, currentPath: string) {
  const stored = useSyncExternalStore(subscribeToStorage, () => readStored(storageKey), () => null);
  const [toggled, setToggled] = useState<{ path: string; open: boolean } | null>(null);

  const open = toggled?.path === currentPath ? toggled.open : containsActive || stored === "1";
  const toggle = () => {
    setToggled({ path: currentPath, open: !open });
    writeStored(storageKey, !open);
  };

  return [open, toggle] as const;
}

function NavItemList({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = item.url === currentPath;
        return (
          <li key={item.url}>
            <Link
              href={item.url}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                ITEM_LINK_CLASS,
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {item.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")} />
  );
}

export function CollapsibleGroup({
  group,
  currentPath,
  storageKey,
  depth = 0,
}: {
  group: NavGroup;
  currentPath: string;
  /** Stable localStorage key, e.g. `docs-nav-open:01 · Intro/Reference`. */
  storageKey: string;
  depth?: number;
}) {
  const containsActive = useMemo(() => groupContainsActiveUrl(group, currentPath), [group, currentPath]);
  const [open, toggle] = usePersistedOpen(storageKey, containsActive, currentPath);
  const panelId = toDomId(`nav-panel-${storageKey}`);

  return (
    <div className={depth > 0 ? "ml-2 border-l border-border/60 pl-2" : undefined}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={panelId} className={GROUP_BUTTON_CLASS}>
        <Chevron open={open} />
        <span className="min-w-0 flex-1 truncate">{group.title}</span>
      </button>
      {open && (
        <div id={panelId} role="region" aria-label={group.title} className="mt-0.5 space-y-0.5">
          {(group.groups ?? []).map((sub) => (
            <CollapsibleGroup
              key={sub.title}
              group={sub}
              currentPath={currentPath}
              storageKey={`${storageKey}/${sub.title}`}
              depth={depth + 1}
            />
          ))}
          <NavItemList items={group.items ?? []} currentPath={currentPath} />
        </div>
      )}
    </div>
  );
}

/** Collapsible top-level chapter (NavSection) — wraps both items and groups. */
export function CollapsibleSection({ section, currentPath }: { section: NavSection; currentPath: string }) {
  const containsActive = useMemo(() => groupContainsActiveUrl(section, currentPath), [section, currentPath]);
  const [open, toggle] = usePersistedOpen(`docs-nav-section:${section.title}`, containsActive, currentPath);
  const panelId = toDomId(`section-panel-${section.title}`);

  return (
    <section aria-labelledby={`${panelId}-btn`}>
      <button
        id={`${panelId}-btn`}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={SECTION_BUTTON_CLASS}
      >
        <Chevron open={open} />
        <span className="min-w-0 flex-1 truncate">{section.title}</span>
      </button>
      {open && (
        <div id={panelId} role="region" aria-label={section.title} className="mt-0.5 space-y-0.5">
          <NavItemList items={section.items} currentPath={currentPath} />
          {(section.groups ?? []).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {(section.groups ?? []).map((group) => (
                <CollapsibleGroup
                  key={group.title}
                  group={group}
                  currentPath={currentPath}
                  storageKey={`docs-nav-open:${section.title}/${group.title}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
