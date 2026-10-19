export const ANCHOR_MAX = 120;

/** The text a note is anchored to: the source line, trimmed and capped. */
export function anchorOf(sourceLine: string): string {
  return sourceLine.trim().slice(0, ANCHOR_MAX);
}

/**
 * Where a note's block is now. The same line if its text still matches,
 * otherwise the closest line (smaller on a tie) with the same text, otherwise
 * null — the file was edited and the block is gone.
 */
export function resolveLine(
  sourceLines: readonly string[],
  todo: { line: number; anchor: string }
): number | null {
  const { line, anchor } = todo;
  const at = (n: number) => anchorOf(sourceLines[n - 1] ?? "");

  if (line >= 1 && line <= sourceLines.length && at(line) === anchor) return line;
  if (anchor === "") return null;

  let best: number | null = null;
  for (let n = 1; n <= sourceLines.length; n++) {
    if (at(n) !== anchor) continue;
    if (best === null || Math.abs(n - line) < Math.abs(best - line)) best = n;
  }
  return best;
}
