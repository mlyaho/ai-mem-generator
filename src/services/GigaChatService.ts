import { IMemeApiService, MemeGenerationResult, ServiceConfig } from './IMemeApiService';

/**
 * Сервис для работы с GigaChat API
 * Генерация текста для мемов через GigaChat от Сбера
 * 
 * Для работы требуются:
 * NEXT_PUBLIC_GIGACHAT_CLIENT_ID=xxx
 * NEXT_PUBLIC_GIGACHAT_CLIENT_SECRET=xxx
 */
export class GigaChatService implements IMemeApiService {
  readonly name = 'GigaChat';
  private readonly authUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
  private readonly chatUrl = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GIGACHAT_CLIENT_ID || '';
    this.clientSecret = process.env.NEXT_PUBLIC_GIGACHAT_CLIENT_SECRET || '';
  }

  get config(): ServiceConfig {
    return {
      requiresApiKey: true,
      apiKeyEnvVar: 'NEXT_PUBLIC_GIGACHAT_CLIENT_ID',
      rateLimit: 60,
      description: 'GigaChat для генерации смешных подписей',
    };
  }

  async generateImage(): Promise<string> {
    throw new Error('GigaChat не генерирует изображения. Используйте Kandinsky.');
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    if (!response.ok) {
      throw new Error('GigaChat auth failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken!;
  }

  async generateMemeText(prompt: string): Promise<{ topText: string; bottomText: string }> {
    if (!this.clientId || !this.clientSecret) {
      return this.getFallbackText();
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: [
            {
              role: 'system',
              content: 'Придумай ОЧЕНЬ смешную подпись для мема. Верни ТОЛЬКО 2 строки: первая строка - текст СВЕРХУ, вторая строка - текст СНИЗУ. Без кавычек, без объяснений. Язык: русский.',
            },
            {
              role: 'user',
              content: `Тема мема: ${prompt}`,
            },
          ],
          temperature: 0.8,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        return this.getFallbackText();
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
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
      { topText: 'GIGACHAT', bottomText: 'ПРИДУМАЛ' },
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async generateMeme(prompt: string): Promise<MemeGenerationResult> {
    const textResponse = await this.generateMemeText(prompt);

    return {
      imageUrl: '',
      ...textResponse,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}

export const gigaChatService = new GigaChatService();
