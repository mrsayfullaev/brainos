/**
 * Note Module - Types
 * Быстрые заметки с тегами
 */

export interface ParsedNote {
  content: string;
  tags?: string[];
}

export interface NoteInput {
  userId: string;
  content: string;
  tags?: string[];
  voiceFileId?: string;
}

export interface NoteStats {
  total: number;
  withTags: number;
  voice: number;
}
