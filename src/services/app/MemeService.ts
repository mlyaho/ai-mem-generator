import { memeRepository, CreateMemeData, MemeFilters } from '@/repositories';

/**
 * Ошибки сервиса мемов
 */
export class MemeServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'MemeServiceError';
  }
}

/**
 * Сервис для бизнес-логики мемов
 * Инкапсулирует правила предметной области
 */
export class MemeService {
  /**
   * Получить мемы с фильтрацией
   *
   * Бизнес-правила:
   * - Если указан userId и это не текущий пользователь — только публичные
   * - Если userId не указан — только публичные (если явно не указано иное)
   */
  async getMemes(
    filters: MemeFilters,
    currentUserId?: string
  ) {
    const { userId, isPublic } = filters;

    // 🔒 Защита от enumeration атак
    if (userId) {
      // Проверяем, запрашивает ли пользователь свои мемы
      const isOwnMemes = currentUserId && String(currentUserId) === String(userId);

      // Если запрошены чужие мемы — только публичные
      if (!isOwnMemes) {
        return memeRepository.findMany({ userId, isPublic: true, cursor: filters.cursor, take: filters.take });
      }

      // Свои мемы:
      // - Если isPublic передан — фильтруем по нему
      // - Если isPublic не передан — показываем все (и приватные, и публичные)
      if (isPublic !== undefined) {
        return memeRepository.findMany({ userId, isPublic, cursor: filters.cursor, take: filters.take });
      }

      // isPublic не указан — показываем все мемы пользователя
      return memeRepository.findMany({ userId, cursor: filters.cursor, take: filters.take });
    }

    // Если userId не указан — только публичные (лента)
    if (isPublic !== true) {
      return memeRepository.findMany({ isPublic: true, cursor: filters.cursor, take: filters.take });
    }

    return memeRepository.findMany(filters);
  }

  /**
   * Создать мем
   *
   * Бизнес-правила:
   * - imageUrl должен быть валидным URL
   * - topText и bottomText макс. 200 символов
   * - isPublic по умолчанию true
   */
  async createMeme(data: CreateMemeData) {
    // Валидация уже выполнена на уровне API (Zod)
    // Здесь только бизнес-логика

    const meme = await memeRepository.create(data);
    return meme;
  }

  /**
   * Удалить мем
   *
   * Бизнес-правила:
   * - Только владелец может удалить мем
   */
  async deleteMeme(memeId: string, userId: string) {
    const meme = await memeRepository.findById(memeId);

    if (!meme) {
      throw new MemeServiceError('Мем не найден', 'MEME_NOT_FOUND', 404);
    }

    if (meme.userId !== userId) {
      throw new MemeServiceError(
        'Нет прав на удаление этого мема',
        'MEME_ACCESS_DENIED',
        403
      );
    }

    await memeRepository.delete(memeId);
    return { message: 'Мем удален' };
  }

  /**
   * Обновить видимость мема
   *
   * Бизнес-правила:
   * - Только владелец может изменить видимость
   */
  async updateVisibility(memeId: string, userId: string, isPublic: boolean) {
    const meme = await memeRepository.findById(memeId);

    if (!meme) {
      throw new MemeServiceError('Мем не найден', 'MEME_NOT_FOUND', 404);
    }

    if (meme.userId !== userId) {
      throw new MemeServiceError(
        'Нет прав на редактирование этого мема',
        'MEME_ACCESS_DENIED',
        403
      );
    }

    const updatedMeme = await memeRepository.updateVisibility(memeId, { isPublic });
    return updatedMeme;
  }

  /**
   * Проверить доступ к мему
   *
   * Бизнес-правила:
   * - Владелец имеет доступ ко всем своим мемам
   * - Другие пользователи — только к публичным
   */
  async canAccessMeme(memeId: string, userId?: string): Promise<boolean> {
    const meme = await memeRepository.findById(memeId);

    if (!meme) {
      return false;
    }

    // Владелец имеет доступ всегда
    if (userId && meme.userId === userId) {
      return true;
    }

    // Другие — только к публичным
    return meme.isPublic;
  }

  /**
   * Получить количество мемов пользователя
   */
  async getUserMemeCount(userId: string): Promise<number> {
    return memeRepository.countByUser(userId);
  }
}

// Singleton экземпляр
export const memeService = new MemeService();
