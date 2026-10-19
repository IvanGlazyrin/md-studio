import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import matter from "gray-matter";
import { VAULT_DIR, docUrl } from "@/lib/vault/config";

export interface NavItem {
  title: string;
  url: string;
}

export interface NavGroup {
  title: string;
  items?: NavItem[];
  groups?: NavGroup[];
}

export interface NavSection extends NavGroup {
  items: NavItem[];
}

// The sidebar is generated from the vault: its folders are the sections, its
// subfolders are the groups, and the notes are the items. Labels and order of
// the pages come from their frontmatter (`nav_title`, falling back to `title`;
// `nav_order`, falling back to the file name). Nothing about the folder
// structure is hardcoded — point `DOCS_DIR` at any tree of Markdown files.

/** Folders holding assets, not documentation pages. */
const EXCLUDED_DIRS = new Set(["assets", "node_modules", ".obsidian"]);

/** "01_getting_started" → "01 · Getting started". */
function humanize(dirName: string): string {
  const numbered = dirName.match(/^(\d+)[_\s-]+(.*)$/);
  const name = (numbered ? numbered[2] : dirName).replace(/[_-]+/g, " ").trim();
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  return numbered ? `${numbered[1]} · ${title}` : title;
}

interface Entry extends NavItem {
  order: number;
  file: string;
}

async function readEntry(relPath: string): Promise<Entry> {
  const { data } = matter(await fs.readFile(path.join(VAULT_DIR, relPath), "utf-8"));
  const slug = relPath.replace(/\.md$/, "");
  return {
    title: String(data.nav_title ?? data.title ?? path.posix.basename(slug)),
    url: docUrl(slug),
    order: typeof data.nav_order === "number" ? data.nav_order : Number.POSITIVE_INFINITY,
    file: path.posix.basename(relPath),
  };
}

const byOrderThenFile = (a: Entry, b: Entry) => a.order - b.order || a.file.localeCompare(b.file);

type KeyedGroup = NavGroup & { key: string };

const stripKeys = (groups: KeyedGroup[]): NavGroup[] => groups.map(({ key: _key, ...group }) => group);

/** Collects the notes of `dirRel`; subfolders become groups. */
async function collect(dirRel: string): Promise<{ entries: Entry[]; groups: KeyedGroup[] }> {
  const dirents = await fs.readdir(path.join(VAULT_DIR, dirRel), { withFileTypes: true });
  const entries: Entry[] = [];
  const groups: KeyedGroup[] = [];

  for (const dirent of dirents) {
    if (dirent.name.startsWith(".")) continue;
    const rel = path.posix.join(dirRel, dirent.name);

    if (dirent.isFile() && dirent.name.endsWith(".md")) {
      entries.push(await readEntry(rel));
    } else if (dirent.isDirectory() && !EXCLUDED_DIRS.has(rel)) {
      const inner = await collect(rel);
      const label = humanize(dirent.name);
      groups.push({
        key: dirent.name,
        title: label,
        items: toItems(inner.entries),
        groups: stripKeys(inner.groups),
      });
    }
  }

  return { entries, groups };
}

function toItems(entries: Entry[]): NavItem[] {
  return [...entries].sort(byOrderThenFile).map(({ title, url }) => ({ title, url }));
}

/** The docs sidebar tree, built from the vault once per request. */
export const buildNav = cache(async function buildNav(): Promise<NavSection[]> {
  const dirents = await fs.readdir(VAULT_DIR, { withFileTypes: true });
  const rootNotes: Entry[] = [];
  const folders: string[] = [];

  for (const dirent of dirents) {
    if (dirent.name.startsWith(".")) continue;
    if (dirent.isFile() && dirent.name.endsWith(".md")) {
      rootNotes.push(await readEntry(dirent.name));
    } else if (dirent.isDirectory() && !EXCLUDED_DIRS.has(dirent.name)) {
      folders.push(dirent.name);
    }
  }

  const sections: NavSection[] = [];
  if (rootNotes.length > 0) {
    sections.push({ title: "Заметки", items: toItems(rootNotes) });
  }

  for (const folder of folders.sort()) {
    const { entries, groups } = await collect(folder);
    const section: NavSection = { title: humanize(folder), items: toItems(entries) };
    sections.push(groups.length > 0 ? { ...section, groups: stripKeys(groups) } : section);
  }

  return sections;
});
