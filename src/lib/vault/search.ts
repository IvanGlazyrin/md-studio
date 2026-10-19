import MiniSearch from "minisearch";

export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  url: string;
  category?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  category?: string;
  score?: number;
  match?: Record<string, string[]>;
  terms?: string[];
}

export function createSearchIndex(documents: SearchDoc[]): MiniSearch<SearchDoc> {
  const miniSearch = new MiniSearch<SearchDoc>({
    fields: ["title", "body", "category"],
    storeFields: ["title", "url", "category"],
    searchOptions: {
      boost: { title: 3, category: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  if (documents && documents.length > 0) {
    miniSearch.addAll(documents);
  }
  return miniSearch;
}

export function searchDocuments(
  index?: MiniSearch<SearchDoc> | null,
  query?: string | null
): SearchResultItem[] {
  if (!index || !query || typeof query !== "string" || query.trim().length === 0) {
    return [];
  }
  const hits = index.search(query.trim());
  return hits as unknown as SearchResultItem[];
}
