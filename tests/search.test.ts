import { describe, it, expect, vi } from "vitest";
import { createSearchIndex, searchDocuments, SearchDoc } from "../src/lib/vault/search";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("MiniSearch search engine", () => {
  const docs: SearchDoc[] = [
    {
      id: "1",
      title: "Физика дрифта и APEX",
      body: "Управление сцеплением и оверстир. Поведение шин на мокром асфальте.",
      url: "/docs/02_physics",
      category: "Физика",
    },
    {
      id: "2",
      title: "Регион Лазурный берег",
      body: "Серпантины и трассы вдоль моря. Пейзажные маршруты для скоростных заездов.",
      url: "/docs/01_world",
      category: "Мир",
    },
    {
      id: "3",
      title: "Экономика автопарка и тюнинг",
      body: "Покупка запчастей, модификация двигателей и дрифт-киты.",
      url: "/docs/03_economy",
      category: "Экономика",
    },
  ];

  it("indexes and fuzzy searches documents by title, tags, and terms", () => {
    const index = createSearchIndex(docs);
    const results = searchDocuments(index, "дрифт");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("Физика дрифта");
  });

  it("finds documents matching body content", () => {
    const index = createSearchIndex(docs);
    const results = searchDocuments(index, "серпантины");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("2");
    expect(results[0].url).toBe("/docs/01_world");
  });

  it("supports prefix search", () => {
    const index = createSearchIndex(docs);
    const results = searchDocuments(index, "серпант");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("2");
  });

  it("boosts title matches over body matches", () => {
    const index = createSearchIndex(docs);
    // "дрифт" is in title of doc 1, but only in body ("дрифт-киты") of doc 3
    const results = searchDocuments(index, "дрифт");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].id).toBe("1");
  });

  it("searches by category", () => {
    const index = createSearchIndex(docs);
    const results = searchDocuments(index, "Экономика");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("3");
  });

  it("returns empty array for empty, whitespace, or blank queries", () => {
    const index = createSearchIndex(docs);
    expect(searchDocuments(index, "")).toEqual([]);
    expect(searchDocuments(index, "   ")).toEqual([]);
    expect(searchDocuments(index, null)).toEqual([]);
    expect(searchDocuments(index, undefined)).toEqual([]);
  });

  it("handles null or undefined search index defensively", () => {
    expect(searchDocuments(null, "дрифт")).toEqual([]);
    expect(searchDocuments(undefined, "дрифт")).toEqual([]);
  });

  it("handles empty document sets gracefully", () => {
    const index = createSearchIndex([]);
    const results = searchDocuments(index, "дрифт");
    expect(results).toEqual([]);
  });

  it("formats search results correctly with id, title, url, and category", () => {
    const index = createSearchIndex(docs);
    const results = searchDocuments(index, "тюнинг");
    expect(results).toHaveLength(1);
    const item = results[0];
    expect(item).toMatchObject({
      id: "3",
      title: "Экономика автопарка и тюнинг",
      url: "/docs/03_economy",
      category: "Экономика",
    });
  });
});

describe("SearchDialog Accessibility", () => {
  it("renders search input with explicit aria-label and accessible controls", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { SearchDialog } = await import("../src/components/docs/SearchDialog");

    const element = React.createElement(SearchDialog, {
      isOpen: true,
      documents: [],
      onClose: () => {},
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('aria-label="Поиск по документации"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="Закрыть поиск"');
  });
});
