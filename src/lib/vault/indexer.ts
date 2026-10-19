import fs from "fs/promises";
import path from "path";
import { cache } from "react";
import { VAULT_DIR, docUrl } from "@/lib/vault/config";

export interface PageInfo {
  title: string;
  url: string;
  category: string;
}

export interface VaultIndex {
  fileMap: Record<string, string>; // e.g. "01_regions" -> "/docs/01_world/01_regions"
  allPages: PageInfo[];
}

export const buildIndex = cache(async function buildIndex(customDir?: string): Promise<VaultIndex> {
  const baseDir = customDir || VAULT_DIR;
  const fileMap: Record<string, string> = {};
  const allPages: PageInfo[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(fullPath);
      } else if (ent.name.endsWith(".md")) {
        const baseName = ent.name.replace(/\.md$/, "");
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        const urlSlug = docUrl(relPath.replace(/\.md$/, ""));

        fileMap[baseName] = urlSlug;
        fileMap[relPath.replace(/\.md$/, "")] = urlSlug;

        const parts = relPath.split("/");
        const category = parts.length > 1 ? parts[0] : "Общее";
        allPages.push({ title: baseName, url: urlSlug, category });
      }
    }
  }

  try {
    await walk(baseDir);
  } catch {
    // If directory cannot be read, return empty index gracefully
  }

  return { fileMap, allPages };
});
