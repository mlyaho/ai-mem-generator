/**
 * 💎 Subscription Service
 * Бизнес-логика управления подписками
 */

import { prisma } from '@/lib/prisma';
import type { Subscription, User } from '@prisma/client';

export type PlanType = 'free' | 'premium' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trialing';

export interface CreateSubscriptionOptions {
  userId: string;
  plan: PlanType;
  trialDays?: number;
}

export interface UpdateSubscriptionOptions {
  plan?: PlanType;
  status?: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionWithUser extends Subscription {
  user: Pick<User, 'id' | 'email' | 'name' | 'image'>;
}

export class SubscriptionService {
  private readonly PLAN_PRICES = {
    free: 0,
    premium: 299,
    pro: 599,
  } as const;

  private readonly PLAN_LIMITS = {
    free: {
      aiGenerationsPerDay: 3,
      savedMemes: 10,
      maxResolution: 512,
      watermark: true,
      priority: 'normal',
    },
    premium: {
      aiGenerationsPerDay: 50,
      savedMemes: Infinity,
      maxResolution: 1024,
      watermark: false,
      priority: 'high',
    },
    pro: {
      aiGenerationsPerDay: Infinity,
      savedMemes: Infinity,
      maxResolution: 2048,
      watermark: false,
      priority: 'vip',
    },
  } as const;

  /**
   * Создание подписки
   */
  async createSubscription(options: CreateSubscriptionOptions): Promise<Subscription> {
    const { userId, plan, trialDays = 0 } = options;

    const currentPeriodEnd = trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const status: SubscriptionStatus = trialDays > 0 ? 'trialing' : 'active';

    // Используем upsert для обновления существующей подписки
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      create: {
        userId,
        plan,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    return subscription;
  }

  /**
   * Получение подписки пользователя
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      // Возвращаем подписку free по умолчанию
      return this.createDefaultFreeSubscription(userId);
    }

    // Проверка истечения подписки
    if (subscription.status === 'active' && subscription.currentPeriodEnd) {
      if (new Date() > subscription.currentPeriodEnd) {
        return this.expireSubscription(userId);
      }
    }

    return subscription;
  }

  /**
   * Обновление подписки
   */
  async updateSubscription(
    userId: string,
    options: UpdateSubscriptionOptions
  ): Promise<Subscription> {
    const updateData: Record<string, unknown> = {};

    if (options.plan) {
      updateData.plan = options.plan;
      // При смене плана сбрасываем период
      updateData.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (options.status) {
      updateData.status = options.status;
    }

    if (options.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = options.cancelAtPeriodEnd;
      if (options.cancelAtPeriodEnd) {
        updateData.cancelledAt = new Date();
      }
    }

    return prisma.subscription.update({
      where: { userId },
      data: updateData,
    });
  }

  /**
   * Отмена подписки
   */
  async cancelSubscription(userId: string, immediate = false): Promise<Subscription> {
    const subscription = await this.getSubscription(userId);

    if (!subscription || subscription.plan === 'free') {
      throw new Error('No active subscription to cancel');
    }

    if (immediate) {
      return prisma.subscription.update({
        where: { userId },
        data: {
          status: 'cancelled',
          cancelAtPeriodEnd: false,
          cancelledAt: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    }

    // Отмена в конце периода
    return prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Продление подписки
   */
  async renewSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(userId);

    if (!subscription || subscription.plan === 'free') {
      throw new Error('No active subscription to renew');
    }

    return prisma.subscription.update({
      where: { userId },
      data: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
  }

  /**
   * Проверка активной подписки
   */
  async hasActiveSubscription(userId: string, plan?: PlanType): Promise<boolean> {
    const subscription = await this.getSubscription(userId);

    if (!subscription) return false;
    if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) return false;

    if (plan) {
      const planOrder = { free: 0, premium: 1, pro: 2 } as const;
      return planOrder[subscription.plan as PlanType] >= planOrder[plan];
    }

    return true;
  }

  /**
   * Получение лимитов плана
   */
  getPlanLimits(plan: PlanType) {
    return this.PLAN_LIMITS[plan];
  }

  /**
   * Получение цены плана
   */
  getPlanPrice(plan: PlanType): number {
    return this.PLAN_PRICES[plan];
  }

  /**
   * Проверка лимита генераций
   */
  async checkGenerationLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const subscription = await this.getSubscription(userId);
    const plan = (subscription?.plan as PlanType) || 'free';
    const limits = this.PLAN_LIMITS[plan];

    if (limits.aiGenerationsPerDay === Infinity) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }

    // Подсчёт генераций за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Здесь можно добавить подсчёт из CreditTransaction
    // Для простоты возвращаем оставшееся количество
    const usedToday = 0; // TODO: реализовать подсчёт
    const remaining = Math.max(0, limits.aiGenerationsPerDay - usedToday);

    const resetAt = new Date(today);
    resetAt.setDate(resetAt.getDate() + 1);

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    };
  }

  /**
   * Создание подписки free по умолчанию
   */
  private async createDefaultFreeSubscription(userId: string): Promise<Subscription> {
    return prisma.subscription.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        plan: 'free',
        status: 'active',
      },
    });
  }

  /**
   * Истечение подписки
   */
  private async expireSubscription(userId: string): Promise<Subscription> {
    return prisma.subscription.update({
      where: { userId },
      data: {
        status: 'expired',
        plan: 'free',
        currentPeriodEnd: null,
      },
    });
  }
}

// Singleton экземпляр
export const subscriptionService = new SubscriptionService();
