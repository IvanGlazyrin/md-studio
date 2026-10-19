"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SearchDoc, SearchResultItem, createSearchIndex, searchDocuments } from "@/lib/vault/search";
import type MiniSearch from "minisearch";

export interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documents?: SearchDoc[];
  index?: MiniSearch<SearchDoc>;
}

/** Closing unmounts the dialog body, which resets the query and selection. */
export function SearchDialog({ isOpen, ...props }: SearchDialogProps) {
  if (!isOpen) return null;
  return <SearchDialogBody {...props} />;
}

function SearchDialogBody({ onClose, documents, index }: Omit<SearchDialogProps, "isOpen">) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Memoize search index if documents array is provided
  const activeIndex = useMemo(() => {
    if (index) return index;
    if (documents && documents.length > 0) return createSearchIndex(documents);
    return null;
  }, [index, documents]);

  // Fuzzy search, derived from the query.
  const results = useMemo<SearchResultItem[]>(() => {
    if (!query.trim() || !activeIndex) return [];
    return searchDocuments(activeIndex, query).map((h) => ({
      id: String(h.id),
      title: String(h.title || h.id),
      url: String(h.url || "#"),
      category: h.category ? String(h.category) : undefined,
    }));
  }, [query, activeIndex]);

  // Keyboard shortcuts: Ctrl+K / Cmd+K, Escape, ArrowUp / ArrowDown, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (results.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            onClose();
            router.push(selected.url);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, results, selectedIndex, router]);

  // Scroll active search option into view on keyboard navigation
  useEffect(() => {
    if (!listRef.current || results.length === 0) return;
    const activeItem = listRef.current.querySelector(
      `[id="search-option-${results[selectedIndex]?.id}"]`
    ) as HTMLElement | null;
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, results]);

  const activeOptionId = results[selectedIndex] ? `search-option-${results[selectedIndex].id}` : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Поиск по документации"
        className="w-full max-w-xl rounded-xl border border-cyan-500/30 bg-[#0f172a] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <Search className="h-5 w-5 text-cyan-400" />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-label="Поиск по документации"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
            aria-controls={results.length > 0 ? "search-results-list" : undefined}
            aria-activedescendant={activeOptionId}
            placeholder="Поиск по документации (Ctrl+K)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-hidden"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="rounded p-0.5 text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
              aria-label="Очистить поисковый запрос"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-white transition focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden" aria-label="Закрыть поиск">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 max-h-80 overflow-y-auto">
          {query.trim().length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              Введите ключевые слова для поиска по главам и сущностям...
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Ничего не найдено</p>
          ) : (
            <ul id="search-results-list" ref={listRef} className="space-y-1" role="listbox" aria-label="Результаты поиска">
              {results.map((r, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={r.id}
                    id={`search-option-${r.id}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <Link
                      href={r.url}
                      onClick={onClose}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                          : "text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-400"
                      }`}
                    >
                      <span>{r.title}</span>
                      {r.category && (
                        <span className="rounded border border-slate-700/50 bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-500">
                          {r.category}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
