import fsSync from "fs";
import path from "path";

/**
 * Resolves the Markdown vault the studio reads.
 *
 * `DOCS_DIR` wins: an absolute path, or one relative to the working directory.
 * That is how a user points the studio at their own folder of Markdown files —
 * `DOCS_DIR=../my-notes npm run dev`. Without it the bundled demo vault
 * (`./vault`) is used, so the app always has something to render.
 */
function resolveVaultDir(): string {
  const fromEnv = process.env.DOCS_DIR;
  if (fromEnv) return path.resolve(/*turbopackIgnore: true*/ process.cwd(), fromEnv);

  const demo = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "vault");
  if (fsSync.existsSync(demo)) return demo;
  return demo;
}

/** Single source of truth for the vault directory path. */
export const VAULT_DIR = resolveVaultDir();

/** True when `target` is `base` itself or lies inside it (path-traversal guard). */
export function isInsideDir(base: string, target: string): boolean {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** URL of a vault file (path relative to the vault root) served by /api/vault/image. */
export function vaultImageUrl(relPath: string): string {
  return `/api/vault/image?file=${encodeURIComponent(relPath)}`;
}

/** Canonical docs URL of a vault note (path without `.md`); the vault index is `/docs`. */
export function docUrl(slug: string): string {
  return slug === "00_index" ? "/docs" : `/docs/${slug}`;
}
