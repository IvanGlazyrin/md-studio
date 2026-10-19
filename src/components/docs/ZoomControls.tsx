"use client";

import React from "react";
import { useControls } from "react-zoom-pan-pinch";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

export interface ZoomControlsProps {
  onFullscreen?: () => void;
  fullscreenTriggerRef?: React.RefObject<HTMLButtonElement | null>;
  className?: string;
}

export function ZoomControls({
  onFullscreen,
  fullscreenTriggerRef,
  className = "",
}: ZoomControlsProps) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn =
    "rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60";

  return (
    <div
      className={`absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-border/80 bg-card/90 p-1 shadow-xl backdrop-blur-xs ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={() => zoomOut()} aria-label="Уменьшить" title="Уменьшить" className={btn}>
        <ZoomOut className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => zoomIn()} aria-label="Увеличить" title="Увеличить" className={btn}>
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        aria-label="Сбросить масштаб"
        title="Сбросить"
        className={btn}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      {onFullscreen && (
        <button
          ref={fullscreenTriggerRef}
          type="button"
          onClick={onFullscreen}
          aria-label="Открыть во весь экран"
          title="Во весь экран"
          className={btn}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
