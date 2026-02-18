'use client';

import { apiFactory, pollinationsService } from '@/services';

/**
 * Инициализация API-сервисов
 * Регистрирует все доступные сервисы в фабрике
 */
export function initializeApiServices() {
  // Регистрируем все сервисы
  apiFactory.register('pollinations', pollinationsService);
  
  // Остальные сервисы можно раскомментировать при наличии ключей
  // apiFactory.register('yandex', yandexGPTService);
  // apiFactory.register('kandinsky', kandinskyService);
  // apiFactory.register('gigachat', gigaChatService);
  
  return apiFactory;
}
