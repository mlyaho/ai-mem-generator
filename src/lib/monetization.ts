/**
 * 🔒 Middleware для проверки лимитов монетизации
 * Проверяет подписку и кредиты перед выполнением действий
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { subscriptionService } from '@/services/app/SubscriptionService';
import { creditService } from '@/services/app/CreditService';

export interface MonetizationLimit {
  action: string;
  requiredCredits: number;
  requiredPlan?: 'free' | 'premium' | 'pro';
}

export interface MonetizationCheckResult {
  allowed: boolean;
  reason?: 'auth' | 'subscription' | 'credits';
  message?: string;
  remaining?: number;
  upgradeRequired?: 'premium' | 'pro';
}

/**
 * Проверка лимитов монетизации
 */
export async function checkMonetizationLimit(
  req: NextRequest,
  limit: MonetizationLimit
): Promise<MonetizationCheckResult | null> {
  const session = await auth();

  // Проверка авторизации
  if (!session?.user?.id) {
    return {
      allowed: false,
      reason: 'auth',
      message: 'Требуется авторизация',
    };
  }

  const userId = session.user.id;

  // Проверка подписки
  if (limit.requiredPlan) {
    const hasSubscription = await subscriptionService.hasActiveSubscription(
      userId,
      limit.requiredPlan
    );

    if (!hasSubscription) {
      const subscription = await subscriptionService.getSubscription(userId);
      const currentPlan = subscription?.plan || 'free';

      // Определяем какой план нужен для апгрейда
      const planOrder = { free: 0, premium: 1, pro: 2 } as const;
      const upgradeRequired = planOrder[limit.requiredPlan] > planOrder[currentPlan as 'free' | 'premium' | 'pro']
        ? limit.requiredPlan as 'premium' | 'pro'
        : undefined;

      return {
        allowed: false,
        reason: 'subscription',
        message: `Требуется подписка ${limit.requiredPlan}`,
        upgradeRequired,
      };
    }
  }

  // Проверка кредитов
  if (limit.requiredCredits > 0) {
    const hasEnough = await creditService.hasEnoughCredits(userId, limit.requiredCredits);

    if (!hasEnough) {
      const balance = await creditService.getBalance(userId);
      return {
        allowed: false,
        reason: 'credits',
        message: `Недостаточно кредитов. Требуется: ${limit.requiredCredits}, доступно: ${balance?.balance || 0}`,
        remaining: balance?.balance || 0,
      };
    }
  }

  // Все проверки пройдены
  return null;
}

/**
 * HOC для защиты API endpoints с проверкой монетизации
 */
export function withMonetizationCheck<T extends NextResponse>(
  handler: (req: NextRequest) => Promise<T>,
  limit: MonetizationLimit
) {
  return async (req: NextRequest): Promise<T | NextResponse> => {
    const checkResult = await checkMonetizationLimit(req, limit);

    if (checkResult && !checkResult.allowed) {
      switch (checkResult.reason) {
        case 'auth':
          return NextResponse.json(
            { error: checkResult.message },
            { status: 401 }
          ) as T;

        case 'subscription':
          return NextResponse.json(
            {
              error: checkResult.message,
              upgradeRequired: checkResult.upgradeRequired,
            },
            { status: 403 }
          ) as T;

        case 'credits':
          return NextResponse.json(
            {
              error: checkResult.message,
              remaining: checkResult.remaining,
            },
            { status: 402 }
          ) as T;

        default:
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          ) as T;
      }
    }

    return handler(req);
  };
}

/**
 * Список действий и их стоимость
 */
export const ACTION_COSTS = {
  GENERATE_TEXT: { action: 'generate_text', requiredCredits: 1 },
  GENERATE_IMAGE: { action: 'generate_image', requiredCredits: 2 },
  GENERATE_MEME: { action: 'generate_meme', requiredCredits: 3 },
  GENERATE_MEME_HD: { action: 'generate_meme_hd', requiredCredits: 4 },
  GENERATE_MEME_ULTRA_HD: { action: 'generate_meme_ultra_hd', requiredCredits: 5 },
  REMOVE_WATERMARK: { action: 'remove_watermark', requiredCredits: 5 },
  PRIORITY_GENERATION: { action: 'priority_generation', requiredCredits: 2 },
} as const;
