/**
 * URL документов сайта (политика, оферта) в зависимости от языка.
 * RU — без префикса пути, остальные — /{lang}/...
 */
const BASE = 'https://brainos.ai-khan.uz';

export function getDocsPageUrl(
  lang: string | null | undefined,
  page: 'privacy' | 'offer'
): string {
  const path = lang && lang !== 'ru' ? `/${lang}/${page}` : `/${page}`;
  return `${BASE}${path}`;
}
