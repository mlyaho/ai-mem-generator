import { IMemeApiService, MemeGenerationResult, ServiceConfig } from './IMemeApiService';

/**
 * Сервис для работы с Kandinsky API (через FusionBrain)
 * Генерация изображений через нейросеть от Сбера
 * 
 * Для работы требуется API-ключ:
 * NEXT_PUBLIC_KANDINSKY_API_KEY=xxx
 */
export class KandinskyService implements IMemeApiService {
  readonly name = 'Kandinsky';
  private readonly apiUrl = 'https://api-key.fusionbrain.ai/api/v1/text2image';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_KANDINSKY_API_KEY || '';
  }

  get config(): ServiceConfig {
    return {
      requiresApiKey: true,
      apiKeyEnvVar: 'NEXT_PUBLIC_KANDINSKY_API_KEY',
      rateLimit: 50,
      description: 'Kandinsky для генерации изображений',
    };
  }

  async generateImage(
    prompt: string,
    width: number = 512,
    height: number = 512
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Kandinsky API key not configured');
    }

    try {
      // Шаг 1: Отправка запроса на генерацию
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Key': `Key ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt + ', meme style, funny, high quality',
          negative_prompt: 'ugly, blurry, low quality',
          width,
          height,
          samples: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kandinsky API error: ${response.status}`);
      }

      const data = await response.json();
      const uuid = data.uuid;

      // Шаг 2: Ожидание готовности
      return await this.waitForImage(uuid);
    } catch (error) {
      console.error('Kandinsky error:', error);
      throw error;
    }
  }

  private async waitForImage(uuid: string, maxAttempts: number = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`${this.apiUrl}/status/${uuid}`, {
        headers: {
          'X-Key': `Key ${this.apiKey}`,
        },
      });

      const status = await statusResponse.json();

      if (status.status === 'DONE') {
        return status.images?.[0] || '';
      }

      if (status.status === 'FAIL') {
        throw new Error('Kandinsky generation failed');
      }
    }

    throw new Error('Kandinsky generation timeout');
  }

  async generateMemeText(): Promise<{ topText: string; bottomText: string }> {
    // Kandinsky только для изображений, используем фолбэк
    const responses = [
      { topText: 'КОГДА СКАЗАЛИ', bottomText: 'ПРОСТО СКОПИРУЙ' },
      { topText: 'Я В 3 ЧАСА НОЧИ', bottomText: 'ИСПРАВЛЯЮ БАГ' },
      { topText: 'НЕЙРОСЕТЬ', bottomText: 'СГЕНЕРИРОВАЛА' },
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async generateMeme(prompt: string): Promise<MemeGenerationResult> {
    const [imageUrl, textResponse] = await Promise.all([
      this.generateImage(prompt, 512, 512),
      this.generateMemeText(),
    ]);

    return {
      imageUrl,
      ...textResponse,
      provider: this.name,
    };
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}

export const kandinskyService = new KandinskyService();
