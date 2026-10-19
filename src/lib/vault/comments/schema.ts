import { z } from "zod";

const common = {
  id: z.string().regex(/^c_[a-z0-9]+$/),
  doc: z.string().min(1),
  text: z.string().trim().min(1).max(4000),
  status: z.enum(["open", "done"]),
  createdAt: z.string().min(1),
};

// Loose objects: fields added by hand to the JSON survive a rewrite.
const LineTodoSchema = z.looseObject({
  ...common,
  scope: z.literal("line"),
  line: z.number().int().min(1),
  anchor: z.string(),
});
const FileTodoSchema = z.looseObject({ ...common, scope: z.literal("file") });

export const TodoSchema = z.discriminatedUnion("scope", [LineTodoSchema, FileTodoSchema]);
export const TodoListSchema = z.array(TodoSchema);

export type Todo = z.infer<typeof TodoSchema>;

/** What the client may send; the server fills in `anchor`, `id`, `status`, `createdAt`. */
const noteText = z.string().trim().min(1).max(4000);
export const NewTodoSchema = z.discriminatedUnion("scope", [
  z.object({ doc: z.string().min(1), scope: z.literal("line"), line: z.number().int().min(1), text: noteText }),
  z.object({ doc: z.string().min(1), scope: z.literal("file"), text: noteText }),
]);
export type NewTodo = z.infer<typeof NewTodoSchema>;

/** A note before the store assigns `id`, `status` and `createdAt`. */
export type TodoDraft =
  | { doc: string; text: string; scope: "file" }
  | { doc: string; text: string; scope: "line"; line: number; anchor: string };
