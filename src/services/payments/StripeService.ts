/**
 * 💳 Stripe платёжный сервис
 * Документация: https://stripe.com/docs/api
 */

import { BasePaymentService } from './BasePaymentService';
import type {
  CreatePaymentOptions,
  CreatePaymentResult,
  PaymentIntent,
  RefundOptions,
  PaymentWebhook,
} from './IPaymentService';

interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  description?: string;
  metadata?: Record<string, string>;
  client_secret?: string;
}

interface StripeWebhook {
  id: string;
  type: string;
  data: {
    object: StripePaymentIntent;
  };
}

export class StripeService extends BasePaymentService {
  readonly providerName = 'stripe';
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey: string, secretKey?: string) {
    super(apiKey, secretKey);
  }

  async createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult> {
    const formData = new URLSearchParams();
    formData.append('amount', options.amount.toString());
    formData.append('currency', options.currency.toLowerCase());
    formData.append('description', options.description);
    formData.append('metadata[user_id]', options.userId);

    if (options.metadata) {
      Object.entries(options.metadata).forEach(([key, value]) => {
        formData.append(`metadata[${key}]`, value);
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        this.log('error', 'Stripe create payment error', error);
        throw new Error(error.error?.message || 'Payment creation failed');
      }

      const payment: StripePaymentIntent = await response.json();

      return {
        paymentId: payment.id,
        confirmationData: payment.client_secret ? {
          clientSecret: payment.client_secret,
        } : undefined,
      };
    } catch (error) {
      this.log('error', 'Stripe create payment failed', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_intents/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Payment not found');
      }

      const payment: StripePaymentIntent = await response.json();

      return {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency.toUpperCase(),
        status: this.mapStatus(payment.status),
        description: payment.description,
        metadata: payment.metadata,
      };
    } catch (error) {
      this.log('error', 'Stripe get payment status failed', error);
      throw error;
    }
  }

  async refund(options: RefundOptions): Promise<void> {
    const formData = new URLSearchParams();
    
    if (options.amount) {
      formData.append('amount', options.amount.toString());
    }
    if (options.description) {
      formData.append('description', options.description);
    }

    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Refund failed');
      }

      this.log('info', `Refund processed for payment ${options.paymentId}`);
    } catch (error) {
      this.log('error', 'Stripe refund failed', error);
      throw error;
    }
  }

  async handleWebhook(body: unknown, signature: string): Promise<PaymentWebhook> {
    // Проверка подписи Stripe
    if (!this.verifyWebhookSignature(body, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const webhook = body as StripeWebhook;
    const payment = webhook.data.object;

    return {
      paymentId: payment.id,
      status: payment.status === 'succeeded' ? 'succeeded' : 'failed',
      amount: payment.amount,
      currency: payment.currency.toUpperCase(),
      metadata: payment.metadata,
      rawBody: body,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/balance`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected override verifyWebhookSignature(body: unknown, signature: string): boolean {
    if (!this.secretKey) {
      this.log('warn', 'Stripe webhook secret not configured, skipping signature verification');
      return true;
    }

    const crypto = require('crypto');
    const payload = JSON.stringify(body);
    
    // Stripe использует формат: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signedPayload = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signedPayload) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return signedPayload === expectedSignature;
  }

  private mapStatus(status: string): PaymentIntent['status'] {
    const statusMap: Record<string, PaymentIntent['status']> = {
      succeeded: 'succeeded',
      processing: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      requires_payment_method: 'failed',
      canceled: 'failed',
    };
    return statusMap[status] || 'pending';
  }
}
