/**
 * AES-256-GCM Encryption Utility
 * 
 * Шифрует и расшифровывает чувствительные данные пользователей в БД.
 * Использует AES-256-GCM (Galois/Counter Mode) для authenticated encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from './config';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 байт для GCM (рекомендовано NIST)
const AUTH_TAG_LENGTH = 16; // 16 байт для authentication tag
const KEY_LENGTH = 32; // 256 бит = 32 байта

/**
 * Получает ключ шифрования из конфигурации
 * @returns Buffer с ключом шифрования
 */
function getEncryptionKey(): Buffer {
  try {
    const keyHex = config.ENCRYPTION_KEY;
    const key = Buffer.from(keyHex, 'hex');
    
    if (key.length !== KEY_LENGTH) {
      throw new Error(`Invalid encryption key length: ${key.length} bytes (expected ${KEY_LENGTH})`);
    }
    
    return key;
  } catch (error) {
    logger.error('Failed to get encryption key:', error);
    throw new Error('Encryption key is invalid or missing');
  }
}

/**
 * Шифрует строку с использованием AES-256-GCM
 * 
 * Формат зашифрованных данных: iv:authTag:encryptedData (все в hex)
 * 
 * @param text Исходный текст для шифрования
 * @returns Зашифрованная строка в формате "iv:authTag:encrypted"
 */
export function encrypt(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Формат: iv:authTag:encrypted (все в hex)
    const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    
    logger.debug(`Encrypted data (length: ${text.length} -> ${result.length})`);
    return result;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Расшифровывает строку, зашифрованную с помощью encrypt()
 * 
 * @param encryptedText Зашифрованная строка в формате "iv:authTag:encrypted"
 * @returns Расшифрованный текст или null если данные пустые
 */
export function decrypt(encryptedText: string | null | undefined): string | null {
  if (encryptedText === null || encryptedText === undefined || encryptedText === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    
    // Парсим формат: iv:authTag:encrypted
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Проверяем размеры
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: ${iv.length}`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: ${authTag.length}`);
    }
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    logger.debug(`Decrypted data (length: ${encryptedText.length} -> ${decrypted.length})`);
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Проверяет, являются ли данные зашифрованными
 * 
 * @param text Текст для проверки
 * @returns true если данные в формате зашифрованных данных
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text) return false;
  
  // Проверяем формат: должно быть 3 части, разделенные ":"
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  
  // Проверяем, что все части - это hex строки ожидаемой длины
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Генерирует новый ключ шифрования (для первоначальной настройки)
 * 
 * @returns Hex строка с новым ключом
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Шифрует массив строк
 * 
 * @param items Массив строк для шифрования
 * @returns Массив зашифрованных строк
 */
export function encryptArray(items: string[] | null | undefined): string[] | null {
  if (!items || items.length === 0) return null;
  
  try {
    return items.map(item => encrypt(item)).filter((item): item is string => item !== null);
  } catch (error) {
    logger.error('Failed to encrypt array:', error);
    throw new Error('Failed to encrypt array');
  }
}

/**
 * Расшифровывает массив строк
 * 
 * @param encryptedItems Массив зашифрованных строк
 * @returns Массив расшифрованных строк
 */
export function decryptArray(encryptedItems: string[] | null | undefined): string[] | null {
  if (!encryptedItems || encryptedItems.length === 0) return null;
  
  try {
    return encryptedItems.map(item => decrypt(item)).filter((item): item is string => item !== null);
  } catch (error) {
    logger.error('Failed to decrypt array:', error);
    throw new Error('Failed to decrypt array');
  }
}
