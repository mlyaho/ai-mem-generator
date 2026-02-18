import { BaseApiService, ApiError } from './BaseApiService';

/**
 * Интерфейс для ответа с текстом от AI
 */
export interface AITextResponse {
  topText: string;
  bottomText: string;
  raw: string;
}

const AI_RESPONSES = [
  { top: "КОГДА СКАЗАЛИ", bottom: "ПРОСТО СКОПИРУЙ И ВСТАВЬ" },
  { top: "Я В 3 ЧАСА НОЧИ", bottom: "ИСПРАВЛЯЮ ОДИН БАГ" },
  { top: "МОЙ КОД", bottom: "РАБОТАЕТ, НО Я НЕ ЗНАЮ ПОЧЕМУ" },
  { top: "МЕНЕДЖЕР:", bottom: "ЭТО БЫСТРО, ПРАВО?" },
  { top: "ПОНЕДЕЛЬНИК", bottom: "ОПЯТЬ 25 ЧАСОВ В СУТКАХ" },
  { top: "КОТ В ОФИСЕ", bottom: "ТЕПЕРЬ ЭТО МОЙ МЕНЕДЖЕР" },
  { top: "DEADLINE", bottom: "ВЧЕРА БЫЛО НАДО" },
  { top: "КОГДА ЗАКАЗАЛ", bottom: "ПИЦЦУ БЕЗ АНЧОУСОВ" },
];

/**
 * Сервис для работы с API генерации изображений
 * Использует Pollinations.ai с фолбэком на Unsplash
 */
export class PollinationsService extends BaseApiService {
  private static readonly IMAGE_BASE = 'https://image.pollinations.ai';
  private static readonly UNSPLASH_BASE = 'https://source.unsplash.com';

  constructor() {
    super(PollinationsService.IMAGE_BASE);
  }

  /**
   * Генерирует изображение с фолбэком на Unsplash при ошибке
   */
  async generateImageUrl(prompt: string, width: number = 512, height: number = 512, seed?: number): Promise<string> {
    const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `${this.baseUrl}/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${actualSeed}&nologo=true`;
    
    // Проверяем доступность Pollinations
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(pollinationsUrl, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok && response.status < 500) {
        return pollinationsUrl;
      }
    } catch {
      // Игнорируем ошибку, используем фолбэк
    }
    
    // Фолбэк на Unsplash Source (работает стабильнее)
    const keywords = prompt.split(' ').slice(0, 3).join(',');
    return `https://images.unsplash.com/photo-${this.getRandomUnsplashId()}?w=${width}&h=${height}&fit=crop`;
  }

  /**
   * Случайный ID фото с Unsplash для разнообразия
   */
  private getRandomUnsplashId(): string {
    const ids = [
      '1560250097-0b93520c3c33', // funny
      '1535522448380-67b364f8e422', // meme
      '1517048939321-9b7dc9a8e3f5', // office
      '1529154127459-06be5c91dd37', // work
      '1573408301185-9146fe634ad0', // funny face
      '1534528741775-53994a69daeb', // portrait
      '1506794778202-c7828e877035', // person
      '1507003211169-0a1dd7228f2d', // face
    ];
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /**
   * Генерирует текст для мема
   */
  generateMemeText(): AITextResponse {
    const random = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
    return {
      topText: random.top,
      bottomText: random.bottom,
      raw: '',
    };
  }

  /**
   * Генерирует полный мем (изображение + текст)
   */
  async generateMeme(prompt: string): Promise<{ imageUrl: string } & AITextResponse> {
    const seed = Math.floor(Math.random() * 1000000);
    
    const [imageUrl, textResponse] = await Promise.all([
      this.generateImageUrl(prompt + ' meme funny', 512, 512, seed),
      Promise.resolve(this.generateMemeText()),
    ]);

    return {
      imageUrl,
      ...textResponse,
    };
  }

  /**
   * Проверка доступности сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/prompt/test?width=10&height=10`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Экспортируем singleton для удобства
export const pollinationsService = new PollinationsService();
