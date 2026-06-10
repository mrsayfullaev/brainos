import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

const anthropic = new Anthropic({
  apiKey: config.CLAUDE_API_KEY,
});

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    logger.debug('Calling Claude...');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

    if (!text) {
      throw new Error('Empty response from Claude');
    }

    logger.debug('Claude response received');
    return text;
  } catch (error) {
    logger.error('Claude error:', error);
    throw error;
  }
}
