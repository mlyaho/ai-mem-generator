import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Данные для создания пользователя
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string;
  image?: string;
}

/**
 * Репозиторий для работы с пользователями
 * Инкапсулирует все Prisma запросы к таблице User
 */
export class UserRepository {
  /**
   * Найти пользователя по email
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Найти пользователя по ID
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        memes: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { memes: true },
        },
      },
    });
  }

  /**
   * Создать нового пользователя
   */
  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        image: data.image,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });
  }

  /**
   * Обновить пользователя
   */
  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Удалить пользователя
   */
  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Проверить существование пользователя по email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    return user !== null;
  }

  /**
   * Получить количество пользователей
   */
  async count(): Promise<number> {
    return prisma.user.count();
  }
}

// Singleton экземпляр
export const userRepository = new UserRepository();
