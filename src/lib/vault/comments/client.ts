import type { NewTodo, Todo } from "./schema";

/** A note as the page sees it: line notes know where their block is now (null = lost). */
export type ClientTodo = Todo & { resolvedLine?: number | null };

/** What the popover form produces; the container adds the doc. */
export type DraftInput = { scope: "file"; text: string } | { scope: "line"; line: number; text: string };

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { cache: "no-store", ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export const fetchTodos = (doc: string): Promise<ClientTodo[]> =>
  request(`/api/vault/comments?doc=${encodeURIComponent(doc)}`);

export async function createTodo(input: NewTodo): Promise<ClientTodo> {
  const todo = await request<Todo>("/api/vault/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  // A note created a moment ago sits exactly on the line it was made on.
  return todo.scope === "line" ? { ...todo, resolvedLine: todo.line } : todo;
}

export async function removeTodo(id: string): Promise<void> {
  await request(`/api/vault/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
