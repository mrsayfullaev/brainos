/**
 * Заглушка веб-поиска. Подставьте реальный API (SerpAPI, Tavily и т.д.)
 */

export type SearchResult = {
  url: string;
  title: string;
  content: string;
};

export async function webSearch(_query: string, _limit = 3): Promise<SearchResult[]> {
  // TODO: подключить SerpAPI, Tavily, Brave Search и т.д.
  return [];
}

export async function webFetchContent(_url: string, _maxChars = 5000): Promise<string> {
  // TODO: fetch + парсинг HTML (cheerio) или API
  return '';
}
