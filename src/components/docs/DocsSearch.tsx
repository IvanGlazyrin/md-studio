"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { SearchDialog } from "@/components/docs/SearchDialog";
import type { SearchDoc } from "@/lib/vault/search";

export interface DocsSearchProps {
  documents?: SearchDoc[];
}

export function DocsSearch({ documents }: DocsSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition"
        aria-label="Поиск по документации"
      >
        <Search className="h-3.5 w-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Поиск по документации...</span>
        <kbd className="hidden sm:inline rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-500">
          Ctrl+K
        </kbd>
      </button>
      <SearchDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        documents={documents}
      />
    </>
  );
}
