/**
 * V4 Voice Assistant: транскрипция голоса через OpenAI Whisper
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

/**
 * Транскрибирует аудио (buffer) в текст через Whisper API.
 * Поддерживаются форматы: ogg, mp3, wav, m4a и др.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `voice-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`);

  try {
    fs.writeFileSync(tmpFile, audioBuffer);
    const stream = fs.createReadStream(tmpFile);

    const transcription = await openai.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
    });

    const text = (transcription as { text?: string }).text ?? '';
    logger.debug('Whisper transcription length:', text.length);
    return text.trim();
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  }
}
