import { IMemeApiService } from './IMemeApiService';

/**
 * Доступные провайдеры API
 */
export type ApiProvider = 'pollinations' | 'yandex' | 'kandinsky' | 'gigachat';

/**
 * Конфигурация для фабрики API
 */
export interface ApiFactoryConfig {
  yandexApiKey?: string;
  gigachatClientId?: string;
  gigachatClientSecret?: string;
  kandinskyApiKey?: string;
}

/**
 * Фабрика для создания и управления API-сервисами
 * Предоставляет единый интерфейс для работы с разными провайдерами
 */
export class ApiFactory {
  private static instance: ApiFactory;
  private config: ApiFactoryConfig;
  private services: Map<ApiProvider, IMemeApiService> = new Map();
  private currentProvider: ApiProvider = 'pollinations';

  private constructor(config: ApiFactoryConfig = {}) {
    this.config = config;
  }

  /**
   * Получение singleton экземпляра фабрики
   */
  static getInstance(config?: ApiFactoryConfig): ApiFactory {
    if (!ApiFactory.instance) {
      ApiFactory.instance = new ApiFactory(config);
    }
    
    if (config) {
      ApiFactory.instance.config = config;
    }
    
    return ApiFactory.instance;
  }

  /**
   * Регистрация сервиса
   */
  register(provider: ApiProvider, service: IMemeApiService): void {
    this.services.set(provider, service);
  }

  /**
   * Получение сервиса по провайдеру
   */
  getService(provider?: ApiProvider): IMemeApiService {
    const targetProvider = provider || this.currentProvider;
    const service = this.services.get(targetProvider);
    
    if (!service) {
      throw new Error(`Service for provider "${targetProvider}" not found`);
    }
    
    return service;
  }

  /**
   * Получение текущего провайдера
   */
  getCurrentProvider(): ApiProvider {
    return this.currentProvider;
  }

  /**
   * Установка текущего провайдера
   */
  setProvider(provider: ApiProvider): void {
    if (!this.services.has(provider)) {
      throw new Error(`Service for provider "${provider}" not registered`);
    }
    this.currentProvider = provider;
  }

  /**
   * Список доступных провайдеров
   */
  getAvailableProviders(): ApiProvider[] {
    return Array.from(this.services.keys());
  }

  /**
   * Проверка доступности всех сервисов
   */
  async checkAllServices(): Promise<Map<ApiProvider, boolean>> {
    const results = new Map<ApiProvider, boolean>();
    
    for (const [provider, service] of this.services) {
      try {
        const isAvailable = await service.healthCheck();
        results.set(provider, isAvailable);
      } catch {
        results.set(provider, false);
      }
    }
    
    return results;
  }

  /**
   * Автоматический выбор доступного сервиса
   */
  async selectBestAvailableProvider(): Promise<ApiProvider> {
    const priority: ApiProvider[] = ['kandinsky', 'yandex', 'gigachat', 'pollinations'];
    
    for (const provider of priority) {
      if (!this.services.has(provider)) continue;
      
      try {
        const service = this.services.get(provider)!;
        const isAvailable = await service.healthCheck();
        
        if (isAvailable) {
          this.currentProvider = provider;
          return provider;
        }
      } catch {
        continue;
      }
    }
    
    // Fallback на текущий
    return this.currentProvider;
  }
}

// Экспорт singleton для удобства
export const apiFactory = ApiFactory.getInstance();
