import React from "react";
import Link from "next/link";
import path from "path";
import { buildIndex } from "@/lib/vault/indexer";
import { buildNav, type NavSection } from "@/lib/vault/navigation";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { DocsNavProvider, DocsNavTrigger, DocsSidebar } from "@/components/docs/DocsNav";
import { VAULT_DIR } from "@/lib/vault/config";
import type { SearchDoc } from "@/lib/vault/search";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  let searchDocs: SearchDoc[] = [];
  let nav: NavSection[] = [];
  try {
    const [index, navSections] = await Promise.all([buildIndex(), buildNav()]);
    nav = navSections;
    searchDocs = index.allPages.map((p) => ({
      id: p.url,
      title: p.title,
      body: `${p.title} ${p.category}`,
      url: p.url,
      category: p.category,
    }));
  } catch {
    // Graceful fallback if index cannot be built
  }

  // Which folder is mounted right now — the studio reads `DOCS_DIR`, and the
  // header says so instead of leaving the user guessing.
  const vaultName = path.basename(VAULT_DIR) || VAULT_DIR;

  return (
    <DocsNavProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
          <div className="flex min-w-0 items-center">
            <DocsNavTrigger />
            <Link
              href="/"
              className="flex items-center gap-2 truncate font-mono font-bold text-primary"
            >
              <span aria-hidden="true">📚</span>
              <span className="truncate">MD STUDIO</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span
              className="hidden max-w-[16rem] truncate font-mono text-xs text-muted-foreground sm:inline"
              title={VAULT_DIR}
            >
              📁 {vaultName}
            </span>
            <DocsSearch documents={searchDocs} />
          </div>
        </header>
        <div className="flex flex-1">
          <DocsSidebar sections={nav} />
          {children}
        </div>
      </div>
    </DocsNavProvider>
  );
}
