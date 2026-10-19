import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import matter from "gray-matter";
import { VAULT_DIR, vaultImageUrl, isInsideDir } from "@/lib/vault/config";
import { buildIndex } from "@/lib/vault/indexer";

export interface VaultDoc {
  slug: string;
  filePath: string;
  /** Directory of the document relative to the vault root, with forward slashes. */
  dirRel: string;
  frontmatter: Record<string, unknown>;
  content: string;
  /** Raw-file lines cut off before `content` (the frontmatter block). */
  lineOffset: number;
}

/** Number of source lines `gray-matter` removed in front of `content`. */
export function frontmatterLineCount(raw: string, content: string): number {
  if (!raw.endsWith(content)) return 0;
  return raw.slice(0, raw.length - content.length).split("\n").length - 1;
}

async function isFile(p: string): Promise<boolean> {
  try {
    return (await fs.stat(/*turbopackIgnore: true*/ p)).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolves a documentation slug into an absolute path on disk.
 * Handles root fallback ("00_index"), directory index files, and exact .md matches.
 */
export async function resolveDocPath(slug?: string | string[]): Promise<string | null> {
  const slugPath =
    (Array.isArray(slug) ? slug.filter(Boolean).join("/") : (slug ?? "").trim().replace(/^\/+|\/+$/g, "")) ||
    "00_index";

  // Guard against path traversal attacks (e.g. "../../secret")
  if (slugPath.includes("..") || slugPath.includes("\0") || path.isAbsolute(slugPath)) {
    return null;
  }

  const candidates = [
    path.resolve(VAULT_DIR, `${slugPath}.md`),
    path.resolve(VAULT_DIR, slugPath, "00_index.md"),
    path.resolve(VAULT_DIR, slugPath, "index.md"),
  ];
  for (const candidate of candidates) {
    if (!isInsideDir(VAULT_DIR, candidate)) return null;
    if (await isFile(candidate)) return candidate;
  }

  // A directory: prefer the note named after it (`foo/foo.md`), else its first note.
  const dirCandidate = path.resolve(VAULT_DIR, slugPath);
  try {
    if ((await fs.stat(/*turbopackIgnore: true*/ dirCandidate)).isDirectory()) {
      const files = await fs.readdir(/*turbopackIgnore: true*/ dirCandidate);
      const base = path.basename(slugPath);
      const match =
        files.find((f) => f.startsWith(base) && f.endsWith(".md")) ?? files.find((f) => f.endsWith(".md"));
      if (match) return path.resolve(dirCandidate, match);
    }
  } catch {
    // Not a directory.
  }

  // A bare note name, Obsidian-style (e.g. "CAR-C01_volk_meister_r").
  const mappedUrl = (await buildIndex()).fileMap[slugPath];
  if (mappedUrl) {
    const candidate = path.resolve(VAULT_DIR, `${mappedUrl.replace(/^\/docs\//, "")}.md`);
    if (isInsideDir(VAULT_DIR, candidate) && (await isFile(candidate))) return candidate;
  }

  return null;
}

/**
 * Reads and parses a markdown document from the vault with frontmatter. Memoised per
 * request, so `generateMetadata` and the page share one read.
 */
export const readDoc = cache(async function readDoc(slug?: string | string[]): Promise<VaultDoc | null> {
  const filePath = await resolveDocPath(slug);
  if (!filePath) return null;

  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ filePath, "utf-8");
    const { data: frontmatter, content } = matter(raw);
    const relPath = path.relative(VAULT_DIR, filePath).replace(/\\/g, "/");

    return {
      slug: relPath.replace(/\.md$/, ""),
      filePath,
      dirRel: path.posix.dirname(relPath).replace(/^\.$/, ""),
      frontmatter,
      content,
      lineOffset: frontmatterLineCount(raw, content),
    };
  } catch {
    return null;
  }
});

const GALLERY_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export interface VaultImage {
  url: string;
  name: string;
}

/** Images lying next to a document (car concept arts, region references), "front" shots first. */
export async function listDocImages(doc: VaultDoc): Promise<VaultImage[]> {
  let files: string[];
  try {
    files = await fs.readdir(/*turbopackIgnore: true*/ path.dirname(doc.filePath));
  } catch {
    return [];
  }

  const isFront = (name: string) => name.toLowerCase().includes("front");
  return files
    .filter((f) => GALLERY_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => Number(isFront(b)) - Number(isFront(a)) || a.localeCompare(b))
    .map((name) => ({ url: vaultImageUrl(doc.dirRel ? `${doc.dirRel}/${name}` : name), name }));
}
