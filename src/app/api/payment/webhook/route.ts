/**
 * 💰 POST /api/payment/webhook
 * Вебхук для обработки уведомлений от платёжных систем
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentFactory } from '@/services/payments';
import { prisma } from '@/lib/prisma';
import { creditService } from '@/services/app/CreditService';
import { subscriptionService } from '@/services/app/SubscriptionService';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature') || '';
    const body = await req.json();

    // Определение провайдера из тела вебхука
    let providerName: string;

    if (body.provider) {
      providerName = body.provider;
    } else if (body.object?.id?.startsWith('pi_')) {
      providerName = 'stripe';
    } else {
      providerName = 'yookassa';
    }

    const paymentProvider = paymentFactory.getProvider(providerName as 'yookassa' | 'stripe');

    // Обработка вебхука
    const webhook = await paymentProvider.handleWebhook(body, signature);

    // Обновление платежа в БД
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: webhook.paymentId },
      include: { user: true },
    });

    if (!payment) {
      console.warn('Payment not found for webhook:', webhook.paymentId);
      return NextResponse.json({ received: true });
    }

    // Обновление статуса платежа
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: webhook.status,
        updatedAt: new Date(),
      },
    });

    // Обработка успешного платежа
    if (webhook.status === 'succeeded') {
      const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};

      if (metadata.type === 'credits') {
        // Начисление кредитов
        const credits = parseInt(metadata.credits, 10);
        await creditService.addCredits({
          userId: payment.userId,
          amount: credits,
          type: 'purchase',
          description: `Покупка кредитов (платёж ${payment.id})`,
        });
      } else if (metadata.type === 'subscription') {
        // Активация подписки
        const plan = metadata.plan as 'premium' | 'pro';
        await subscriptionService.createSubscription({
          userId: payment.userId,
          plan,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
