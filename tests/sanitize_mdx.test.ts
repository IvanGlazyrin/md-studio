import { describe, it, expect } from "vitest";
import { sanitizeMdxSource } from "../src/lib/vault/sanitize-mdx";

const index = {
  fileMap: {
    "REG-07_mist_ridges": "/docs/01_world/regions/REG-07_mist_ridges",
    "02_physics": "/docs/02_physics/02_physics-and-driving",
  },
};

describe("sanitizeMdxSource — wikilinks", () => {
  it("resolves a plain-pipe wikilink through the index", () => {
    const out = sanitizeMdxSource("См. [[02_physics|Физика]].", index);
    expect(out).toBe("См. [Физика](/docs/02_physics/02_physics-and-driving).");
  });

  it("resolves a wikilink whose pipe is escaped for a markdown table", () => {
    // Obsidian escapes the alias separator inside tables so it is not read as
    // a cell boundary. The backslash must not leak into the resolved URL.
    const out = sanitizeMdxSource(
      "[[REG-07_mist_ridges\\|REG-07: Туманные Кряжи]]",
      index
    );
    expect(out).toBe(
      "[REG-07: Туманные Кряжи](/docs/01_world/regions/REG-07_mist_ridges)"
    );
    expect(out).not.toContain("\\");
  });

  it("keeps an escaped-pipe wikilink inside a table row on one cell", () => {
    const row =
      "| **TR-01** | Степной Створ | [[REG-07_mist_ridges\\|REG-07: Туманные Кряжи]] |";
    const out = sanitizeMdxSource(row, index);
    expect(out.split("|").length).toBe(row.split("|").length - 1);
    expect(out).toContain("(/docs/01_world/regions/REG-07_mist_ridges)");
  });

  it("resolves an escaped pipe combined with a heading anchor", () => {
    const out = sanitizeMdxSource("[[02_physics#Дрифт\\|Про дрифт]]", index);
    expect(out).toBe("[Про дрифт](/docs/02_physics/02_physics-and-driving#дрифт)");
  });

  it("renders a styled ghost link when the target is not indexed (§2.2)", () => {
    const out = sanitizeMdxSource("[[unknown_page\\|Алиас]]", index);
    // Assert the substance, not the whole literal: the contract is that a
    // ghost-link span is emitted carrying the explanatory title and the alias.
    // Pinning the full className string would re-break this test on any future
    // utility change for a reason that has nothing to do with behaviour.
    expect(out).toContain('className="ghost-link"');
    expect(out).toContain('title="Страница еще не создана"');
    expect(out).toContain(">Алиас</span>");
  });

  it("keeps presentation out of the ghost-link className (§2.2)", () => {
    // The `.ghost-link` rule in globals.css lives in `@layer components`;
    // utilities compile into `@layer utilities`, which is ordered later and
    // therefore wins regardless of specificity. Any utility left on the span
    // would shadow the stylesheet rule and kill the `:hover` state, so the
    // className must stay free of them.
    const out = sanitizeMdxSource("[[unknown_page\\|Алиас]]", index);
    const className = /className="([^"]*)"/.exec(out)?.[1];
    expect(className).toBeDefined();
    expect(className!.trim().split(/\s+/)).toEqual(["ghost-link"]);
  });

  it("still handles a wikilink with no alias", () => {
    expect(sanitizeMdxSource("[[02_physics]]", index)).toBe(
      "[02_physics](/docs/02_physics/02_physics-and-driving)"
    );
  });

  it("resolves several wikilinks in one sentence including ghost links", () => {
    expect(sanitizeMdxSource("Сравни [[02_physics|Альфа]] и [[unknown|Бета]].", index)).toBe(
      // Loose for the same reason as above: the resolved link and the ghost-link
      // span are the behaviour under test, not the ghost span's class inventory.
      'Сравни [Альфа](/docs/02_physics/02_physics-and-driving) и <span className="ghost-link" title="Страница еще не создана">Бета</span>.'
    );
  });

  it("falls back to /docs/<target> when no index is provided", () => {
    const out = sanitizeMdxSource("[[standalone_page|Алиас]]");
    expect(out).toBe("[Алиас](/docs/standalone_page)");
  });

  it("links a same-page anchor", () => {
    expect(sanitizeMdxSource("[[#Особые условия|условия]]", index)).toBe("[условия](#особые-условия)");
  });

  it("slugs anchors exactly like rehype-slug (dashes, ampersands, emphasis)", () => {
    // github-slugger drops "—" and "&" but keeps the spaces around them.
    expect(
      sanitizeMdxSource("[[02_physics#6.7 Камеры (Burnout & Hot Pursuit — *Legacy*)|Камеры]]", index)
    ).toBe("[Камеры](/docs/02_physics/02_physics-and-driving#67-камеры-burnout--hot-pursuit--legacy)");
  });

  it("leaves wikilinks inside fenced code blocks untouched", () => {
    const src = "```\n[[REG-07_mist_ridges\\|Алиас]]\n```";
    expect(sanitizeMdxSource(src, index)).toBe(src);
  });
});


describe("sanitizeMdxSource - inline code and ghost links", () => {
  it("leaves a wikilink inside inline code untouched", () => {
    const out = sanitizeMdxSource("See `[[02_physics]]` for details.", index);
    expect(out).toContain("[[02_physics]]");
    expect(out).not.toContain("ghost-link");
  });

  it("renders an unresolved wikilink as a ghost link", () => {
    const out = sanitizeMdxSource("See [[missing_note]] for details.", index);
    expect(out).toContain("ghost-link");
    expect(out).toContain("missing_note");
  });
});
