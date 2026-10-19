"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from "lucide-react";

export interface GalleryImage {
  url: string;
  name: string;
}

export interface CarGalleryProps {
  images: GalleryImage[];
  title?: string;
}

export function CarGallery({ images, title }: CarGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys belong to whatever the user is typing into (e.g. the search dialog).
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setIsZoomed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev, next]);

  // Focus management and focus trap for lightbox
  const wasZoomedRef = useRef(false);
  useEffect(() => {
    if (!isZoomed) {
      // Restore focus to the trigger only when the lightbox actually closes,
      // not on first render (that would scroll the page to the gallery).
      if (wasZoomedRef.current) zoomTriggerRef.current?.focus();
      wasZoomedRef.current = false;
      return;
    }
    wasZoomedRef.current = true;
    // Move focus into lightbox on open
    const firstFocusable = lightboxRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !lightboxRef.current) return;
      const focusable = Array.from(
        lightboxRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isZoomed]);

  if (!images || images.length === 0) return null;

  const current = images[currentIndex];

  return (
    <section className="my-8 not-prose rounded-2xl border border-cyan-500/30 bg-[#0f172a]/90 p-4 shadow-2xl backdrop-blur-md">
      {/* Header Bar */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
          <ImageIcon className="h-4 w-4" />
          <span>ГАЛЕРЕЯ {title ? `// ${title}` : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">
            {currentIndex + 1} / {images.length}
          </span>
          <button
            ref={zoomTriggerRef}
            type="button"
            onClick={() => setIsZoomed(true)}
            aria-label="Развернуть во весь экран"
            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden transition"
            title="Развернуть на весь экран"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Во весь экран</span>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative group flex h-[380px] sm:h-[480px] w-full items-center justify-center overflow-hidden rounded-xl bg-black/60 border border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          aria-label={`Просмотреть во весь экран: ${current.name}`}
          className="relative h-full w-full cursor-zoom-in focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
        >
          <Image
            src={current.url}
            alt={current.name}
            fill
            sizes="(min-width: 1024px) 52rem, 100vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2.5 text-slate-200 backdrop-blur-xs transition hover:bg-cyan-500 hover:text-slate-950 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Предыдущее изображение"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2.5 text-slate-200 backdrop-blur-xs transition hover:bg-cyan-500 hover:text-slate-950 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Следующее изображение"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Filename Tag Overlay */}
        <div className="pointer-events-none absolute bottom-2 left-3 max-w-[calc(100%-1.5rem)] truncate rounded bg-black/70 px-2.5 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-xs">
          {current.name}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 pt-1">
          {images.map((img, idx) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Перейти к изображению ${idx + 1} из ${images.length}: ${img.name}`}
              aria-current={idx === currentIndex ? "true" : undefined}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden ${
                idx === currentIndex
                  ? "border-cyan-400 ring-2 ring-cyan-500/50 scale-105"
                  : "border-slate-800 opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={img.name} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isZoomed && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={title ? `Галерея: ${title}` : "Просмотр концепт-арта во весь экран"}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          onClick={() => setIsZoomed(false)}
        >
          {/* Top Bar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-slate-300">
            <span className="font-mono text-sm font-bold text-cyan-400">
              {title || "Изображение"} ({currentIndex + 1} / {images.length})
            </span>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="rounded-full bg-slate-800 p-2 text-slate-300 hover:bg-rose-500 hover:text-white transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Закрыть полноэкранный просмотр"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Fullscreen Image */}
          <div
            className="relative h-[85vh] w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={current.url} alt={current.name} fill sizes="90vw" className="object-contain drop-shadow-2xl" />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Предыдущее изображение"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white transition hover:bg-cyan-500 hover:text-black focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Следующее изображение"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white transition hover:bg-cyan-500 hover:text-black focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
