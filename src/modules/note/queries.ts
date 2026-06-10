/**
 * Note Module - Queries
 */

import { prisma } from '../../database/client';
import type { Note } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import type { NoteInput, NoteStats } from './types';

export async function createNote(data: NoteInput) {
  try {
    const encrypted = encrypt(data.content);
    if (!encrypted) throw new Error('Failed to encrypt note');
    
    const note = await prisma.note.create({
      data: {
        userId: data.userId,
        content: encrypted,
        tags: data.tags || [],
        voiceFileId: data.voiceFileId,
      },
    });
    
    logger.info(`Note created: ${note.id}`);
    
    return {
      ...note,
      content: decrypt(note.content) || data.content,
    };
  } catch (error) {
    logger.error('Error creating note:', error);
    throw error;
  }
}

export async function getNotes(userId: string, limit: number = 20) {
  try {
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return notes.map((note: Note) => ({
      ...note,
      content: decrypt(note.content) || '',
    }));
  } catch (error) {
    logger.error('Error fetching notes:', error);
    throw error;
  }
}

export async function searchNotes(userId: string, query: string) {
  try {
    const notes = await getNotes(userId, 100);
    
    return notes.filter((note: Note) => 
      note.content.toLowerCase().includes(query.toLowerCase()) ||
      note.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  } catch (error) {
    logger.error('Error searching notes:', error);
    throw error;
  }
}

export async function deleteNote(id: string) {
  try {
    await prisma.note.delete({ where: { id } });
    logger.info(`Note deleted: ${id}`);
  } catch (error) {
    logger.error('Error deleting note:', error);
    throw error;
  }
}

export async function getNoteStats(userId: string): Promise<NoteStats> {
  try {
    const notes = await getNotes(userId, 1000);
    
    return {
      total: notes.length,
      withTags: notes.filter((n: Note) => n.tags.length > 0).length,
      voice: notes.filter((n: Note) => n.voiceFileId).length,
    };
  } catch (error) {
    logger.error('Error calculating note stats:', error);
    throw error;
  }
}
