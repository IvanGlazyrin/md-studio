"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import type { ClientTodo, DraftInput } from "@/lib/vault/comments/client";
import { NoteDeleteButton } from "./NoteDeleteButton";

interface CommentPopoverProps {
  line: number;
  top: number;
  notes: ClientTodo[];
  onClose: () => void;
  onCreate: (input: DraftInput) => Promise<void>;
  onDelete: (id: string) => void;
}

/** Existing open notes of one block plus the form for a new one. */
export function CommentPopover({ line, top, notes, onClose, onCreate, onDelete }: CommentPopoverProps) {
  const [text, setText] = useState("");
  const [wholeFile, setWholeFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(wholeFile ? { scope: "file", text: trimmed } : { scope: "line", line, text: trimmed });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  function onTextKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Заметки к строке ${line}`}
      style={{ top }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="absolute left-0 z-30 w-[min(28rem,100%)] rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-2xl"
    >
      {notes.length > 0 && (
        <ul className="mb-3 divide-y divide-border rounded-md border border-border">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-2 px-3 py-2">
              <p className="min-w-0 whitespace-pre-wrap break-words">{note.text}</p>
              <NoteDeleteButton onDelete={() => onDelete(note.id)} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Новая заметка · <span className="text-primary">{wholeFile ? "Весь файл" : `Строка ${line}`}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onTextKeyDown}
          rows={3}
          placeholder="Что нужно сделать?"
          aria-label="Текст заметки"
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={wholeFile}
            onChange={(e) => setWholeFile(e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))] focus-visible:ring-2 focus-visible:ring-ring rounded"
          />
          Ко всему файлу
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Сохранение…</span>
              </>
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
