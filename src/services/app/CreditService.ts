/**
 * 💰 Credit Service
 * Бизнес-логика управления кредитами
 */

import { prisma } from '@/lib/prisma';
import type { CreditBalance, CreditTransaction } from '@prisma/client';

export type CreditTransactionType = 'purchase' | 'generation' | 'referral' | 'bonus' | 'refund';

export interface AddCreditsOptions {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
}

export interface SpendCreditsOptions {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string;
}

export interface CreditBalanceWithUser extends CreditBalance {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export class CreditService {
  /**
   * Стоимость кредитов в рублях
   */
  private readonly CREDIT_PRICES = {
    10: 99,
    50: 399,
    200: 999,
    1000: 3999,
  } as const;

  /**
   * Стоимость действий в кредитах
   */
  private readonly ACTION_COSTS = {
    textGeneration: 1,
    imageGeneration: 2,
    memeGeneration: 3,
    hdUpgrade: 1,
    ultraHdUpgrade: 2,
    watermarkRemoval: 5,
    priorityGeneration: 2,
  } as const;

  /**
   * Получение баланса пользователя
   */
  async getBalance(userId: string): Promise<CreditBalance | null> {
    let balance = await prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      // Создаём баланс по умолчанию
      balance = await prisma.creditBalance.create({
        data: {
          userId,
          balance: 0,
          lifetime: 0,
        },
      });
    }

    return balance;
  }

  /**
   * Начисление кредитов
   */
  async addCredits(options: AddCreditsOptions): Promise<CreditBalance> {
    const { userId, amount, type, description } = options;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return prisma.$transaction(async (tx) => {
      // Обновляем баланс
      const balance = await tx.creditBalance.upsert({
        where: { userId },
        update: {
          balance: { increment: amount },
          lifetime: { increment: amount },
        },
        create: {
          userId,
          balance: amount,
          lifetime: amount,
        },
      });

      // Создаём транзакцию
      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          type,
          description,
          balance: balance.balance,
        },
      });

      return balance;
    });
  }

  /**
   * Списание кредитов
   */
  async spendCredits(options: SpendCreditsOptions): Promise<CreditBalance> {
    const { userId, amount, type, description } = options;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({
        where: { userId },
      });

      if (!balance || balance.balance < amount) {
        throw new Error('Insufficient credits');
      }

      // Обновляем баланс
      const updatedBalance = await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
        },
      });

      // Создаём транзакцию
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount, // Отрицательное значение для списания
          type,
          description,
          balance: updatedBalance.balance,
        },
      });

      return updatedBalance;
    });
  }

  /**
   * Возврат кредитов
   */
  async refundCredits(
    userId: string,
    amount: number,
    description: string,
    transactionId?: string
  ): Promise<CreditBalance> {
    return this.addCredits({
      userId,
      amount,
      type: 'refund',
      description: transactionId
        ? `Возврат за транзакцию ${transactionId}: ${description}`
        : description,
    });
  }

  /**
   * Проверка достаточности кредитов
   */
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return (balance?.balance || 0) >= amount;
  }

  /**
   * Получение истории транзакций
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<CreditTransaction[]> {
    return prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Получение цены пакета кредитов
   */
  getCreditPackPrice(amount: number): number | null {
    const prices = this.CREDIT_PRICES as Record<string, number>;
    return prices[amount.toString()] || null;
  }

  /**
   * Доступные пакеты кредитов
   */
  getAvailableCreditPacks(): Array<{ amount: number; price: number; bonus: number }> {
    return Object.entries(this.CREDIT_PRICES).map(([amountStr, price]) => {
      const amount = parseInt(amountStr, 10);
      const basePrice = 9.9 * amount; // Базовая цена без скидки
      const bonus = Math.round((basePrice - price) / (price / amount));
      return { amount, price, bonus };
    });
  }

  /**
   * Стоимость генерации мема
   */
  getMemeGenerationCost(options: {
    withText: boolean;
    withImage: boolean;
    hd?: boolean;
    ultraHd?: boolean;
    priority?: boolean;
  }): number {
    let cost = 0;

    if (options.withText && options.withImage) {
      cost = this.ACTION_COSTS.memeGeneration;
    } else if (options.withImage) {
      cost = this.ACTION_COSTS.imageGeneration;
    } else if (options.withText) {
      cost = this.ACTION_COSTS.textGeneration;
    }

    if (options.ultraHd) {
      cost += this.ACTION_COSTS.ultraHdUpgrade;
    } else if (options.hd) {
      cost += this.ACTION_COSTS.hdUpgrade;
    }

    if (options.priority) {
      cost += this.ACTION_COSTS.priorityGeneration;
    }

    return cost;
  }

  /**
   * Начисление бонусных кредитов за реферала
   */
  async awardReferralBonus(referrerId: string, refereeId: string): Promise<void> {
    const REFERRER_BONUS = 50;
    const REFEREE_BONUS = 5;

    await Promise.all([
      this.addCredits({
        userId: referrerId,
        amount: REFERRER_BONUS,
        type: 'referral',
        description: 'Бонус за приглашённого друга',
      }),
      this.addCredits({
        userId: refereeId,
        amount: REFEREE_BONUS,
        type: 'bonus',
        description: 'Приветственный бонус',
      }),
    ]);
  }
}

// Singleton экземпляр
export const creditService = new CreditService();
