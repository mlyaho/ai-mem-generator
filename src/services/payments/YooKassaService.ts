/**
 * 💳 YooKassa платёжный сервис
 * Документация: https://yookassa.ru/developers/api
 */

import { BasePaymentService } from './BasePaymentService';
import type {
  CreatePaymentOptions,
  CreatePaymentResult,
  PaymentIntent,
  RefundOptions,
  PaymentWebhook,
} from './IPaymentService';

interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | 'failed';
  amount: {
    value: string;
    currency: 'RUB' | 'USD' | 'EUR';
  };
  description?: string;
  metadata?: Record<string, string>;
  created_at: string;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
}

interface YooKassaWebhook {
  type: string;
  event: string;
  object: YooKassaPayment;
}

export class YooKassaService extends BasePaymentService {
  readonly providerName = 'yookassa';
  private readonly shopId: string;
  private readonly baseUrl = 'https://api.yookassa.ru/v3';

  constructor(shopId: string, apiKey: string, secretKey?: string) {
    super(apiKey, secretKey);
    this.shopId = shopId;
  }

  async createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    const idempotencyKey = this.generateIdempotencyKey();

    const requestBody = {
      amount: {
        value: (options.amount / 100).toFixed(2),
        currency: options.currency,
      },
      capture: true,
      description: options.description,
      metadata: {
        user_id: options.userId,
        ...options.metadata,
      },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.NEXTAUTH_URL}/payment/success`,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotencyKey,
          Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        this.log('error', 'YooKassa create payment error', error);
        throw new Error(error.description || 'Payment creation failed');
      }

      const payment: YooKassaPayment = await response.json();

      return {
        paymentId: payment.id,
        confirmationUrl: payment.confirmation?.confirmation_url,
      };
    } catch (error) {
      this.log('error', 'YooKassa create payment failed', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Payment not found');
      }

      const payment: YooKassaPayment = await response.json();

      return {
        id: payment.id,
        amount: Math.round(parseFloat(payment.amount.value) * 100),
        currency: payment.amount.currency,
        status: this.mapStatus(payment.status),
        description: payment.description,
        metadata: payment.metadata,
      };
    } catch (error) {
      this.log('error', 'YooKassa get payment status failed', error);
      throw error;
    }
  }

  async refund(options: RefundOptions): Promise<void> {
    const paymentStatus = await this.getPaymentStatus(options.paymentId);

    const requestBody = {
      amount: {
        value: (options.amount || paymentStatus.amount) / 100,
        currency: paymentStatus.currency,
      },
      description: options.description || 'Refund',
    };

    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64')}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Refund failed');
      }

      this.log('info', `Refund processed for payment ${options.paymentId}`);
    } catch (error) {
      this.log('error', 'YooKassa refund failed', error);
      throw error;
    }
  }

  async handleWebhook(body: unknown, signature: string): Promise<PaymentWebhook> {
    // Проверка подписи (YooKassa использует HMAC-SHA256)
    if (!this.verifyWebhookSignature(body, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const webhook = body as YooKassaWebhook;
    const payment = webhook.object;

    return {
      paymentId: payment.id,
      status: payment.status === 'succeeded' ? 'succeeded' : 'failed',
      amount: Math.round(parseFloat(payment.amount.value) * 100),
      currency: payment.amount.currency,
      metadata: payment.metadata,
      rawBody: body,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Простая проверка доступности API
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.shopId}:${this.apiKey}`).toString('base64')}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected override verifyWebhookSignature(body: unknown, signature: string): boolean {
    if (!this.secretKey) {
      this.log('warn', 'YooKassa secret key not configured, skipping signature verification');
      return true;
    }

    const crypto = require('crypto');
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  private mapStatus(status: string): PaymentIntent['status'] {
    const statusMap: Record<string, PaymentIntent['status']> = {
      succeeded: 'succeeded',
      pending: 'pending',
      waiting_for_capture: 'pending',
      canceled: 'failed',
      failed: 'failed',
    };
    return statusMap[status] || 'pending';
  }
}
