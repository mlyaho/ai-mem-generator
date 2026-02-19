/**
 * 💰 Конфигурация для MockPaymentService
 */
export interface IMockPaymentConfig {
  /**
   * Симулировать успешную оплату
   */
  simulateSuccess?: boolean;

  /**
   * Симулировать ошибку оплаты
   */
  simulateError?: boolean;

  /**
   * Симулировать задержку обработки (мс)
   */
  processingDelay?: number;

  /**
   * Автоматически подтверждать вебхуки
   */
  autoConfirmWebhooks?: boolean;

  /**
   * Логировать все операции
   */
  enableLogging?: boolean;
}

/**
 * Состояние тестового платежа
 */
export interface MockPaymentState {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  confirmedAt?: Date;
  refundedAt?: Date;
}
