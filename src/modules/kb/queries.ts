/**
 * Knowledge Base - Queries (V3)
 */

import { prisma } from '../../database/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { generateEmbedding } from './embeddings';
import type { KnowledgePageWithDecrypted, KnowledgeGraph } from './types';

/**
 * Косинусное сходство (для поиска по эмбеддингам в памяти)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function createKnowledgePage(params: {
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  fileId?: string;
  fileType?: string;
  generateEmbeddingForSearch?: boolean;
}): Promise<KnowledgePageWithDecrypted> {
  const encryptedTitle = encrypt(params.title);
  const encryptedContent = encrypt(params.content);
  if (!encryptedTitle || !encryptedContent) {
    throw new Error('Encryption failed');
  }

  let embedding: number[] | null = null;
  if (params.generateEmbeddingForSearch !== false && params.content.trim().length > 0) {
    const textForEmbedding = `${params.title}\n${params.content}`.slice(0, 8000);
    embedding = await generateEmbedding(textForEmbedding);
  }

  const page = await prisma.knowledgePage.create({
    data: {
      userId: params.userId,
      title: encryptedTitle,
      content: encryptedContent,
      embedding: embedding && embedding.length > 0 ? embedding : undefined,
      tags: params.tags || [],
      fileId: params.fileId,
      fileType: params.fileType,
    },
  });

  logger.info(`Knowledge page created: ${page.id}`);

  return {
    ...page,
    title: params.title,
    content: params.content,
    embedding,
    tags: page.tags,
  };
}

export async function getKnowledgePages(userId: string, limit = 50) {
  const pages = await prisma.knowledgePage.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return pages.map((p) => ({
    ...p,
    title: decrypt(p.title) || '',
    content: decrypt(p.content) || '',
    embedding: p.embedding as number[] | null,
  })) as KnowledgePageWithDecrypted[];
}

/**
 * Семантический поиск по эмбеддингам (в памяти)
 */
export async function semanticSearch(
  userId: string,
  query: string,
  limit: number = 5,
  queryEmbedding?: number[]
): Promise<KnowledgePageWithDecrypted[]> {
  const pages = await getKnowledgePages(userId, 200);
  const pagesWithEmbedding = pages.filter((p) => p.embedding && p.embedding.length > 0);

  if (pagesWithEmbedding.length === 0) {
    return [];
  }

  const embedding = queryEmbedding || (await generateEmbedding(query));
  if (embedding.length === 0) {
    return pages.slice(0, limit);
  }

  const withScore = pagesWithEmbedding.map((p) => ({
    page: p,
    score: cosineSimilarity(p.embedding!, embedding),
  }));

  withScore.sort((a, b) => b.score - a.score);

  return withScore.slice(0, limit).map((x) => x.page);
}

export async function getKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
  const pages = await prisma.knowledgePage.findMany({
    where: { userId },
    include: { linksTo: true },
  });

  const nodes = pages.map((p) => ({
    id: p.id,
    label: decrypt(p.title) || p.id,
  }));

  const edges: Array<{ from: string; to: string }> = [];
  for (const p of pages) {
    for (const link of p.linksTo) {
      edges.push({ from: p.id, to: link.targetId });
    }
  }

  return { nodes, edges };
}

export async function createWikiLink(sourceId: string, targetId: string) {
  await prisma.wikiLink.upsert({
    where: {
      sourceId_targetId: { sourceId, targetId },
    },
    create: { sourceId, targetId },
    update: {},
  });
}

export async function getPageById(pageId: string, userId: string) {
  const page = await prisma.knowledgePage.findFirst({
    where: { id: pageId, userId },
  });
  if (!page) return null;
  return {
    ...page,
    title: decrypt(page.title) || '',
    content: decrypt(page.content) || '',
    embedding: page.embedding as number[] | null,
  } as KnowledgePageWithDecrypted;
}

export async function deleteKnowledgePage(id: string, userId: string) {
  await prisma.knowledgePage.deleteMany({
    where: { id, userId },
  });
  logger.info(`Knowledge page deleted: ${id}`);
}
