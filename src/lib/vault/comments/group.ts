import type { ClientTodo } from "./client";

/**
 * Splits notes into those drawn next to a block (`byLine`, keyed by the line
 * the block starts on) and those listed in the top panel: file notes, lost
 * notes, and notes whose block has no element on the page.
 */
export function placeTodos(
  todos: readonly ClientTodo[],
  hasBlock: (line: number) => boolean
): { byLine: Map<number, ClientTodo[]>; panel: ClientTodo[] } {
  const byLine = new Map<number, ClientTodo[]>();
  const panel: ClientTodo[] = [];
  for (const todo of todos) {
    const line = todo.scope === "line" ? todo.resolvedLine : null;
    if (typeof line === "number" && hasBlock(line)) {
      const list = byLine.get(line);
      if (list) list.push(todo);
      else byLine.set(line, [todo]);
    } else {
      panel.push(todo);
    }
  }
  return { byLine, panel };
}
