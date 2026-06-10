import { mkdirSync } from 'fs';
import path from 'path';
import winston from 'winston';
import { config } from './config';

const logsDir = path.join(process.cwd(), 'logs');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  logFormat
);

export const logger = winston.createLogger({
  levels: logLevels,
  level: config.LOG_LEVEL,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport - errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
    }),
    // File transport - combined
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
  ],
});

// Create logs directory if it doesn't exist
try {
  mkdirSync(logsDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

export default logger;
