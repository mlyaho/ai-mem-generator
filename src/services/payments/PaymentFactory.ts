/**
 * 💰 Фабрика платёжных сервисов
 * Реализует паттерн Factory + Abstract Factory
 * Автоматически выбирает провайдера на основе конфига
 */

import type { IPaymentService } from './IPaymentService';
import { YooKassaService } from './YooKassaService';
import { StripeService } from './StripeService';
import { MockPaymentService } from './mock/MockPaymentService';

export type PaymentProvider = 'yookassa' | 'stripe' | 'cloudpayments' | 'mock';

export interface PaymentFactoryConfig {
  defaultProvider: PaymentProvider;
  yookassa?: {
    shopId: string;
    apiKey: string;
    secretKey?: string;
  };
  stripe?: {
    apiKey: string;
    secretKey?: string;
  };
  mock?: {
    simulateSuccess?: boolean;
    simulateError?: boolean;
    processingDelay?: number;
    autoConfirmWebhooks?: boolean;
    enableLogging?: boolean;
  };
}

export class PaymentFactory {
  private static instance: PaymentFactory;
  private providers: Map<PaymentProvider, IPaymentService> = new Map();
  private defaultProvider: PaymentProvider;

  private constructor(config: PaymentFactoryConfig) {
    this.defaultProvider = config.defaultProvider;

    // Регистрация провайдеров
    if (config.yookassa) {
      this.providers.set(
        'yookassa',
        new YooKassaService(config.yookassa.shopId, config.yookassa.apiKey)
      );
    }

    if (config.stripe) {
      this.providers.set(
        'stripe',
        new StripeService(config.stripe.apiKey, config.stripe.secretKey)
      );
    }

    // Mock сервис для тестирования
    if (config.mock || process.env.NODE_ENV === 'test') {
      this.providers.set(
        'mock',
        new MockPaymentService(config.mock)
      );
    }
  }

  /**
   * Инициализация фабрики
   */
  static init(config: PaymentFactoryConfig): PaymentFactory {
    if (!PaymentFactory.instance) {
      PaymentFactory.instance = new PaymentFactory(config);
    }
    return PaymentFactory.instance;
  }

  /**
   * Получение экземпляра фабрики
   */
  static getInstance(): PaymentFactory {
    if (!PaymentFactory.instance) {
      throw new Error('PaymentFactory not initialized. Call init() first.');
    }
    return PaymentFactory.instance;
  }

  /**
   * Получение сервиса по провайдеру
   */
  getProvider(provider?: PaymentProvider): IPaymentService {
    const providerName = provider || this.defaultProvider;
    const service = this.providers.get(providerName);

    if (!service) {
      throw new Error(`Payment provider "${providerName}" not configured`);
    }

    return service;
  }

  /**
   * Получение провайдера по умолчанию
   */
  getDefaultProvider(): IPaymentService {
    return this.getProvider(this.defaultProvider);
  }

  /**
   * Проверка доступности всех провайдеров
   */
  async healthCheck(): Promise<Record<PaymentProvider, boolean>> {
    const result = {} as Record<PaymentProvider, boolean>;

    for (const [provider, service] of this.providers) {
      try {
        result[provider as PaymentProvider] = await service.healthCheck();
      } catch {
        result[provider as PaymentProvider] = false;
      }
    }

    return result;
  }

  /**
   * Список доступных провайдеров
   */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }
}

// Ленивая инициализация из переменных окружения
let _factory: PaymentFactory | null = null;

export function getPaymentFactory(): PaymentFactory {
  if (!_factory) {
    const config: PaymentFactoryConfig = {
      defaultProvider: (process.env.PAYMENT_PROVIDER as PaymentProvider) || 'mock',
      yookassa: process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_API_KEY ? {
        shopId: process.env.YOOKASSA_SHOP_ID,
        apiKey: process.env.YOOKASSA_API_KEY,
        secretKey: process.env.YOOKASSA_WEBHOOK_SECRET,
      } : undefined,
      stripe: process.env.STRIPE_SECRET_KEY ? {
        apiKey: process.env.STRIPE_SECRET_KEY,
        secretKey: process.env.STRIPE_WEBHOOK_SECRET,
      } : undefined,
      // Mock по умолчанию для development/test
      mock: process.env.NODE_ENV !== 'production' ? {
        simulateSuccess: process.env.MOCK_PAYMENT_SUCCESS !== 'false',
        simulateError: process.env.MOCK_PAYMENT_ERROR === 'true',
        processingDelay: parseInt(process.env.MOCK_PAYMENT_DELAY || '100', 10),
        autoConfirmWebhooks: process.env.MOCK_AUTO_CONFIRM !== 'false',
        enableLogging: process.env.MOCK_LOGGING === 'true',
      } : undefined,
    };

    _factory = PaymentFactory.init(config);
  }

  return _factory;
}

// Экспорт для использования в API
export const paymentFactory = getPaymentFactory();
