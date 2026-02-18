/**
 * Интерфейс для ответа генерации мема
 */
export interface MemeGenerationResult {
  imageUrl: string;
  topText: string;
  bottomText: string;
  provider: string;
}

/**
 * Абстрактный интерфейс для API-сервисов генерации мемов
 */
export interface IMemeApiService {
  /**
   * Название сервиса (для UI и логирования)
   */
  readonly name: string;

  /**
   * Генерация полного мема (изображение + текст)
   */
  generateMeme(prompt: string): Promise<MemeGenerationResult>;

  /**
   * Генерация изображения по запросу
   */
  generateImage(prompt: string, width?: number, height?: number): Promise<string>;

  /**
   * Генерация текста для мема
   */
  generateMemeText(prompt: string): Promise<{ topText: string; bottomText: string }>;

  /**
   * Проверка доступности сервиса
   */
  healthCheck(): Promise<boolean>;

  /**
   * Настройки сервиса (требуется ли ключ и т.д.)
   */
  get config(): ServiceConfig;
}

/**
 * Конфигурация сервиса
 */
export interface ServiceConfig {
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  rateLimit?: number; // запросов в минуту
  description: string;
}
