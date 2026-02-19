/**
 * 🧪 Mock платёжный сервис для тестирования
 * Имитирует работу платёжной системы без реальных платежей
 */

import { BasePaymentService } from '../BasePaymentService';
import type {
  CreatePaymentOptions,
  CreatePaymentResult,
  PaymentIntent,
  RefundOptions,
  PaymentWebhook,
} from '../IPaymentService';
import type { IMockPaymentConfig, MockPaymentState } from './IMockPaymentConfig';

export class MockPaymentService extends BasePaymentService {
  readonly providerName = 'mock';

  private config: IMockPaymentConfig;
  private payments: Map<string, MockPaymentState> = new Map();
  private webhooks: Array<PaymentWebhook> = [];

  constructor(config: IMockPaymentConfig = {}) {
    super('mock-api-key', 'mock-secret-key');
    this.config = {
      simulateSuccess: true,
      simulateError: false,
      processingDelay: 100,
      autoConfirmWebhooks: true,
      enableLogging: false,
      ...config,
    };
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(config: Partial<IMockPaymentConfig>) {
    this.config = { ...this.config, ...config };
    this.log('info', 'Config updated', this.config);
  }

  /**
   * Создание тестового платежа
   */
  async createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    this.log('info', 'Creating payment', options);

    // Симуляция задержки
    if (this.config.processingDelay) {
      await this.delay(this.config.processingDelay);
    }

    // Симуляция ошибки
    if (this.config.simulateError) {
      this.log('error', 'Payment simulation failed');
      throw new Error('Payment simulation failed: insufficient funds');
    }

    const paymentId = `mock_payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payment: MockPaymentState = {
      id: paymentId,
      amount: options.amount,
      currency: options.currency,
      status: 'pending',
      description: options.description,
      metadata: options.metadata,
      createdAt: new Date(),
    };

    this.payments.set(paymentId, payment);

    // Симуляция подтверждения
    if (this.config.autoConfirmWebhooks) {
      setTimeout(() => {
        this.confirmPayment(paymentId);
      }, this.config.processingDelay || 100);
    }

    return {
      paymentId,
      confirmationUrl: `http://localhost:3000/payment/confirm/${paymentId}`,
      confirmationData: { mock: true, paymentId },
    };
  }

  /**
   * Подтверждение платежа (для тестов)
   */
  confirmPayment(paymentId: string): MockPaymentState | null {
    const payment = this.payments.get(paymentId);
    if (!payment) return null;

    payment.status = 'succeeded';
    payment.confirmedAt = new Date();
    this.payments.set(paymentId, payment);

    this.log('info', 'Payment confirmed', { paymentId });

    // Генерация вебхука
    const webhook: PaymentWebhook = {
      paymentId,
      status: 'succeeded',
      amount: payment.amount,
      currency: payment.currency,
      metadata: payment.metadata,
      rawBody: { type: 'payment.succeeded', object: payment },
    };

    this.webhooks.push(webhook);

    return payment;
  }

  /**
   * Получение статуса платежа
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    this.log('info', 'Getting payment status', { paymentId });

    const payment = this.payments.get(paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Маппинг статусов
    const statusMap: Record<string, PaymentIntent['status']> = {
      pending: 'pending',
      succeeded: 'succeeded',
      failed: 'failed',
      refunded: 'succeeded', // Для совместимости
    };

    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: statusMap[payment.status] || 'pending',
      description: payment.description,
      metadata: payment.metadata,
    };
  }

  /**
   * Возврат средств
   */
  async refund(options: RefundOptions): Promise<void> {
    this.log('info', 'Refunding payment', options);

    const payment = this.payments.get(options.paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw new Error('Can only refund succeeded payments');
    }

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    this.payments.set(options.paymentId, payment);

    // Генерация вебхука
    const webhook: PaymentWebhook = {
      paymentId: options.paymentId,
      status: 'refunded',
      amount: options.amount || payment.amount,
      currency: payment.currency,
      metadata: { reason: options.description || 'Refund' },
      rawBody: { type: 'payment.refunded', object: payment },
    };

    this.webhooks.push(webhook);
  }

  /**
   * Обработка вебхука
   */
  async handleWebhook(body: unknown, signature: string): Promise<PaymentWebhook> {
    this.log('info', 'Handling webhook', { body, signature });

    const bodyAny = body as any;
    const paymentId = bodyAny?.object?.id || bodyAny?.paymentId;

    if (!paymentId) {
      throw new Error('Invalid webhook: no paymentId');
    }

    const webhook = this.webhooks.find(w => w.paymentId === paymentId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return webhook;
  }

  /**
   * Проверка доступности сервиса
   */
  async healthCheck(): Promise<boolean> {
    return true; // Mock сервис всегда "доступен"
  }

  /**
   * Получить все тестовые платежи
   */
  getAllPayments(): MockPaymentState[] {
    return Array.from(this.payments.values());
  }

  /**
   * Получить все вебхуки
   */
  getAllWebhooks(): PaymentWebhook[] {
    return this.webhooks;
  }

  /**
   * Очистить состояние (для тестов)
   */
  clearState() {
    this.payments.clear();
    this.webhooks = [];
    this.log('info', 'State cleared');
  }

  /**
   * Установить состояние платежа (для тестов)
   */
  setPaymentState(paymentId: string, state: Partial<MockPaymentState>) {
    const existing = this.payments.get(paymentId);
    if (existing) {
      this.payments.set(paymentId, { ...existing, ...state });
    } else {
      this.payments.set(paymentId, {
        id: paymentId,
        amount: 0,
        currency: 'RUB',
        status: 'pending',
        description: '',
        createdAt: new Date(),
        ...state,
      });
    }
  }

  /**
   * Симуляция успешной оплаты
   */
  async simulateSuccessfulPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    this.updateConfig({ simulateSuccess: true, simulateError: false });
    return this.createPayment(options);
  }

  /**
   * Симуляция неудачной оплаты
   */
  async simulateFailedPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    this.updateConfig({ simulateSuccess: false, simulateError: true });
    try {
      return await this.createPayment(options);
    } catch (error) {
      this.log('info', 'Payment failed as expected', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected override log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    if (this.config.enableLogging) {
      super.log(level, message, data);
    }
  }
}

// Singleton экземпляр для тестов
export const mockPaymentService = new MockPaymentService({
  enableLogging: true,
  autoConfirmWebhooks: true,
});
