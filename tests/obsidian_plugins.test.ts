import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Blockquote, Root } from "mdast";
import { remarkObsidianCallouts } from "../src/lib/vault/plugins/remark-obsidian-callouts";
import { buildIndex } from "../src/lib/vault/indexer";
import { readDoc } from "../src/lib/vault/reader";

/** Runs the callout plugin and returns the hProperties of the first blockquote. */
async function calloutProps(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkObsidianCallouts);
  const tree = (await processor.run(processor.parse(markdown))) as Root;
  const quote = tree.children.find((n): n is Blockquote => n.type === "blockquote");
  return { props: quote?.data?.hProperties, quote };
}

describe("remarkObsidianCallouts", () => {
  it("turns > [!NOTE] Title into callout attributes and strips the marker", async () => {
    const { props, quote } = await calloutProps("> [!NOTE] Важная инфа\n> Обратите внимание.");
    expect(props).toMatchObject({
      className: ["callout", "callout-note"],
      "data-callout-type": "note",
      "data-callout-title": "Важная инфа",
    });
    const text = JSON.stringify(quote);
    expect(text).not.toContain("[!NOTE]");
    expect(text).toContain("Обратите внимание.");
  });

  it("recognizes lowercase callouts and falls back to the type as title", async () => {
    expect((await calloutProps("> [!tip] Маленький совет\n> Текст.")).props).toMatchObject({
      "data-callout-type": "tip",
      "data-callout-title": "Маленький совет",
    });
    expect((await calloutProps("> [!note]\n> Нижний регистр.")).props).toMatchObject({
      "data-callout-type": "note",
      "data-callout-title": "note",
    });
  });

  it("leaves standard blockquotes unchanged", async () => {
    expect((await calloutProps("> Обычная цитата без коллаута.")).props).toBeUndefined();
  });
});

describe("Vault index and reader", () => {
  it("indexes files from the vault", async () => {
    const index = await buildIndex();
    expect(index.allPages.length).toBeGreaterThan(0);
    expect(index.fileMap["00_index"]).toBeDefined();
  });

  it("reads and parses a vault document", async () => {
    const doc = await readDoc("00_index");
    expect(doc).not.toBeNull();
    expect(doc?.content).toBeDefined();
    expect(doc?.dirRel).toBe("");
  });

  it("reports the document directory relative to the vault", async () => {
    const doc = await readDoc("01_getting_started/01_install");
    expect(doc?.dirRel).toBe("01_getting_started");
  });

  it("returns null when reading non-existent doc", async () => {
    expect(await readDoc("non_existent_file_xyz_123")).toBeNull();
  });

  it("safely blocks path traversal attempts", async () => {
    expect(await readDoc("../../package.json")).toBeNull();
    expect(await readDoc("../../../etc/passwd")).toBeNull();
    expect(await readDoc(["..", "..", "web", "package.json"])).toBeNull();
    expect(await readDoc("/etc/passwd")).toBeNull();
  });
});
