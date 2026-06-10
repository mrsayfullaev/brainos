/**
 * V4 Notion Integration: вызовы Notion API
 */

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: object
): Promise<T> {
  const url = path.startsWith('http') ? path : `${NOTION_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${method} ${path}: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function notionSearchDatabases(accessToken: string) {
  const data = await notionRequest<{ results: Array<{ id: string; title: Array<{ plain_text: string }> }> }>(
    accessToken,
    'POST',
    '/search',
    { filter: { property: 'object', value: 'database' } }
  );
  return data.results;
}

export async function notionQueryDatabase(
  accessToken: string,
  databaseId: string,
  pageSize = 50
): Promise<Array<{ id: string; properties: Record<string, unknown> }>> {
  const data = await notionRequest<{
    results: Array<{ id: string; properties: Record<string, unknown> }>;
  }>(accessToken, 'POST', `/databases/${databaseId}/query`, { page_size: pageSize });
  return data.results;
}

function getTitleFromProps(props: Record<string, unknown>): string {
  const name = (props.Name ?? props.Title ?? props['Task name']) as { title?: Array<{ plain_text: string }> } | undefined;
  const arr = name?.title;
  if (!arr?.length) return '';
  return arr.map((t) => t.plain_text).join('');
}

function getSelectFromProps(props: Record<string, unknown>, key: string): string {
  const sel = (props[key] ?? props.Status) as { select?: { name: string } } | undefined;
  return sel?.select?.name ?? '';
}

/**
 * Создаёт страницу в базе Notion. properties: ключи должны совпадать со схемой базы (например Name, Status).
 */
export async function notionCreatePage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, { title?: Array<{ text: { content: string } }>; select?: { name: string } }>
): Promise<{ id: string }> {
  const data = await notionRequest<{ id: string }>(accessToken, 'POST', '/pages', {
    parent: { database_id: databaseId },
    properties,
  });
  return data;
}

export { getTitleFromProps, getSelectFromProps };
