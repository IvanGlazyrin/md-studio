"use client";

import { Trash2 } from "lucide-react";

export function NoteDeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      aria-label="Удалить заметку"
      title="Удалить"
      className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );
}
