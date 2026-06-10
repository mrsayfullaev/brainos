/**
 * Note Module - Handlers
 */

import type { Context } from 'grammy';
import type { User, Note } from '@prisma/client';
import type { ModuleResult } from '../types';
import { triggerWorkflows } from '../workflow/engine';
import { parseNote } from './parser';
import { createNote, getNotes, getNoteStats } from './queries';
import { logger } from '../../utils/logger';

export async function handleNoteMessage(
  _ctx: Context,
  user: User,
  message: string
): Promise<ModuleResult> {
  try {
    logger.info(`Note module: processing message for user ${user.id}`);
    
    // 1. Парсим заметку
    const parsed = await parseNote(message, user.language);
    
    // 2. Создаём заметку
    const note = await createNote({
      userId: user.id,
      ...parsed,
    });

    triggerWorkflows('note', 'created', {
      noteId: note.id,
      title: note.content?.slice(0, 200) ?? '',
      tags: note.tags,
      userId: user.id,
    }).catch((e) => logger.error('Workflow trigger note/created:', e));

    // 3. Получаем контекст
    const recentNotes = await getNotes(user.id, 3);
    const stats = await getNoteStats(user.id);
    
    // 4. Строим промпт
    const modulePrompt = `
=== NOTE MODULE CONTEXT ===
You are helping with note-taking.

NEW NOTE:
"${note.content}"
${note.tags.length > 0 ? `Tags: ${note.tags.map((t: string) => `#${t}`).join(' ')}` : ''}

STATS:
- Total notes: ${stats.total}
- Notes with tags: ${stats.withTags}
${recentNotes.length > 1 ? `\nRecent notes:\n${recentNotes.slice(1, 3).map((n: Note & { content: string }, i: number) => `${i + 1}. ${n.content.substring(0, 50)}...`).join('\n')}` : ''}

YOUR TASK:
1. Confirm the note was saved
2. Keep it VERY SHORT (1 sentence)
3. Respond in ${user.language}
    `.trim();
    
    logger.info('Note module: note created successfully');
    
    return {
      modulePrompt,
      data: note,
    };
  } catch (error) {
    logger.error('Error in note module handler:', error);
    
    return {
      modulePrompt: `Error creating note. Respond in ${user.language}.`,
    };
  }
}
