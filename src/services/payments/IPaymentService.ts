/**
 * 💰 Интерфейс платёжного сервиса
 * Определяет контракт для всех платёжных провайдеров
 */

export interface PaymentIntent {
  id: string;
  amount: number;      // В копейках/центах
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'sbp' | 'crypto' | 'other';
  last4?: string;
  brand?: string;
}

export interface CreatePaymentOptions {
  amount: number;           // В копейках/центах
  currency: 'RUB' | 'USD' | 'EUR';
  description: string;
  userId: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  paymentId: string;
  confirmationUrl?: string;  // Для редиректа пользователя
  confirmationData?: object; // Для виджета оплаты
}

export interface RefundOptions {
  paymentId: string;
  amount?: number;  // Если не указано - полный возврат
  description?: string;
}

export interface PaymentWebhook {
  paymentId: string;
  status: 'succeeded' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  rawBody: unknown;
}

export interface IPaymentService {
  /**
   * Название провайдера
   */
  readonly providerName: string;

  /**
   * Создание платежа
   */
  createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;

  /**
   * Получение статуса платежа
   */
  getPaymentStatus(paymentId: string): Promise<PaymentIntent>;

  /**
   * Возврат средств
   */
  refund(options: RefundOptions): Promise<void>;

  /**
   * Обработка вебхука от платёжной системы
   */
  handleWebhook(body: unknown, signature: string): Promise<PaymentWebhook>;

  /**
   * Проверка доступности сервиса
   */
  healthCheck(): Promise<boolean>;
}
