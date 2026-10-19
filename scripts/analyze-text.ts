import fs from "fs";
import path from "path";

/**
 * Prints the size of the Markdown vault: files, lines, words and bytes per
 * folder. The same folder the studio reads (`DOCS_DIR`, `./vault` by default).
 *
 *   npm run docs:stats
 */
function resolveVaultDir(): string {
  const fromEnv = process.env.DOCS_DIR;
  if (fromEnv) return path.resolve(process.cwd(), fromEnv);
  return path.resolve(process.cwd(), "vault");
}

function countFile(filePath: string) {
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const words = lines.reduce((acc, line) => acc + line.trim().split(/\s+/).filter(Boolean).length, 0);
  return { lines: lines.length, words, bytes: stat.size };
}

function analyze() {
  const root = resolveVaultDir();
  if (!fs.existsSync(root)) {
    console.error(`Vault directory not found at: ${root}`);
    console.error("Set DOCS_DIR to the folder with your Markdown files.");
    process.exit(1);
  }

  const totals = { files: 0, lines: 0, words: 0, bytes: 0 };
  const entries = fs.readdirSync(root, { withFileTypes: true });

  console.log("=".repeat(78));
  console.log(`  MARKDOWN VAULT: ${root}`);
  console.log("=".repeat(78));

  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "assets")
    .map((e) => e.name)
    .sort();

  for (const folder of folders) {
    const folderPath = path.join(root, folder);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith(".md") && !f.startsWith("."))
      .sort();
    if (files.length === 0) continue;

    let lines = 0;
    let words = 0;
    let bytes = 0;
    console.log(`\n=== ${folder} ===`);
    for (const f of files) {
      const stat = countFile(path.join(folderPath, f));
      lines += stat.lines;
      words += stat.words;
      bytes += stat.bytes;
      totals.files++;
      const name = f.length > 42 ? `${f.slice(0, 39)}...` : f.padEnd(42);
      console.log(
        `  ${name} | Lines: ${String(stat.lines).padStart(4)} | Words: ${String(stat.words).padStart(5)} | Size: ${String(stat.bytes).padStart(6)} B`
      );
    }
    totals.lines += lines;
    totals.words += words;
    totals.bytes += bytes;
    console.log(
      `  --> Total: ${files.length} files | Lines: ${lines} | Words: ${words} | Size: ${(bytes / 1024).toFixed(1)} KB`
    );
  }

  const rootFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name).sort();
  if (rootFiles.length > 0) {
    console.log("\n=== ROOT ===");
    for (const f of rootFiles) {
      const stat = countFile(path.join(root, f));
      totals.files++;
      totals.lines += stat.lines;
      totals.words += stat.words;
      totals.bytes += stat.bytes;
      const name = f.length > 42 ? `${f.slice(0, 39)}...` : f.padEnd(42);
      console.log(
        `  ${name} | Lines: ${String(stat.lines).padStart(4)} | Words: ${String(stat.words).padStart(5)} | Size: ${String(stat.bytes).padStart(6)} B`
      );
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log(
    `  TOTAL: ${totals.files} files | ${totals.lines} lines | ${totals.words} words | ${(totals.bytes / 1024).toFixed(1)} KB`
  );
  console.log("=".repeat(78) + "\n");
}

analyze();
