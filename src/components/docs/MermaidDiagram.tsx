"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { X } from "lucide-react";
import { ZoomControls } from "./ZoomControls";

interface MermaidDiagramProps {
  chart: string;
}

// Module-level flag: mermaid.initialize() is a global operation.
// Calling it once per diagram (old behaviour) was harmless but wasteful;
// now it runs at most once per page-load.
let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        primaryColor: "#0e7490",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#164e63",
        lineColor: "#94a3b8",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
        background: "#0f172a",
        mainBkg: "#1e293b",
        nodeBorder: "#0e7490",
        clusterBkg: "#0f172a",
        titleColor: "#22d3ee",
        edgeLabelBackground: "#1e293b",
        fontFamily: "ui-monospace, monospace",
      },
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

const subscribeNever = () => () => {};

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // False during SSR and hydration, true on the client: gates the portal.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = await getMermaid();
        const result = await mermaid.render(`mermaid-${id}`, chart.trim());
        if (!cancelled) setSvg(result.svg);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

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

    // Move focus to first focusable element inside fullscreen dialog
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

  if (error) {
    return (
      <div className="my-6 rounded-xl border border-red-800 bg-red-950/40 p-4">
        <p className="mb-1 font-mono text-sm text-red-400">⚠ Mermaid render error</p>
        <pre className="whitespace-pre-wrap text-xs text-red-300">{error}</pre>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 flex justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <span className="animate-pulse text-sm text-slate-500">Загрузка диаграммы…</span>
      </div>
    );
  }

  // Инлайн: тянем по ширине контейнера (mermaid ставит инлайн max-width — бьём через !important).
  // Фулскрин: вписываем по высоте вьюпорта.
  const renderSvg = (label: string, svgClass: string) => (
    <div
      // React owns this node exclusively via dangerouslySetInnerHTML — no mixed DOM writes
      dangerouslySetInnerHTML={{ __html: svg }}
      className={`w-full ${svgClass}`}
      aria-label={label}
    />
  );
  const inlineSvgClass = "[&_svg]:block [&_svg]:h-auto [&_svg]:!w-full [&_svg]:!max-w-none";
  const fullscreenSvgClass =
    "[&_svg]:mx-auto [&_svg]:block [&_svg]:h-[calc(100dvh_-_5rem)] [&_svg]:!w-auto [&_svg]:!max-w-none";

  return (
    <>
      <figure
        className="relative my-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
        aria-label="Mermaid diagram"
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
            wrapperClass="!w-full !max-h-[70vh] !min-h-[200px] cursor-grab active:cursor-grabbing"
            contentClass="!w-full"
          >
            <div className="flex w-full justify-center p-4">{renderSvg("Mermaid diagram", inlineSvgClass)}</div>
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
            aria-label="Диаграмма во весь экран"
            className="fixed inset-0 z-[100] m-0 flex h-[100dvh] w-full max-w-none flex-col bg-black/95 backdrop-blur-md"
            onClick={closeFullscreen}
          >
            <button
              type="button"
              onClick={closeFullscreen}
              aria-label="Закрыть"
              title="Закрыть (Esc)"
              className="absolute right-4 top-4 z-20 rounded-full bg-secondary p-2 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="h-5 w-5" />
            </button>
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
                  wrapperClass="!h-full !w-full cursor-grab active:cursor-grabbing"
                  contentClass="!w-full"
                >
                  <div className="flex w-full justify-center p-8">
                  {renderSvg("Mermaid diagram fullscreen", fullscreenSvgClass)}
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
