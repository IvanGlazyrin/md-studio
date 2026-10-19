import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { GET, POST, DELETE } from "../src/app/api/vault/comments/route";
import { anchorOf } from "../src/lib/vault/comments/resolve";
import { readDocSourceLines } from "../src/lib/vault/comments/source";

const url = (query = "") => `http://localhost/api/vault/comments${query}`;
const get = (query: string) => GET(new Request(url(query)));
const del = (query: string) => DELETE(new Request(url(query), { method: "DELETE" }));
const post = (body: unknown) =>
  POST(
    new Request(url(), {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

let dir: string;
let file: string;
let lines: string[];
let textLine: number; // 1-based, a non-blank line of 00_index
let blankLine: number; // 1-based, a blank line of 00_index

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-todos-api-"));
  file = path.join(dir, "doc-todos.json");
  process.env.DOC_TODOS_FILE = file;
  lines = (await readDocSourceLines("00_index"))!;
  textLine = lines.findIndex((l) => l.trim().length > 3) + 1;
  blankLine = lines.findIndex((l) => !l.trim()) + 1;
});

afterEach(async () => {
  delete process.env.DOC_TODOS_FILE;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("POST /api/vault/comments", () => {
  it("creates a file note", async () => {
    const res = await post({ doc: "00_index", scope: "file", text: "Всё переписать" });
    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note).toMatchObject({ doc: "00_index", scope: "file", text: "Всё переписать", status: "open" });
    expect(note.line).toBeUndefined();

    const listed = await (await get("?doc=00_index")).json();
    expect(listed).toHaveLength(1);
    expect("resolvedLine" in listed[0]).toBe(false);
  });

  it("creates a line note and takes the anchor from the real source line", async () => {
    const res = await post({ doc: "00_index", scope: "line", line: textLine, text: "Уточнить" });
    expect(res.status).toBe(201);
    const note = await res.json();
    expect(note).toMatchObject({ scope: "line", line: textLine, anchor: anchorOf(lines[textLine - 1]) });
    // The client cannot forge an anchor.
    const forged = await (
      await post({ doc: "00_index", scope: "line", line: textLine, text: "x", anchor: "forged" })
    ).json();
    expect(forged.anchor).toBe(anchorOf(lines[textLine - 1]));
  });

  it("[RF5] rejects bad input and writes nothing", async () => {
    expect(blankLine).toBeGreaterThan(0);
    const bad: [string, unknown, number][] = [
      ["empty text", { doc: "00_index", scope: "file", text: "" }, 400],
      ["whitespace text", { doc: "00_index", scope: "line", line: textLine, text: "   " }, 400],
      ["line 0", { doc: "00_index", scope: "line", line: 0, text: "x" }, 400],
      ["fractional line", { doc: "00_index", scope: "line", line: 1.5, text: "x" }, 400],
      ["line past EOF", { doc: "00_index", scope: "line", line: lines.length + 5, text: "x" }, 400],
      ["blank line", { doc: "00_index", scope: "line", line: blankLine, text: "x" }, 400],
      ["unknown scope", { doc: "00_index", scope: "word", text: "x" }, 400],
      ["unknown doc", { doc: "no/such_doc", scope: "file", text: "x" }, 404],
      ["path traversal", { doc: "../README", scope: "file", text: "x" }, 404],
      ["directory-style doc", { doc: "00_index/", scope: "file", text: "x" }, 404],
      ["not JSON", "{oops", 400],
    ];
    for (const [label, body, status] of bad) {
      const res = await post(body);
      expect({ label, status: res.status }).toEqual({ label, status });
    }
    await expect(fs.access(file)).rejects.toThrow(); // nothing was ever written
  });
});

describe("GET /api/vault/comments", () => {
  const stored = (over: Record<string, unknown>) => ({
    id: "c_x1",
    doc: "00_index",
    scope: "line",
    line: 1,
    anchor: "",
    text: "t",
    status: "open",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  });

  it("[RF5] requires a known doc", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?doc=no/such_doc")).status).toBe(404);
  });

  it("lists only open notes of the requested doc", async () => {
    await fs.writeFile(
      file,
      JSON.stringify([
        stored({ id: "c_open", scope: "file", line: undefined, anchor: undefined }),
        stored({ id: "c_done", scope: "file", status: "done", line: undefined, anchor: undefined }),
        stored({ id: "c_other", doc: "glossary", scope: "file", line: undefined, anchor: undefined }),
      ])
    );
    const listed = (await (await get("?doc=00_index")).json()) as { id: string }[];
    expect(listed.map((n) => n.id)).toEqual(["c_open"]);
  });

  it("[RF3] relocates a note whose line moved and flags one whose text is gone", async () => {
    const anchor = anchorOf(lines[textLine - 1]);
    await fs.writeFile(
      file,
      JSON.stringify([
        stored({ id: "c_moved", line: textLine + 40, anchor }),
        stored({ id: "c_same", line: textLine, anchor }),
        stored({ id: "c_gone", line: textLine, anchor: "такого текста в файле нет" }),
      ])
    );
    const listed = (await (await get("?doc=00_index")).json()) as { id: string; resolvedLine: number | null }[];
    const byId = Object.fromEntries(listed.map((n) => [n.id, n.resolvedLine]));
    expect(byId.c_same).toBe(textLine);
    // `anchor` may occur earlier than `line`; the nearest occurrence wins, never null.
    expect(byId.c_moved).not.toBeNull();
    expect(anchorOf(lines[byId.c_moved! - 1])).toBe(anchor);
    expect(byId.c_gone).toBeNull();
  });

  it("[RF1] answers 500 with a message and leaves a broken file untouched", async () => {
    const broken = '[ {"id": ';
    await fs.writeFile(file, broken);
    const res = await get("?doc=00_index");
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/not valid JSON/);
    expect((await post({ doc: "00_index", scope: "file", text: "x" })).status).toBe(500);
    expect(await fs.readFile(file, "utf-8")).toBe(broken);
  });
});

describe("DELETE /api/vault/comments", () => {
  it("removes a note and 404s for an unknown id", async () => {
    const created = await (await post({ doc: "00_index", scope: "file", text: "x" })).json();

    expect((await del("")).status).toBe(400);
    expect((await del("?id=c_missing")).status).toBe(404);
    expect((await del(`?id=${created.id}`)).status).toBe(200);
    expect(await (await get("?doc=00_index")).json()).toEqual([]);
  });
});
