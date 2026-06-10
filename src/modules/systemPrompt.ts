/**
 * Системный промпт из настроек пользователя (V1/V3).
 * Включает: язык ответа, имя пользователя, тон/длину/эмодзи/структуру/стиль/детализацию, customPrompt.
 * Список модулей — чтобы AI мог релевантно отвечать на вопросы «какие модули», «что умеешь» и т.п.
 * accessibleModules — модули по тарифу пользователя; если не переданы, используются все.
 */

import type { User } from '@prisma/client';
import { MODULE_NAMES } from './types';

const LANGUAGE_NAMES: Record<string, string> = {
  ru: 'русском', en: 'English', es: 'español', uz: "o'zbek", ar: 'العربية', tr: 'Türkçe',
};

/** Краткое описание модулей для контекста AI */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  task: 'задачи (task) — «задача купить молоко»',
  remind: 'напоминания (remind) — «напомни завтра»',
  wallet: 'кошелёк (wallet) — «купил кофе за 200»',
  note: 'заметки (note)',
  sleep: 'сон (sleep)',
  water: 'вода (water)',
  food: 'еда (food)',
  health: 'здоровье (health)',
  workout: 'тренировки (workout)',
  sub: 'подписки (sub)',
  savings: 'накопления (savings)',
  debt: 'долги (debt)',
  contact: 'контакты (contact)',
  news: 'новости (news)',
  idea: 'идеи (idea)',
  trip: 'поездки (trip)',
  place: 'места (place)',
  buy: 'покупки (buy)',
  quote: 'цитаты (quote)',
  vocab: 'словарь (vocab)',
  book: 'книги (book)',
  kb: 'база знаний (kb)',
  habit: 'привычки (habit)',
  invest: 'инвестиции (invest)',
  course: 'курсы (course)',
  email: 'Email',
  later: 'читать позже (later)',
  project: 'проекты (project)',
  car: 'машина (car)',
  pet: 'питомцы (pet)',
};

export function buildSystemPrompt(
  user: User,
  accessibleModules?: readonly string[] | null
): string {
  const parts: string[] = [];

  // Язык и имя — всегда в начале
  const langLabel = LANGUAGE_NAMES[user.language] || user.language;
  parts.push(`Всегда отвечай на языке: ${langLabel}.`);
  parts.push(
    'Интерпретируй запросы буквально: общеизвестные слова (луна, солнце, вода и т.д.) — это обычные слова, не аббревиатуры и не опечатки. Отвечай по смыслу вопроса.'
  );

  // Список модулей по тарифу — для релевантных ответов на «какие модули», «что умеешь» и т.п.
  const modulesToShow = accessibleModules && accessibleModules.length > 0
    ? accessibleModules
    : MODULE_NAMES;
  const modulesList = modulesToShow.map((m) => MODULE_DESCRIPTIONS[m] || m).join(', ');
  parts.push(`Доступные пользователю модули (при вопросах о возможностях отвечай только о них): ${modulesList}.`);
  if (user.name && user.name.trim()) {
    parts.push(`Имя пользователя: ${user.name}. Обращайся по имени, когда уместно.`);
  }

  if (user.tone === 'formal') {
    parts.push('Обращайся ко мне на "Вы". Используй формальный стиль.');
  } else if (user.tone === 'friendly') {
    parts.push('Общайся со мной дружелюбно, на "ты".');
  }

  if (user.length === 'brief') {
    parts.push('Отвечай кратко, по делу.');
  } else if (user.length === 'detailed') {
    parts.push('Давай подробные, развёрнутые ответы.');
  }

  if (user.emoji === 'yes') {
    parts.push('Используй эмодзи для выразительности.');
  } else if (user.emoji === 'no') {
    parts.push('Не используй эмодзи.');
  }

  if (user.structure === 'lists') {
    parts.push('Структурируй ответы в виде списков.');
  } else if (user.structure === 'paragraphs') {
    parts.push('Отвечай связными абзацами.');
  }

  if (user.style === 'expert') {
    parts.push('Говори как эксперт в теме.');
  } else if (user.style === 'friend') {
    parts.push('Общайся как друг.');
  } else if (user.style === 'teacher') {
    parts.push('Объясняй как учитель.');
  }

  if (user.detail === 'answer_only') {
    parts.push('Давай только прямой ответ, без дополнительного контекста.');
  } else if (user.detail === 'maximum') {
    parts.push('Предоставляй максимум деталей и контекста.');
  }

  if (user.customPrompt) {
    parts.push(user.customPrompt);
  }

  return parts.join(' ');
}
