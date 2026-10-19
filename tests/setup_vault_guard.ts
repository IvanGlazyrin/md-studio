import { afterAll, beforeAll } from "vitest";
import { execSync } from "child_process";
import path from "path";

/**
 * Guard: the test suite must not modify the vault.
 *
 * The suite reads `vault/` and writes only into temporary folders, but a
 * regression in the write path would silently corrupt the user's Markdown
 * files. This compares the git status of the vault before and after the run.
 */
let initialStatus: string = "";
const vaultPath = path.resolve(import.meta.dirname, "../vault");

function gitStatus(): string {
  try {
    return execSync(`git status --porcelain "${vaultPath}"`, { encoding: "utf-8" }).trim();
  } catch {
    // No git repository here (fresh clone without history) — nothing to compare.
    return "";
  }
}

beforeAll(() => {
  initialStatus = gitStatus();
});

afterAll(() => {
  const finalStatus = gitStatus();
  if (finalStatus !== initialStatus) {
    throw new Error(
      `Tests modified the vault files!\nBefore:\n${initialStatus}\nAfter:\n${finalStatus}`
    );
  }
});
