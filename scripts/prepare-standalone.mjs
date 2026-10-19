/**
 * Prepares the Next.js standalone bundle for packaging.
 *
 * `next build` writes a self-contained server to `.next/standalone`, but it
 * leaves out the static assets and the `public` folder — they are copied by
 * the deployment step of a normal host. The desktop build needs them inside
 * the bundle, because the server runs from there.
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("No .next/standalone — run `next build` first.");
  process.exit(1);
}

/** Copies a directory recursively, skipping when the source is missing. */
function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    console.log(`skip ${path.relative(root, from)} — not found`);
    return;
  }
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true, dereference: true });
  console.log(`${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copyDir(path.join(root, "public"), path.join(standalone, "public"));

console.log("standalone bundle is ready");
