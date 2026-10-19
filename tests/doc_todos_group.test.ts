import { describe, it, expect } from "vitest";
import { placeTodos } from "../src/lib/vault/comments/group";
import type { ClientTodo } from "../src/lib/vault/comments/client";

const base = { doc: "d", text: "t", status: "open" as const, createdAt: "2026-01-01T00:00:00.000Z" };
const line = (id: string, ln: number, resolvedLine: number | null): ClientTodo => ({
  ...base,
  id,
  scope: "line",
  line: ln,
  anchor: "a",
  resolvedLine,
});
const file = (id: string): ClientTodo => ({ ...base, id, scope: "file" });

describe("placeTodos", () => {
  it("groups line notes by resolved line and sends the rest to the panel", () => {
    const todos = [line("c_1", 5, 5), line("c_2", 5, 8), line("c_3", 9, 8), file("c_4")];
    const { byLine, panel } = placeTodos(todos, () => true);
    expect([...byLine.keys()]).toEqual([5, 8]);
    expect(byLine.get(8)?.map((t) => t.id)).toEqual(["c_2", "c_3"]);
    expect(panel.map((t) => t.id)).toEqual(["c_4"]);
  });

  it("[RF3] sends lost notes (resolvedLine null) to the panel", () => {
    const { byLine, panel } = placeTodos([line("c_1", 5, null)], () => true);
    expect(byLine.size).toBe(0);
    expect(panel.map((t) => t.id)).toEqual(["c_1"]);
  });

  it("[RF3] sends notes whose block is not on the page to the panel", () => {
    const { byLine, panel } = placeTodos([line("c_1", 5, 5), line("c_2", 7, 7)], (n) => n === 7);
    expect([...byLine.keys()]).toEqual([7]);
    expect(panel.map((t) => t.id)).toEqual(["c_1"]);
  });
});
