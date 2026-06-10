/**
 * Read Later - URL metadata extraction (V3)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';
import type { ContentType } from './types';

export interface URLMetadata {
  title: string;
  description?: string;
  imageUrl?: string;
  type: ContentType;
}

export async function extractMetadata(url: string): Promise<URLMetadata> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrainOSBot/1.0)' },
      timeout: 8000,
    });
    const $ = cheerio.load(response.data);

    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').text()?.trim() ||
      url;
    const description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="description"]').attr('content')?.trim();
    const imageUrl = $('meta[property="og:image"]').attr('content')?.trim();

    const type = detectContentType(url, $);

    return { title, description, imageUrl, type };
  } catch (error) {
    logger.warn('Failed to extract URL metadata:', error);
    return { title: url, type: 'OTHER' };
  }
}

function detectContentType(url: string, $: cheerio.CheerioAPI): ContentType {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'VIDEO';
  if (u.includes('podcast') || $('meta[property="og:type"]').attr('content') === 'music.song') return 'PODCAST';
  return 'ARTICLE';
}
