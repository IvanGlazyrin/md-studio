"use client";

import { useState, useSyncExternalStore } from "react";

interface DesktopVault {
  vaultDir: string;
  isDefault: boolean;
  platform: string;
}

interface DesktopApi {
  isDesktop: true;
  currentVault(): Promise<DesktopVault>;
  chooseVault(): Promise<{ vaultDir: string; changed: boolean }>;
}

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

// The bridge is installed once by the preload script, so the snapshot never
// changes and the server snapshot (no window during SSR) is null.
const noopSubscribe = () => () => {};
const desktopSnapshot = () => (typeof window === "undefined" ? null : window.desktop ?? null);
const serverSnapshot = () => null;

/**
 * Folder picker of the desktop build.
 *
 * In the browser there is no folder to pick — the vault is chosen through the
 * DOCS_DIR environment variable — so the button only appears when the app runs
 * inside Electron. The path is resolved when the server starts, so a new
 * folder means a server restart; the main process does it and the page reloads.
 */
export function VaultPicker() {
  const desktop = useSyncExternalStore(noopSubscribe, desktopSnapshot, serverSnapshot);
  const [busy, setBusy] = useState(false);

  if (!desktop) return null;

  async function choose() {
    if (!desktop) return;
    setBusy(true);
    try {
      const result = await desktop.chooseVault();
      if (result.changed) window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={choose}
      disabled={busy}
      title="Открыть другую папку с документацией"
      className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
    >
      {busy ? "…" : "📂"}
    </button>
  );
}
