/**
 * 💰 POST /api/payment/create
 * Создание платежа для покупки кредитов или подписки
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { paymentFactory } from '@/services/payments';
import { creditService } from '@/services/app/CreditService';
import { subscriptionService } from '@/services/app/SubscriptionService';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPaymentSchema = z.object({
  type: z.enum(['credits', 'subscription']),
  amount: z.number().optional(), // Для credits
  plan: z.enum(['premium', 'pro']).optional(), // Для subscription
  provider: z.enum(['yookassa', 'stripe']).optional(),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await req.json();
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, amount, plan, provider, promoCode } = validation.data;
    let finalAmount = 0;
    let description = '';
    let metadata: Record<string, string> = {};

    // Обработка покупки кредитов
    if (type === 'credits') {
      if (!amount) {
        return NextResponse.json(
          { error: 'Укажите количество кредитов' },
          { status: 400 }
        );
      }

      const price = creditService.getCreditPackPrice(amount);
      if (!price) {
        return NextResponse.json(
          { error: 'Неверная сумма кредитов' },
          { status: 400 }
        );
      }

      finalAmount = price * 100; // Конвертация в копейки
      description = `Покупка ${amount} кредитов`;
      metadata = { type: 'credits', credits: amount.toString() };
    }

    // Обработка покупки подписки
    if (type === 'subscription') {
      if (!plan) {
        return NextResponse.json(
          { error: 'Укажите план подписки' },
          { status: 400 }
        );
      }

      const price = subscriptionService.getPlanPrice(plan);
      finalAmount = price * 100; // Конвертация в копейки
      description = `Подписка ${plan} на 30 дней`;
      metadata = { type: 'subscription', plan };
    }

    // Применение промокода
    if (promoCode) {
      const promoCodeData = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
      });

      if (promoCodeData && promoCodeData.isActive) {
        if (promoCodeData.expiresAt && new Date() > promoCodeData.expiresAt) {
          return NextResponse.json(
            { error: 'Промокод истёк' },
            { status: 400 }
          );
        }

        if (promoCodeData.usedCount >= promoCodeData.maxUses) {
          return NextResponse.json(
            { error: 'Промокод больше не действует' },
            { status: 400 }
          );
        }

        if (promoCodeData.type === 'discount') {
          const discount = promoCodeData.value;
          finalAmount = Math.round(finalAmount * (100 - discount) / 100);
          metadata.promoCode = promoCode.toUpperCase();
          metadata.discount = discount.toString();
        }
      }
    }

    // Создание платежа через выбранный провайдер
    const paymentProvider = provider
      ? paymentFactory.getProvider(provider)
      : paymentFactory.getDefaultProvider();

    const result = await paymentProvider.createPayment({
      amount: finalAmount,
      currency: 'RUB',
      description,
      userId,
      metadata,
    });

    // Сохранение платежа в БД
    await prisma.payment.create({
      data: {
        userId,
        amount: finalAmount,
        currency: 'RUB',
        status: 'pending',
        provider: paymentProvider.providerName,
        providerPaymentId: result.paymentId,
        description,
        metadata: JSON.stringify(metadata),
      },
    });

    return NextResponse.json({
      paymentId: result.paymentId,
      confirmationUrl: result.confirmationUrl,
      confirmationData: result.confirmationData,
      amount: finalAmount,
      currency: 'RUB',
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка создания платежа' },
      { status: 500 }
    );
  }
}
