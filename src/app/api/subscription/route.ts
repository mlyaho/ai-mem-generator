/**
 * 💎 GET /api/subscription
 * Получение информации о подписке
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
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
    const subscription = await subscriptionService.getSubscription(userId);

    const limits = subscriptionService.getPlanLimits(
      (subscription?.plan as 'free' | 'premium' | 'pro') || 'free'
    );

    return NextResponse.json({
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
      },
      limits: {
        aiGenerationsPerDay: limits.aiGenerationsPerDay,
        savedMemes: limits.savedMemes,
        maxResolution: limits.maxResolution,
        watermark: limits.watermark,
        priority: limits.priority,
      },
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка получения подписки' },
      { status: 500 }
    );
  }
}
