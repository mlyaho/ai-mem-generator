/**
 * 💰 GET /api/payment/balance
 * Получение баланса кредитов пользователя
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { creditService } from '@/services/app/CreditService';
import { subscriptionService } from '@/services/app/SubscriptionService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Получение баланса и подписки параллельно
    const [balance, subscription, transactions] = await Promise.all([
      creditService.getBalance(userId),
      subscriptionService.getSubscription(userId),
      creditService.getTransactionHistory(userId, 10, 0),
    ]);

    // Проверка лимита генераций
    const generationLimit = await subscriptionService.checkGenerationLimit(userId);

    return NextResponse.json({
      balance: {
        current: balance?.balance || 0,
        lifetime: balance?.lifetime || 0,
      },
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      },
      limits: {
        remaining: generationLimit.remaining,
        resetAt: generationLimit.resetAt,
      },
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения баланса' },
      { status: 500 }
    );
  }
}
