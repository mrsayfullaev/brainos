import { config } from '../../utils/config';
import { logger } from '../../utils/logger';
import axios from 'axios';
import https from 'https';
import { randomUUID } from 'crypto';

// GigaChat API documentation: https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/post-chat
// httpsAgent с rejectUnauthorized: false — требуется при корпоративном прокси/VPN с самоподписанными сертификатами
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

interface GigaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GigaChatRequest {
  model: string;
  messages: GigaChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface GigaChatResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    index: number;
    finish_reason: string;
  }>;
}

interface GigaChatTokenResponse {
  access_token: string;
  expires_at: number;
}

// Кэш для OAuth токена
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const axiosInstance = axios.create({
  timeout: 15000,
  httpsAgent,
});

/**
 * Получает OAuth токен для GigaChat API
 */
async function getAccessToken(): Promise<string> {
  // Проверяем кэш токена (с запасом 5 минут)
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 5 * 60 * 1000) {
    logger.debug('Using cached GigaChat token');
    return cachedToken;
  }

  try {
    logger.debug('Requesting new GigaChat OAuth token...');

    // Создаем Base64 credentials из client_id:client_secret
    const credentials = Buffer.from(
      `${config.GIGACHAT_CLIENT_ID}:${config.GIGACHAT_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axiosInstance.post<GigaChatTokenResponse>(
      'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
      'scope=GIGACHAT_API_PERS',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'RqUID': randomUUID(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.data.access_token) {
      throw new Error('No access_token in GigaChat OAuth response');
    }

    // Кэшируем токен
    cachedToken = response.data.access_token;
    tokenExpiresAt = response.data.expires_at || (Date.now() + 30 * 60 * 1000); // По умолчанию 30 минут

    logger.info('GigaChat OAuth token obtained successfully');
    logger.debug(`Token expires at: ${new Date(tokenExpiresAt).toISOString()}`);

    return cachedToken;
  } catch (error) {
    logger.error('Failed to get GigaChat OAuth token:', error);
    throw error;
  }
}

/**
 * Вызов GigaChat API с автоматическим получением токена
 */
export async function callGigaChat(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    logger.debug('Calling GigaChat...');
    
    // Получаем актуальный токен
    const accessToken = await getAccessToken();
    
    const request: GigaChatRequest = {
      model: 'GigaChat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    const response = await axiosInstance.post<GigaChatResponse>(
      'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const text = response.data.choices[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from GigaChat');
    }

    logger.debug('GigaChat response received');
    return text;
  } catch (error: any) {
    // Если токен истек (401), пробуем получить новый
    if (error.response?.status === 401) {
      logger.warn('GigaChat token expired, retrying with new token...');
      cachedToken = null;
      tokenExpiresAt = 0;
      
      // Рекурсивный вызов с новым токеном (только один раз)
      const newToken = await getAccessToken();
      
      const request: GigaChatRequest = {
        model: 'GigaChat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };
      
      const retryResponse = await axiosInstance.post<GigaChatResponse>(
        'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`,
          },
        }
      );
      
      const retryText = retryResponse.data.choices[0]?.message?.content;
      
      if (!retryText) {
        throw new Error('Empty response from GigaChat after retry');
      }
      
      logger.debug('GigaChat response received (after retry)');
      return retryText;
    }
    
    logger.error('GigaChat error:', error);
    throw error;
  }
}
