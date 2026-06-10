import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export type Language = 'ru' | 'en' | 'es' | 'uz' | 'ar' | 'tr';

type TranslationValues = Record<string, string | number>;

interface Translations {
  [key: string]: Record<string, unknown> | string | number;
}

class I18n {
  private translations: Map<Language, Translations> = new Map();
  private defaultLanguage: Language = 'ru';

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations() {
    // Путь к переводам: из dist/ это ../../src/..., из src/ это ./translations
    const fromDist = path.join(__dirname, '..', '..', 'src', 'localization', 'translations');
    const fromSrc = path.join(__dirname, 'translations');
    const translationsDir = fs.existsSync(path.join(fromDist, 'ru.json'))
      ? fromDist
      : fromSrc;
    const languages: Language[] = ['ru', 'en', 'es', 'uz', 'ar', 'tr'];

    languages.forEach((lang) => {
      try {
        const filePath = path.join(translationsDir, `${lang}.json`);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        this.translations.set(lang, data);
        logger.debug(`Loaded translations for ${lang}`);
      } catch (error) {
        logger.error(`Failed to load translations for ${lang}:`, error);
      }
    });
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
    const value = path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
    return typeof value === 'string' ? value : undefined;
  }

  private interpolate(text: string, values?: TranslationValues): string {
    if (!values) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key]?.toString() || match;
    });
  }

  public t(key: string, language: Language = this.defaultLanguage, values?: TranslationValues): string {
    const translations = this.translations.get(language);
    
    if (!translations) {
      logger.warn(`Translations not found for language: ${language}`);
      return key;
    }

    const text = this.getNestedValue(translations, key);

    if (!text) {
      logger.warn(`Translation key not found: ${key} for language: ${language}`);
      return key;
    }

    return this.interpolate(text, values);
  }

  public hasLanguage(language: string): boolean {
    return this.translations.has(language as Language);
  }

  public getAvailableLanguages(): Language[] {
    return Array.from(this.translations.keys());
  }
}

export const i18n = new I18n();
export default i18n;
