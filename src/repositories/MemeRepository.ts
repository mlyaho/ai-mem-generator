import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Фильтры для получения мемов
 */
export interface MemeFilters {
  userId?: string;
  isPublic?: boolean;
  cursor?: string | null;
  take?: number;
}

/**
 * Данные для создания мема
 */
export interface CreateMemeData {
  userId: string;
  imageUrl: string;
  topText?: string;
  bottomText?: string;
  isPublic?: boolean;
}

/**
 * Данные для обновления видимости
 */
export interface UpdateMemeVisibilityData {
  isPublic: boolean;
}

/**
 * Репозиторий для работы с мемами
 * Инкапсулирует все Prisma запросы к таблице Meme
 */
export class MemeRepository {
  /**
   * Получить мемы с фильтрацией и пагинацией
   */
  async findMany(filters: MemeFilters = {}) {
    const {
      userId,
      isPublic,
      cursor,
      take = 20,
    } = filters;

    const where: Prisma.MemeWhereInput = {};

    // Фильтрация по userId
    if (userId) {
      where.userId = userId;
    }

    // Фильтрация по видимости
    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const skip = cursor ? 1 : 0;

    const memes = await prisma.meme.findMany({
      where,
      take: take + skip,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const nextCursor = memes.length > take ? memes[take - 1].id : null;
    const items = memes.length > take ? memes.slice(0, take) : memes;

    return {
      items,
      nextCursor,
    };
  }

  /**
   * Получить мем по ID
   */
  async findById(id: string) {
    return prisma.meme.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Создать новый мем
   */
  async create(data: CreateMemeData) {
    const { userId, imageUrl, topText = '', bottomText = '', isPublic = true } = data;

    return prisma.meme.create({
      data: {
        userId,
        imageUrl,
        topText,
        bottomText,
        isPublic,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Удалить мем
   */
  async delete(id: string) {
    return prisma.meme.delete({
      where: { id },
    });
  }

  /**
   * Обновить видимость мема
   */
  async updateVisibility(id: string, data: UpdateMemeVisibilityData) {
    return prisma.meme.update({
      where: { id },
      data: { isPublic: data.isPublic },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Проверить принадлежность мема пользователю
   */
  async isOwner(memeId: string, userId: string): Promise<boolean> {
    const meme = await prisma.meme.findUnique({
      where: { id: memeId },
      select: { userId: true },
    });

    return meme?.userId === userId;
  }

  /**
   * Получить количество мемов пользователя
   */
  async countByUser(userId: string): Promise<number> {
    return prisma.meme.count({
      where: { userId },
    });
  }

  /**
   * Получить публичные мемы с пагинацией
   */
  async findPublic(cursor?: string | null, take: number = 20) {
    return this.findMany({ isPublic: true, cursor, take });
  }

  /**
   * Получить мемы пользователя (все, включая приватные)
   */
  async findByUser(userId: string, cursor?: string | null, take: number = 20) {
    return this.findMany({ userId, cursor, take });
  }
}

// Singleton экземпляр
export const memeRepository = new MemeRepository();
