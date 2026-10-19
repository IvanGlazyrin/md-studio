import { describe, it, expect } from "vitest";
import { anchorOf, resolveLine } from "../src/lib/vault/comments/resolve";
import { readDocSourceLines } from "../src/lib/vault/comments/source";

const doc = ["# Title", "", "Alpha paragraph.", "", "- item one", "- item two", "", "Omega paragraph."];

describe("anchorOf", () => {
  it("trims and keeps at most 120 characters", () => {
    expect(anchorOf("   - item  \t")).toBe("- item");
    expect(anchorOf("x".repeat(300))).toHaveLength(120);
    expect(anchorOf("")).toBe("");
  });
});

describe("resolveLine", () => {
  it("keeps the line when its text still matches", () => {
    expect(resolveLine(doc, { line: 3, anchor: "Alpha paragraph." })).toBe(3);
  });

  it("[RF3] follows the text when lines were inserted above", () => {
    const edited = ["intro", "more intro", "extra", ...doc];
    expect(resolveLine(edited, { line: 3, anchor: "Alpha paragraph." })).toBe(6);
  });

  it("[RF3] follows the text when lines were removed above", () => {
    const edited = doc.slice(2); // drops "# Title" and the blank line
    expect(resolveLine(edited, { line: 3, anchor: "Alpha paragraph." })).toBe(1);
  });

  it("[RF3] picks the nearest of several identical lines", () => {
    const lines = ["- todo", "x", "x", "x", "- todo", "x", "x", "x", "x", "x", "- todo"];
    expect(resolveLine(lines, { line: 6, anchor: "- todo" })).toBe(5);
    expect(resolveLine(lines, { line: 9, anchor: "- todo" })).toBe(11);
  });

  it("[RF3] prefers the smaller line on an exact tie", () => {
    const lines = ["- todo", "x", "- todo"];
    expect(resolveLine(lines, { line: 2, anchor: "- todo" })).toBe(1);
  });

  it("[RF3] gives up (null) when the text is gone", () => {
    expect(resolveLine(doc, { line: 3, anchor: "Deleted paragraph." })).toBeNull();
  });

  it("[RF3] gives up when the line is past the end and the text is gone", () => {
    expect(resolveLine(doc, { line: 99, anchor: "Alpha paragraph.x" })).toBeNull();
  });

  it("does not match a blank anchor anywhere but its own line", () => {
    expect(resolveLine(doc, { line: 2, anchor: "" })).toBe(2);
    expect(resolveLine(doc, { line: 3, anchor: "" })).toBeNull();
    expect(resolveLine(doc, { line: 99, anchor: "" })).toBeNull();
  });

  it("matches long lines by their 120-character anchor", () => {
    const long = `${"a".repeat(150)}`;
    const lines = ["pad", long];
    expect(resolveLine(lines, { line: 1, anchor: anchorOf(long) })).toBe(2);
  });
});

describe("readDocSourceLines", () => {
  it("returns the raw lines of a vault note, frontmatter included", async () => {
    const lines = await readDocSourceLines("00_index");
    expect(lines).not.toBeNull();
    expect(lines!.length).toBeGreaterThan(1);
  });

  it("[RF5] only accepts the canonical slug of an existing note", async () => {
    expect(await readDocSourceLines("")).toBeNull();
    expect(await readDocSourceLines("no/such_note")).toBeNull();
    expect(await readDocSourceLines("../README")).toBeNull();
    expect(await readDocSourceLines("00_index/")).toBeNull();
  });
});
