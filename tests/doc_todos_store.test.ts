import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { addTodo, deleteTodo, readTodos } from "../src/lib/vault/comments/store";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-todos-"));
  file = path.join(dir, "doc-todos.json");
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const lineDraft = (over: Partial<{ doc: string; line: number; anchor: string; text: string }> = {}) => ({
  doc: "03_cars/a",
  scope: "line" as const,
  line: 10,
  anchor: "Строка десять",
  text: "Проверить",
  ...over,
});

describe("doc todos store", () => {
  it("reads a missing file as an empty list", async () => {
    expect(await readTodos(file)).toEqual([]);
  });

  it("reads an empty file as an empty list", async () => {
    await fs.writeFile(file, "  \n");
    expect(await readTodos(file)).toEqual([]);
  });

  it("adds line and file notes as open and reads them back", async () => {
    const a = await addTodo(lineDraft(), file);
    const b = await addTodo({ doc: "03_cars/a", scope: "file", text: "Переписать всё" }, file);

    expect(a).toMatchObject({ scope: "line", line: 10, anchor: "Строка десять", status: "open" });
    expect(a.id).toMatch(/^c_[a-z0-9]+$/);
    expect(Number.isNaN(Date.parse(a.createdAt))).toBe(false);
    // file-scope notes sort before line notes of the same doc
    expect(await readTodos(file)).toEqual([b, a]);
  });

  it("writes a pretty-printed array sorted by doc, then line", async () => {
    await addTodo(lineDraft({ doc: "b/x", line: 5 }), file);
    await addTodo(lineDraft({ doc: "a/y", line: 9 }), file);
    await addTodo(lineDraft({ doc: "a/y", line: 2 }), file);

    const raw = await fs.readFile(file, "utf-8");
    expect(raw).toContain('\n  {\n    "id"');
    expect(raw.endsWith("]\n")).toBe(true);
    const order = JSON.parse(raw).map((t: { doc: string; line: number }) => `${t.doc}:${t.line}`);
    expect(order).toEqual(["a/y:2", "a/y:9", "b/x:5"]);
  });

  it("trims text and round-trips Cyrillic, quotes and newlines", async () => {
    const text = 'Цитата "ёлка" \\ слэш\nвторая строка';
    const added = await addTodo(lineDraft({ text: `  ${text}  ` }), file);
    expect(added.text).toBe(text);
    expect((await readTodos(file))[0].text).toBe(text);
  });

  it("rejects whitespace-only text", async () => {
    await expect(addTodo(lineDraft({ text: "   " }), file)).rejects.toThrow();
    expect(await readTodos(file)).toEqual([]);
  });

  it("keeps fields it does not know about when rewriting", async () => {
    await fs.writeFile(
      file,
      JSON.stringify([
        { id: "c_old1", doc: "x/y", scope: "file", text: "t", status: "open", createdAt: "2026-01-01T00:00:00.000Z", priority: "high" },
      ])
    );
    await addTodo(lineDraft(), file);
    const saved = JSON.parse(await fs.readFile(file, "utf-8")) as { id: string; priority?: string }[];
    expect(saved.find((t) => t.id === "c_old1")?.priority).toBe("high");
  });

  it("[RF2] keeps every note when many are added concurrently", async () => {
    const created = await Promise.all(
      Array.from({ length: 25 }, (_, i) => addTodo(lineDraft({ line: i + 1 }), file))
    );
    const stored = await readTodos(file);
    expect(created).toHaveLength(25);
    expect(stored).toHaveLength(25);
    expect(new Set(stored.map((t) => t.id)).size).toBe(25);
  });

  it("[RF1] never overwrites a file that is not valid JSON", async () => {
    const broken = '[ { "id": "c_1", ';
    await fs.writeFile(file, broken);

    await expect(readTodos(file)).rejects.toThrow(/not valid JSON/);
    await expect(addTodo(lineDraft(), file)).rejects.toThrow(/not valid JSON/);
    await expect(deleteTodo("c_1", file)).rejects.toThrow(/not valid JSON/);
    expect(await fs.readFile(file, "utf-8")).toBe(broken);
  });

  it("[RF1] reports which item is invalid and leaves the file alone", async () => {
    const bad = JSON.stringify([{ id: "c_1", doc: "x", scope: "file", status: "open", createdAt: "t" }]);
    await fs.writeFile(file, bad);

    await expect(readTodos(file)).rejects.toThrow(/invalid item at 0\.text/);
    await expect(addTodo(lineDraft(), file)).rejects.toThrow(/invalid item at 0\.text/);
    expect(await fs.readFile(file, "utf-8")).toBe(bad);
  });

  it("deletes by id and reports whether it removed anything", async () => {
    const a = await addTodo(lineDraft(), file);
    const b = await addTodo(lineDraft({ line: 20 }), file);

    expect(await deleteTodo(a.id, file)).toBe(true);
    expect(await readTodos(file)).toEqual([b]);

    const before = await fs.readFile(file, "utf-8");
    expect(await deleteTodo("c_missing", file)).toBe(false);
    expect(await fs.readFile(file, "utf-8")).toBe(before);
  });
});
