import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import axios from 'axios';

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    logger.debug('Calling Google Gemini...');
    
    // Объединяем system prompt и user message в один запрос
    // так как v1 API не поддерживает systemInstruction
    const combinedMessage = `${systemPrompt}\n\nUser query: ${userMessage}`;
    
    const request: GeminiRequest = {
      contents: [
        {
          parts: [{ text: combinedMessage }],
        },
      ],
    };

    // Используем v1 API (совместим с AI Studio ключами)
    const response = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${config.GEMINI_API_KEY}`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    logger.debug('Gemini response received');
    return text;
  } catch (error: any) {
    if (error.response) {
      logger.error('Gemini API error:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      logger.error('Gemini error:', error.message);
    }
    throw error;
  }
}
