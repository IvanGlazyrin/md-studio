import fs from "fs/promises";
import { readDoc } from "@/lib/vault/reader";

/**
 * Raw lines (frontmatter included) of the vault note whose slug is exactly
 * `doc`, or null. Exactness matters: `readDoc` also resolves directories and
 * bare note names, but notes are keyed by the canonical slug only.
 */
export async function readDocSourceLines(doc: string): Promise<string[] | null> {
  const note = await readDoc(doc.split("/").filter(Boolean));
  if (!note || note.slug !== doc) return null;
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ note.filePath, "utf-8");
    return raw.split(/\r?\n/);
  } catch {
    return null;
  }
}
