/**
 * Modules V2 - Entry Point
 * 
 * Импортируйте этот файл в src/index.ts для активации системы модулей
 */

export * from './types';
export * from './router';
export * from './scheduler';

// Активные модули (импортируются для автоматической регистрации)
import './wallet';    // ✅ Финансы
import './task';      // ✅ Задачи
import './remind';    // ✅ Напоминания
import './note';      // ✅ Заметки
import './sleep';     // ✅ Сон
import './water';     // ✅ Вода
import './idea';      // ✅ Идеи
import './quote';     // ✅ Цитаты
import './health';    // ✅ Здоровье
import './workout';   // ✅ Тренировки
import './food';      // ✅ Питание
import './vocab';     // ✅ Словарь
import './book';      // ✅ Книги
import './sub';       // ✅ Подписки
import './savings';   // ✅ Накопления
import './debt';      // ✅ Долги
import './contact';   // ✅ Контакты
import './news';      // ✅ Новости
import './trip';      // ✅ Поездки
import './place';     // ✅ Места
import './buy';       // ✅ Покупки
import './kb';        // V3: База знаний
import './later';     // V3: Read Later
import './email';     // V3: Email drafts
import './habit';     // V3: Привычки
import './course';    // V3: Курсы
import './pet';       // V3: Питомцы
import './invest';    // V3: Инвестиции
import './project';   // V3: Проекты
import './car';       // V3: Авто
import './team';      // V4: Team Workspaces
import './notion';    // V4: Notion Integration
import './inbox';     // V4: Email Agent (Gmail)
import './analytics'; // V4: Analytics API (overview)

// 🎉 21 V2 + 9 V3 + V4 модули активны
// import './task';      // Задачи
// import './remind';    // Напоминания
// import './note';      // Заметки
// import './sub';       // Подписки
// import './savings';   // Накопления
// import './debt';      // Долги
// import './health';    // Здоровье
// import './workout';   // Тренировки
// import './sleep';     // Сон
// import './water';     // Вода
// import './food';      // Питание
// import './vocab';     // Словарь
// import './book';      // Книги
// import './contact';   // Контакты
// import './news';      // Новости
// import './idea';      // Идеи
// import './trip';      // Поездки
// import './place';     // Места
// import './buy';       // Покупки
// import './quote';     // Цитаты
