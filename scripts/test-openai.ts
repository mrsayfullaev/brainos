/**
 * Проверка работы OpenAI GPT (ChatGPT).
 * Запуск: npm run test:openai
 */

import 'dotenv/config';
import OpenAI from 'openai';

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here') {
    console.error('❌ OPENAI_API_KEY не задан или пустой. Проверьте .env');
    process.exit(1);
  }

  console.log('🔄 Проверка OpenAI API...');

  try {
    const openai = new OpenAI({ apiKey: key });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Ответь одним словом: ок' },
        { role: 'user', content: 'Привет' },
      ],
      max_tokens: 10,
    });

    const text = completion.choices[0]?.message?.content;
    if (text) {
      console.log('✅ OpenAI GPT работает!');
      console.log('   Ответ:', text.trim());
    } else {
      console.error('❌ Пустой ответ от API');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Ошибка OpenAI:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
