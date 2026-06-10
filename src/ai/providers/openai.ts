import OpenAI from 'openai';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  try {
    logger.debug('Calling OpenAI GPT-4...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    logger.debug('OpenAI response received');
    return response;
  } catch (error) {
    logger.error('OpenAI error:', error);
    throw error;
  }
}
