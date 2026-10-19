import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { NewTodoSchema } from "@/lib/vault/comments/schema";
import { addTodo, deleteTodo, readTodos } from "@/lib/vault/comments/store";
import { anchorOf, resolveLine } from "@/lib/vault/comments/resolve";
import { readDocSourceLines } from "@/lib/vault/comments/source";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Open notes of one doc; line notes carry `resolvedLine` (null = the block is gone). */
export async function GET(req: Request) {
  try {
    const doc = new URL(req.url).searchParams.get("doc");
    if (!doc) return fail("Missing ?doc=", 400);
    const lines = await readDocSourceLines(doc);
    if (!lines) return fail(`Unknown doc: ${doc}`, 404);

    const open = (await readTodos()).filter((t) => t.doc === doc && t.status === "open");
    return NextResponse.json(
      open.map((t) => (t.scope === "line" ? { ...t, resolvedLine: resolveLine(lines, t) } : t))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const input = NewTodoSchema.parse(await req.json());
    const lines = await readDocSourceLines(input.doc);
    if (!lines) return fail(`Unknown doc: ${input.doc}`, 404);

    if (input.scope === "file") {
      return NextResponse.json(await addTodo(input), { status: 201 });
    }
    if (input.line > lines.length) return fail("Line is outside the file", 400);
    const anchor = anchorOf(lines[input.line - 1]);
    if (!anchor) return fail("Line is blank", 400);
    return NextResponse.json(await addTodo({ ...input, anchor }), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("Missing ?id=", 400);
    if (!(await deleteTodo(id))) return fail(`Unknown note: ${id}`, 404);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
