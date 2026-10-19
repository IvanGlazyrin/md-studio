"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from "react";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X } from "lucide-react";
import { ZoomControls } from "./ZoomControls";

const subscribeNever = () => () => {};

export type DocImageProps = ComponentProps<"img">;

export function DocImage({ src, alt, className = "", ...props }: DocImageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const openFullscreen = useCallback(() => setIsFullscreen(true), []);
  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    if (!isFullscreen) {
      if (wasFullscreenRef.current) {
        fullscreenTriggerRef.current?.focus();
      }
      wasFullscreenRef.current = false;
      return;
    }
    wasFullscreenRef.current = true;

    // Focus first focusable element inside fullscreen dialog
    const firstFocusable = fullscreenRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "Tab" && fullscreenRef.current) {
        const focusables = Array.from(
          fullscreenRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
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
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  if (!src) return null;

  return (
    <>
      <figure
        className="relative my-6 overflow-hidden rounded-xl border border-border/80 bg-slate-900/60 shadow-2xl"
        aria-label={alt || "Изображение"}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          centerOnInit
          limitToBounds={false}
          wheel={{ step: 0.001 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: "toggle" }}
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent
            wrapperClass="!w-full !max-h-[70vh] cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden"
            contentClass="!w-full flex items-center justify-center"
          >
            <div className="flex w-full items-center justify-center p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`block max-h-[65vh] w-auto max-w-full select-none rounded-lg object-contain ${className}`}
                {...props}
              />
            </div>
          </TransformComponent>
          <ZoomControls onFullscreen={openFullscreen} fullscreenTriggerRef={fullscreenTriggerRef} />
        </TransformWrapper>
      </figure>

      {isFullscreen &&
        mounted &&
        createPortal(
          <div
            ref={fullscreenRef}
            role="dialog"
            aria-modal="true"
            aria-label={alt ? `Изображение: ${alt}` : "Изображение во весь экран"}
            className="fixed inset-0 z-[100] m-0 flex h-[100dvh] w-full max-w-none flex-col bg-black/95 backdrop-blur-md"
            onClick={closeFullscreen}
          >
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between pointer-events-none">
              {alt ? (
                <span className="pointer-events-auto max-w-[calc(100%-4rem)] truncate rounded-md bg-secondary/80 px-3 py-1.5 text-xs text-foreground backdrop-blur-xs">
                  {alt}
                </span>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={closeFullscreen}
                aria-label="Закрыть"
                title="Закрыть (Esc)"
                className="pointer-events-auto rounded-full bg-secondary p-2 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="relative min-h-0 flex-1"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit
                limitToBounds={false}
                wheel={{ step: 0.001 }}
                pinch={{ step: 5 }}
                doubleClick={{ mode: "toggle" }}
                panning={{ velocityDisabled: true }}
              >
                <TransformComponent
                  wrapperClass="!h-full !w-full cursor-grab active:cursor-grabbing flex items-center justify-center"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <div className="flex h-full w-full items-center justify-center p-4 sm:p-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={alt ?? ""}
                      draggable={false}
                      className="max-h-[calc(100dvh_-_5rem)] w-auto max-w-full select-none object-contain shadow-2xl"
                    />
                  </div>
                </TransformComponent>
                <ZoomControls />
              </TransformWrapper>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
