/**
 * 💰 Базовый класс для платёжных сервисов
 * Предоставляет общую логику и утилиты
 */

import { IPaymentService, CreatePaymentOptions, CreatePaymentResult, RefundOptions, PaymentIntent, PaymentWebhook } from './IPaymentService';

export abstract class BasePaymentService implements IPaymentService {
  abstract readonly providerName: string;

  protected readonly apiKey: string;
  protected readonly secretKey?: string;

  constructor(apiKey: string, secretKey?: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  abstract createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentIntent>;
  abstract refund(options: RefundOptions): Promise<void>;
  abstract handleWebhook(body: unknown, signature: string): Promise<PaymentWebhook>;
  abstract healthCheck(): Promise<boolean>;

  /**
   * Конвертация рублей в копейки
   */
  protected rubToKopecks(rub: number): number {
    return Math.round(rub * 100);
  }

  /**
   * Конвертация копеек в рубли
   */
  protected kopecksToRub(kopecks: number): number {
    return kopecks / 100;
  }

  /**
   * Генерация идемпотентности ключа
   */
  protected generateIdempotencyKey(prefix: string = 'payment'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Логирование (можно переопределить для использования Winston/etc)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.providerName}] [${level.toUpperCase()}] ${message}`, data ?? '');
  }

  /**
   * Проверка подписи вебхука (переопределяется в наследниках)
   */
  protected verifyWebhookSignature(body: unknown, signature: string): boolean {
    // Реализация зависит от провайдера
    return true;
  }
}
