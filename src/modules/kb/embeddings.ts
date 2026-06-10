/**
 * Knowledge Base - OpenAI Embeddings (V3)
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const MAX_INPUT_CHARS = 8000;

/**
 * Генерирует векторное представление текста для семантического поиска
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set, embedding skipped');
    return [];
  }

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const truncated = text.slice(0, MAX_INPUT_CHARS);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIMS) {
      throw new Error(`Unexpected embedding length: ${embedding?.length}`);
    }

    return embedding;
  } catch (error) {
    logger.error('Failed to generate embedding:', error);
    return [];
  }
}
