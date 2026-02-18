import { IMemeApiService, MemeGenerationResult, ServiceConfig } from './IMemeApiService';

/**
 * Сервис для работы с YandexGPT API
 * Генерация текста для мемов через YandexGPT
 * 
 * Для работы требуется:
 * 1. API-ключ Yandex Cloud
 * 2. Folder ID каталога
 * 
 * NEXT_PUBLIC_YANDEX_API_KEY=xxx
 * NEXT_PUBLIC_YANDEX_FOLDER_ID=xxx
 */
export class YandexGPTService implements IMemeApiService {
  readonly name = 'YandexGPT';
  private readonly apiUrl = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  private readonly apiKey: string;
  private readonly folderId: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_YANDEX_API_KEY || '';
    this.folderId = process.env.NEXT_PUBLIC_YANDEX_FOLDER_ID || '';
  }

  get config(): ServiceConfig {
    return {
      requiresApiKey: true,
      apiKeyEnvVar: 'NEXT_PUBLIC_YANDEX_API_KEY',
      rateLimit: 100,
      description: 'YandexGPT для генерации смешных подписей',
    };
  }

  async generateImage(): Promise<string> {
    throw new Error('YandexGPT не генерирует изображения. Используйте Kandinsky.');
  }

  async generateMemeText(prompt: string): Promise<{ topText: string; bottomText: string }> {
    if (!this.apiKey || !this.folderId) {
      return this.getFallbackText();
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${this.apiKey}`,
          'x-folder-id': this.folderId,
        },
        body: JSON.stringify({
          modelUri: 'gpt://b1g***/*yandexgpt-lite',
          completionOptions: {
            stream: false,
            temperature: 0.8,
            maxTokens: 100,
          },
          messages: [
            {
              role: 'system',
              text: 'Придумай ОЧЕНЬ смешную подпись для мема. Верни ТОЛЬКО 2 строки: первая строка - текст СВЕРХУ, вторая строка - текст СНИЗУ. Без кавычек, без объяснений. Язык: русский.',
            },
            {
              role: 'user',
              text: `Тема мема: ${prompt}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return this.getFallbackText();
      }

      const data = await response.json();
      const text = data.result?.alternatives?.[0]?.message?.text || '';
      const lines = text.trim().split('\n').filter((l: string) => l.trim());

      return {
        topText: lines[0]?.replace(/["']/g, '').trim() || 'КОГДА ТЫ',
        bottomText: lines[1]?.replace(/["']/g, '').trim() || 'ПРОГРАММИСТ',
      };
    } catch {
      return this.getFallbackText();
    }
  }

  private getFallbackText(): { topText: string; bottomText: string } {
    const responses = [
      { topText: 'КОГДА СКАЗАЛИ', bottomText: 'ПРОСТО СКОПИРУЙ' },
      { topText: 'Я В 3 ЧАСА НОЧИ', bottomText: 'ИСПРАВЛЯЮ БАГ' },
      { topText: 'МОЙ КОД', bottomText: 'РАБОТАЕТ, НЕ ЗНАЮ ПОЧЕМУ' },
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async generateMeme(prompt: string): Promise<MemeGenerationResult> {
    // YandexGPT только текст, изображение нужно получить от другого сервиса
    const textResponse = await this.generateMemeText(prompt);
    
    return {
      imageUrl: '', // Пусто - нужно комбинировать с другим сервисом
      ...textResponse,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || !this.folderId) {
      return false;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${this.apiKey}`,
          'x-folder-id': this.folderId,
        },
        body: JSON.stringify({
          modelUri: 'gpt://b1g***/*yandexgpt-lite',
          completionOptions: {
            stream: false,
            temperature: 0.5,
            maxTokens: 10,
          },
          messages: [{ role: 'user', text: 'test' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const yandexGPTService = new YandexGPTService();
