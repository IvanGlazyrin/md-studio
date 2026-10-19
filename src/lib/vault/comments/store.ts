import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { TodoListSchema, TodoSchema, type Todo, type TodoDraft } from "./schema";

/**
 * `$DOC_TODOS_FILE` wins (tests, odd setups); otherwise `data/doc-todos.json`
 * next to the project.
 * Read per call so tests can switch it.
 */
function defaultTodosFile(): string {
  if (process.env.DOC_TODOS_FILE) return path.resolve(process.env.DOC_TODOS_FILE);
  return path.join(path.resolve(process.cwd(), "data"), "doc-todos.json");
}

/** Reads the notes. Missing/empty file = no notes; broken content throws and is never "healed". */
export async function readTodos(file = defaultTodosFile()): Promise<Todo[]> {
  const name = path.basename(file);
  let raw: string;
  try {
    raw = await fs.readFile(/*turbopackIgnore: true*/ file, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  if (!raw.trim()) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${name} is not valid JSON: ${(err as Error).message}`);
  }
  const parsed = TodoListSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${name}: invalid item at ${issue.path.join(".")} (${issue.message})`);
  }
  return parsed.data;
}

function byDocThenLine(a: Todo, b: Todo): number {
  if (a.doc !== b.doc) return a.doc < b.doc ? -1 : 1;
  const la = a.scope === "line" ? a.line : 0;
  const lb = b.scope === "line" ? b.line : 0;
  if (la !== lb) return la - lb;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

async function writeTodos(file: string, todos: Todo[]): Promise<void> {
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(/*turbopackIgnore: true*/ tmp, `${JSON.stringify([...todos].sort(byDocThenLine), null, 2)}\n`, "utf-8");
  await fs.rename(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ file);
}

// Read-modify-write cycles of one file run one after another; a failed cycle must not block the next.
const queues = new Map<string, Promise<unknown>>();
function serialized<T>(file: string, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(file) ?? Promise.resolve()).then(task);
  queues.set(file, run.catch(() => undefined));
  return run;
}

export function addTodo(draft: TodoDraft, file = defaultTodosFile()): Promise<Todo> {
  return serialized(file, async () => {
    const todos = await readTodos(file);
    const todo = TodoSchema.parse({
      ...draft,
      id: `c_${randomBytes(4).toString("hex")}`,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    await writeTodos(file, [...todos, todo]);
    return todo;
  });
}

/** Removes a note of any status. Returns false (and writes nothing) if the id is unknown. */
export function deleteTodo(id: string, file = defaultTodosFile()): Promise<boolean> {
  return serialized(file, async () => {
    const todos = await readTodos(file);
    const rest = todos.filter((t) => t.id !== id);
    if (rest.length === todos.length) return false;
    await writeTodos(file, rest);
    return true;
  });
}
