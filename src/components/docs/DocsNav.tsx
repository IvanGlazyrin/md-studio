"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/docs/Sidebar";
import type { NavSection } from "@/lib/vault/navigation";

const DRAWER_ID = "docs-nav-drawer";

interface DocsNavState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const DocsNavContext = createContext<DocsNavState | null>(null);

const NOOP = () => {};
const CLOSED: DocsNavState = { isOpen: false, open: NOOP, close: NOOP };

/**
 * Falls back to a permanently closed drawer when no provider is above. The
 * drawer is an enhancement over the always-rendered sidebar, so a subtree
 * without the provider — a page rendered on its own, a unit test — should
 * still show the navigation rather than crash.
 */
function useDocsNav(): DocsNavState {
  return useContext(DocsNavContext) ?? CLOSED;
}

/**
 * Holds the open state of the mobile navigation drawer. The trigger lives in
 * the header and the drawer in the content row, so the state has to sit above
 * both. Server-rendered children pass through untouched.
 */
export function DocsNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Following a link should leave the drawer behind (state adjusted during
  // render, see react.dev "You Might Not Need an Effect").
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setIsOpen(false);
  }

  // The page underneath must not scroll while the drawer covers it.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <DocsNavContext.Provider value={value}>{children}</DocsNavContext.Provider>;
}

/** Hamburger that opens the drawer. Hidden once the sidebar is always visible. */
export function DocsNavTrigger() {
  const { isOpen, open } = useDocsNav();

  return (
    <button
      type="button"
      onClick={open}
      aria-expanded={isOpen}
      aria-controls={DRAWER_ID}
      aria-label="Открыть разделы"
      className="-ml-1 mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary lg:hidden"
    >
      <Menu className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export interface DocsSidebarProps {
  sections: NavSection[];
  currentPath?: string;
}

/**
 * The docs navigation: a permanent column from `lg` up, an overlay drawer below
 * it. Both render the same `Sidebar`, so the two stay in step.
 */
export function DocsSidebar({ sections, currentPath }: DocsSidebarProps) {
  const pathname = usePathname();
  const activePath = currentPath ?? (pathname ? decodeURIComponent(pathname) : "");
  const { isOpen, close } = useDocsNav();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Move focus into the drawer on open, and hand it back to the trigger after.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
      return;
    }
    previouslyFocused.current?.focus?.();
    previouslyFocused.current = null;
  }, [isOpen]);

  return (
    <>
      <Sidebar
        sections={sections}
        currentPath={activePath}
        className="hidden lg:block"
      />

      <div
        className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={isOpen ? undefined : true}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-background/80 backdrop-blur-xs transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          id={DRAWER_ID}
          role="dialog"
          aria-modal={isOpen ? true : undefined}
          aria-label="Разделы"
          className={`absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col bg-card shadow-2xl transition-transform duration-200 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Разделы
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Закрыть разделы"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <Sidebar
            sections={sections}
            currentPath={activePath}
            className="static top-auto max-h-none w-full flex-1 border-r-0 bg-transparent pt-3"
            showHeading={false}
          />
        </div>
      </div>
    </>
  );
}
