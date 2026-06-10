import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Очистка базы данных...\n');

    // Удаляем все записи из таблиц (в правильном порядке из-за foreign keys)
    
    // 1. Сначала удаляем AIResponse (зависит от User)
    const deletedResponses = await prisma.aIResponse.deleteMany({});
    console.log(`✅ Удалено ответов AI: ${deletedResponses.count}`);

    // 2. Затем удаляем пользователей
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ Удалено пользователей: ${deletedUsers.count}`);

    console.log('\n🎉 База данных успешно очищена!');
    console.log('📋 Таблицы сохранены, все записи удалены.\n');

  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запрашиваем подтверждение
console.log('⚠️  ВНИМАНИЕ: Эта операция удалит ВСЕ записи из базы данных!');
console.log('📋 Таблицы останутся, но все данные будут потеряны.\n');

const args = process.argv.slice(2);

if (args.includes('--force') || args.includes('-f')) {
  // Запуск без подтверждения
  clearDatabase();
} else {
  // Требуется подтверждение
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Продолжить? (yes/no): ', (answer: string) => {
    rl.close();
    
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      clearDatabase();
    } else {
      console.log('❌ Операция отменена.');
      process.exit(0);
    }
  });
}
