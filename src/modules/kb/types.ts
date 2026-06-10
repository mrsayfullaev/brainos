/**
 * Knowledge Base Module - Types (V3)
 */

export interface ParsedKnowledgeInput {
  title: string;
  content: string;
  tags?: string[];
  wikilinks?: string[];
}

export interface KnowledgePageWithDecrypted {
  id: string;
  userId: string;
  title: string;
  content: string;
  embedding: number[] | null;
  tags: string[];
  fileId: string | null;
  fileType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeGraph {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string }>;
}
