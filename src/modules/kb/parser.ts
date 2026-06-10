/**
 * Knowledge Base - Parser: file extraction, wikilinks (V3)
 */

// @ts-expect-error pdf-parse has no types
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import type { ParsedKnowledgeInput } from './types';

/**
 * Извлечение текста из загруженного файла
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType.toLowerCase()) {
    case 'pdf': {
      const data = await pdf(fileBuffer);
      return data.text;
    }
    case 'docx':
    case 'doc': {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }
    case 'txt':
      return fileBuffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Извлечение вики-ссылок [[Page Title]] из контента
 */
export function extractWikilinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = [...content.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1].trim()))];
}

/**
 * Парсинг текстового ввода в заголовок и контент
 */
export function parseKnowledgeInput(message: string): ParsedKnowledgeInput {
  const firstLine = message.split('\n')[0]?.trim() || '';
  const rest = message.split('\n').slice(1).join('\n').trim();

  const title = firstLine.length > 0 ? firstLine : 'Без названия';
  const content = rest || '';

  const tags = (message.match(/#\w+/g) || []).map((t) => t.slice(1));
  const wikilinks = extractWikilinks(message);

  return {
    title,
    content,
    tags: tags.length > 0 ? tags : undefined,
    wikilinks: wikilinks.length > 0 ? wikilinks : undefined,
  };
}
