/**
 * 💎 POST /api/subscription/cancel
 * Отмена подписки
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { subscriptionService } from '@/services/app/SubscriptionService';
import { z } from 'zod';

const cancelSchema = z.object({
  immediate: z.boolean().optional(),
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
    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { immediate = false } = validation.data;

    const subscription = await subscriptionService.cancelSubscription(
      userId,
      immediate
    );

    return NextResponse.json({
      message: immediate
        ? 'Подписка отменена немедленно'
        : 'Подписка будет отменена в конце периода',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Subscription cancel error:', error);
    return NextResponse.json(
      { error: 'Ошибка отмены подписки' },
      { status: 500 }
    );
  }
}
