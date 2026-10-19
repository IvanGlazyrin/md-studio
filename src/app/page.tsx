import Link from "next/link";
import path from "path";
import { VAULT_DIR } from "@/lib/vault/config";

export default function HomePage() {
  const vaultName = path.basename(VAULT_DIR) || VAULT_DIR;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl rounded-2xl border border-primary/25 bg-card/80 p-10 shadow-2xl backdrop-blur-md">
        <div className="mb-4 text-6xl">📚</div>
        <h1 className="mb-2 font-mono text-4xl font-bold tracking-wider text-primary">MD Studio</h1>
        <p className="mb-8 text-sm tracking-wide text-muted-foreground">
          Читалка Markdown-хранилища: вики-ссылки, поиск, callout-ы и TODO
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/docs"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/85"
          >
            📖 Открыть документацию
          </Link>
        </div>
        <p className="mt-8 font-mono text-xs text-muted-foreground">
          Читается папка <span className="text-foreground">{vaultName}</span> — путь задаётся
          переменной окружения <code className="text-foreground">DOCS_DIR</code>.
        </p>
      </div>
    </main>
  );
}
