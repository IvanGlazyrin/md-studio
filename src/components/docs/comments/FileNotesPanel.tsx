"use client";

import type { ClientTodo } from "@/lib/vault/comments/client";
import { NoteDeleteButton } from "./NoteDeleteButton";

interface FileNotesPanelProps {
  todos: ClientTodo[];
  error: string | null;
  onDelete: (id: string) => void;
}

/** Notes with no block to sit next to (whole-file and lost ones) and the error banner. */
export function FileNotesPanel({ todos, error, onDelete }: FileNotesPanelProps) {
  if (todos.length === 0 && !error) return null;

  return (
    <div className="mb-6 space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
        >
          {error}
        </p>
      )}
      {todos.length > 0 && (
        <details open className="rounded-lg border border-accent/30 bg-accent/5">
          <summary className="cursor-pointer px-4 py-2 font-mono text-sm font-semibold text-accent">
            Заметки к файлу · {todos.length}
          </summary>
          <ul className="divide-y divide-border">
            {todos.map((note) => (
              <li key={note.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  {note.scope === "line" && (
                    <p className="mb-1 truncate font-mono text-xs text-muted-foreground">
                      строка не найдена: «{note.anchor}»
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{note.text}</p>
                </div>
                <NoteDeleteButton onDelete={() => onDelete(note.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
