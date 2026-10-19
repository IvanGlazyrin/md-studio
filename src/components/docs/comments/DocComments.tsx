"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTodo, fetchTodos, removeTodo, type ClientTodo, type DraftInput } from "@/lib/vault/comments/client";
import { placeTodos } from "@/lib/vault/comments/group";
import { CommentPopover } from "./CommentPopover";
import { FileNotesPanel } from "./FileNotesPanel";

interface Box {
  top: number;
  height: number;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Review layer over a rendered note: a gutter "+" follows the block under
 * the cursor (or the text caret), blocks with open notes keep a count badge,
 * and a popover holds the notes and the form. Notes are loaded client-side
 * because the page itself is statically prerendered.
 */
export function DocComments({ doc, children }: { doc: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [todos, setTodos] = useState<ClientTodo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [popoverLine, setPopoverLine] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<Map<number, Box>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    fetchTodos(doc)
      .then((list) => !cancelled && setTodos(list))
      .catch((err) => !cancelled && setError(`Не удалось загрузить заметки: ${message(err)}`));
    return () => {
      cancelled = true;
    };
  }, [doc]);

  // Which block follows the pointer / caret. The last one stays until another is hit,
  // so moving the mouse into the gutter does not lose the "+".
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pick = (node: Node | null) => {
      const el = node instanceof Element ? node : (node?.parentElement ?? null);
      const block = el?.closest<HTMLElement>("[data-line]");
      if (block && root.contains(block)) setActiveLine(Number(block.dataset.line));
    };
    const onOver = (event: MouseEvent) => pick(event.target as Node);
    const onSelection = () => pick(document.getSelection()?.anchorNode ?? null);
    root.addEventListener("mouseover", onOver);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      root.removeEventListener("mouseover", onOver);
      document.removeEventListener("selectionchange", onSelection);
    };
  }, []);

  // Lines whose block position we need: every note's block, the hovered one, the open popover's.
  const wantedLines = useMemo(() => {
    const lines = new Set<number>();
    for (const t of todos) if (t.scope === "line" && typeof t.resolvedLine === "number") lines.add(t.resolvedLine);
    if (activeLine !== null) lines.add(activeLine);
    if (popoverLine !== null) lines.add(popoverLine);
    return [...lines];
  }, [todos, activeLine, popoverLine]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top;
    const next = new Map<number, Box>();
    for (const line of wantedLines) {
      const el = root.querySelector<HTMLElement>(`[data-line="${line}"]`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      next.set(line, { top: rect.top - rootTop, height: rect.height });
    }
    setBoxes(next);
  }, [wantedLines]);

  useLayoutEffect(() => measure(), [measure]);

  // Images and diagrams change block positions after load.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const { byLine, panel } = useMemo(() => placeTodos(todos, (line) => boxes.has(line)), [todos, boxes]);

  const gutterLines = useMemo(() => {
    const lines = new Set(byLine.keys());
    if (activeLine !== null && boxes.has(activeLine)) lines.add(activeLine);
    return [...lines];
  }, [byLine, activeLine, boxes]);

  const handleCreate = useCallback(
    async (input: DraftInput) => {
      const created = await createTodo({ ...input, doc });
      setTodos((prev) => [...prev, created]);
      setError(null);
    },
    [doc]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Удалить заметку?")) return;
    try {
      await removeTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setError(null);
    } catch (err) {
      setError(`Не удалось удалить заметку: ${message(err)}`);
    }
  }, []);

  const popoverBox = popoverLine !== null ? boxes.get(popoverLine) : undefined;

  return (
    <>
      <FileNotesPanel todos={panel} error={error} onDelete={handleDelete} />
      <div ref={rootRef} className="relative">
        {children}

        {gutterLines.map((line) => {
          const box = boxes.get(line);
          if (!box) return null;
          const count = byLine.get(line)?.length ?? 0;
          return (
            <button
              key={line}
              type="button"
              style={{ top: box.top + 2 }}
              onClick={() => setPopoverLine(line)}
              aria-label={count > 0 ? `Заметки к строке ${line}: ${count}` : `Добавить заметку к строке ${line}`}
              className={cn(
                "absolute -left-9 flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-md border px-1 font-mono text-[11px] transition",
                count > 0
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border bg-card text-muted-foreground hover:text-primary"
              )}
            >
              {count > 0 ? (
                <>
                  <MessageSquare className="size-3" aria-hidden="true" />
                  {count}
                </>
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
            </button>
          );
        })}

        {popoverLine !== null && popoverBox && (
          <CommentPopover
            key={popoverLine}
            line={popoverLine}
            top={popoverBox.top + popoverBox.height + 6}
            notes={byLine.get(popoverLine) ?? []}
            onClose={() => setPopoverLine(null)}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </>
  );
}
