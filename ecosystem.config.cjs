/**
 * PM2 конфигурация для BrainOS Multi-AI Telegram Bot
 *
 * Запуск:   pm2 start ecosystem.config.cjs
 * Остановка: pm2 stop brainos  (или brainos-dashboard)
 * Перезапуск: pm2 restart brainos
 * Логи:     pm2 logs brainos
 * Статус:   pm2 status
 *
 * Дашборд (apps/dashboard) — опционально, на том же сервере:
 *   Сначала: cd apps/dashboard && npm install && npm run build
 *   Затем:   pm2 start ecosystem.config.cjs --only brainos-dashboard
 */

module.exports = {
  apps: [
    {
      name: 'brainos',
      script: './dist/index.js',
      cwd: '/var/www/brainos',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'brainos-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/var/www/brainos/apps/dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/brainos/logs/pm2-dashboard-error.log',
      out_file: '/var/www/brainos/logs/pm2-dashboard-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
