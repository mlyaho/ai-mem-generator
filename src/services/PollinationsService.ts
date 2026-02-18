import { BaseApiService } from './BaseApiService';
import { IMemeApiService, MemeGenerationResult, ServiceConfig } from './IMemeApiService';

const AI_RESPONSES = [
  { top: 'КОГДА СКАЗАЛИ', bottom: 'ПРОСТО СКОПИРУЙ И ВСТАВЬ' },
  { top: 'Я В 3 ЧАСА НОЧИ', bottom: 'ИСПРАВЛЯЮ ОДИН БАГ' },
  { top: 'МОЙ КОД', bottom: 'РАБОТАЕТ, НО Я НЕ ЗНАЮ ПОЧЕМУ' },
  { top: 'МЕНЕДЖЕР:', bottom: 'ЭТО БЫСТРО, ПРАВО?' },
  { top: 'ПОНЕДЕЛЬНИК', bottom: 'ОПЯТЬ 25 ЧАСОВ В СУТКАХ' },
  { top: 'КОТ В ОФИСЕ', bottom: 'ТЕПЕРЬ ЭТО МОЙ МЕНЕДЖЕР' },
  { top: 'DEADLINE', bottom: 'ВЧЕРА БЫЛО НАДО' },
  { top: 'КОГДА ЗАКАЗАЛ', bottom: 'ПИЦЦУ БЕЗ АНЧОУСОВ' },
];

/**
 * Сервис для работы с Pollinations.ai API
 * Генерация изображений через Pollinations + локальные шаблоны текста
 */
export class PollinationsService extends BaseApiService implements IMemeApiService {
  private static readonly IMAGE_BASE = 'https://image.pollinations.ai';
  readonly name = 'Pollinations.ai';

  constructor() {
    super(PollinationsService.IMAGE_BASE);
  }

  get config(): ServiceConfig {
    return {
      requiresApiKey: false,
      description: 'Бесплатная генерация изображений без ключа (с фолбэком на Unsplash)',
    };
  }

  /**
   * Генерация изображения с фолбэком на Unsplash при ошибке
   */
  async generateImage(prompt: string, width: number = 512, height: number = 512): Promise<string> {
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `${this.baseUrl}/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    // Проверяем доступность Pollinations
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pollinationsUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok && response.status < 500) {
        return pollinationsUrl;
      }
    } catch {
      // Игнорируем ошибку, используем фолбэк
    }

    // Фолбэк на Unsplash
    return this.getUnsplashImage(prompt, width, height);
  }

  private getUnsplashId(prompt: string): string {
    const ids: Record<string, string> = {
      funny: '1560250097-0b93520c3c33',
      meme: '1535522448380-67b364f8e422',
      office: '1517048939321-9b7dc9a8e3f5',
      work: '1529154127459-06be5c91dd37',
      cat: '1514886945823-4769d264e0c4',
      default: '1573408301185-9146fe634ad0',
    };

    const key = Object.keys(ids).find((k) => prompt.toLowerCase().includes(k)) || 'default';
    return ids[key];
  }

  private getUnsplashImage(prompt: string, width: number, height: number): string {
    const photoId = this.getUnsplashId(prompt);
    return `https://images.unsplash.com/photo-${photoId}?w=${width}&h=${height}&fit=crop`;
  }

  /**
   * Генерация текста для мема (локальные шаблоны)
   */
  async generateMemeText(): Promise<{ topText: string; bottomText: string }> {
    const random = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
    return {
      topText: random.top,
      bottomText: random.bottom,
    };
  }

  /**
   * Генерация полного мема
   */
  async generateMeme(prompt: string): Promise<MemeGenerationResult> {
    const seed = Math.floor(Math.random() * 1000000);

    const [imageUrl, textResponse] = await Promise.all([
      this.generateImage(prompt + ' meme funny', 512, 512),
      this.generateMemeText(),
    ]);

    return {
      imageUrl,
      ...textResponse,
      provider: this.name,
    };
  }

  /**
   * Проверка доступности сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/prompt/test?width=10&height=10`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Экспортируем singleton
export const pollinationsService = new PollinationsService();
