import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemeRepository, memeRepository } from '@/repositories/MemeRepository';
import { prisma } from '@/lib/prisma';

// Мокируем Prisma клиент
vi.mock('@/lib/prisma', () => ({
  prisma: {
    meme: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('MemeRepository', () => {
  let repository: MemeRepository;

  beforeEach(() => {
    repository = new MemeRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findMany', () => {
    it('должен возвращать мемы с пагинацией', async () => {
      const mockMemes = [
        { id: '1', userId: 'user-1', imageUrl: 'https://example.com/1.png', isPublic: true },
        { id: '2', userId: 'user-1', imageUrl: 'https://example.com/2.png', isPublic: true },
        { id: '3', userId: 'user-1', imageUrl: 'https://example.com/3.png', isPublic: true },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      const result = await repository.findMany({ take: 2 });

      expect(prisma.meme.findMany).toHaveBeenCalledWith({
        where: {},
        take: 2, // take без cursor
        skip: 0,
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
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2');
    });

    it('должен возвращать nextCursor = null, если мемов меньше чем take', async () => {
      const mockMemes = [
        { id: '1', userId: 'user-1', imageUrl: 'https://example.com/1.png', isPublic: true },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      const result = await repository.findMany({ take: 5 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('должен фильтровать по userId', async () => {
      const mockMemes = [
        { id: '1', userId: 'user-1', imageUrl: 'https://example.com/1.png', isPublic: true },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      await repository.findMany({ userId: 'user-1' });

      expect(prisma.meme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      );
    });

    it('должен фильтровать по isPublic', async () => {
      const mockMemes = [
        { id: '1', userId: 'user-1', imageUrl: 'https://example.com/1.png', isPublic: true },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      await repository.findMany({ isPublic: true });

      expect(prisma.meme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true },
        })
      );
    });

    it('должен использовать cursor для пагинации', async () => {
      const mockMemes = [
        { id: '2', userId: 'user-1', imageUrl: 'https://example.com/2.png', isPublic: true },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      await repository.findMany({ cursor: '1', take: 5 });

      expect(prisma.meme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 6, // take + skip
        })
      );
    });

    it('должен включать данные пользователя', async () => {
      const mockMemes = [
        {
          id: '1',
          userId: 'user-1',
          imageUrl: 'https://example.com/1.png',
          isPublic: true,
          user: { id: 'user-1', name: 'Test User', image: null },
        },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      const result = await repository.findMany({});

      expect(result.items[0].user).toBeDefined();
    });
  });

  describe('findById', () => {
    it('должен возвращать мем по ID', async () => {
      const mockMeme = {
        id: 'meme-123',
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        isPublic: true,
        user: { id: 'user-1', name: 'Test User', image: null },
      };
      vi.mocked(prisma.meme.findUnique).mockResolvedValue(mockMeme);

      const result = await repository.findById('meme-123');

      expect(prisma.meme.findUnique).toHaveBeenCalledWith({
        where: { id: 'meme-123' },
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
      expect(result).toEqual(mockMeme);
    });

    it('должен возвращать null, если мем не найден', async () => {
      vi.mocked(prisma.meme.findUnique).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('должен создавать мем с валидными данными', async () => {
      const mockMeme = {
        id: 'meme-123',
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top text',
        bottomText: 'Bottom text',
        isPublic: true,
        user: { id: 'user-1', name: 'Test User', image: null },
      };
      vi.mocked(prisma.meme.create).mockResolvedValue(mockMeme);

      const result = await repository.create({
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top text',
        bottomText: 'Bottom text',
        isPublic: true,
      });

      expect(prisma.meme.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          imageUrl: 'https://example.com/meme.png',
          topText: 'Top text',
          bottomText: 'Bottom text',
          isPublic: true,
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
      expect(result).toEqual(mockMeme);
    });

    it('должен использовать значения по умолчанию для topText, bottomText, isPublic', async () => {
      const mockMeme = {
        id: 'meme-123',
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        topText: '',
        bottomText: '',
        isPublic: true,
        user: { id: 'user-1', name: 'Test User', image: null },
      };
      vi.mocked(prisma.meme.create).mockResolvedValue(mockMeme);

      await repository.create({
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
      });

      expect(prisma.meme.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            topText: '',
            bottomText: '',
            isPublic: true,
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('должен удалять мем по ID', async () => {
      const mockDeletedMeme = {
        id: 'meme-123',
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        isPublic: true,
      };
      vi.mocked(prisma.meme.delete).mockResolvedValue(mockDeletedMeme);

      const result = await repository.delete('meme-123');

      expect(prisma.meme.delete).toHaveBeenCalledWith({
        where: { id: 'meme-123' },
      });
      expect(result).toEqual(mockDeletedMeme);
    });
  });

  describe('updateVisibility', () => {
    it('должен обновлять видимость мема', async () => {
      const mockUpdatedMeme = {
        id: 'meme-123',
        userId: 'user-1',
        imageUrl: 'https://example.com/meme.png',
        isPublic: false,
        user: { id: 'user-1', name: 'Test User', image: null },
      };
      vi.mocked(prisma.meme.update).mockResolvedValue(mockUpdatedMeme);

      const result = await repository.updateVisibility('meme-123', { isPublic: false });

      expect(prisma.meme.update).toHaveBeenCalledWith({
        where: { id: 'meme-123' },
        data: { isPublic: false },
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
      expect(result).toEqual(mockUpdatedMeme);
    });
  });

  describe('isOwner', () => {
    it('должен возвращать true, если пользователь владелец', async () => {
      vi.mocked(prisma.meme.findUnique).mockResolvedValue({ userId: 'user-1' });

      const result = await repository.isOwner('meme-123', 'user-1');

      expect(result).toBe(true);
    });

    it('должен возвращать false, если пользователь не владелец', async () => {
      vi.mocked(prisma.meme.findUnique).mockResolvedValue({ userId: 'user-2' });

      const result = await repository.isOwner('meme-123', 'user-1');

      expect(result).toBe(false);
    });

    it('должен возвращать false, если мем не найден', async () => {
      vi.mocked(prisma.meme.findUnique).mockResolvedValue(null);

      const result = await repository.isOwner('non-existent', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('countByUser', () => {
    it('должен возвращать количество мемов пользователя', async () => {
      vi.mocked(prisma.meme.count).mockResolvedValue(5);

      const result = await repository.countByUser('user-1');

      expect(prisma.meme.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toBe(5);
    });

    it('должен возвращать 0, если у пользователя нет мемов', async () => {
      vi.mocked(prisma.meme.count).mockResolvedValue(0);

      const result = await repository.countByUser('user-1');

      expect(result).toBe(0);
    });
  });

  describe('findPublic', () => {
    it('должен возвращать только публичные мемы', async () => {
      const mockMemes = [
        { id: '1', isPublic: true, imageUrl: 'https://example.com/1.png' },
        { id: '2', isPublic: true, imageUrl: 'https://example.com/2.png' },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      const result = await repository.findPublic();

      expect(prisma.meme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true },
        })
      );
      expect(result.items).toHaveLength(2);
    });
  });

  describe('findByUser', () => {
    it('должен возвращать все мемы пользователя', async () => {
      const mockMemes = [
        { id: '1', userId: 'user-1', isPublic: true, imageUrl: 'https://example.com/1.png' },
        { id: '2', userId: 'user-1', isPublic: false, imageUrl: 'https://example.com/2.png' },
      ];
      vi.mocked(prisma.meme.findMany).mockResolvedValue(mockMemes);

      const result = await repository.findByUser('user-1');

      expect(prisma.meme.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      );
      expect(result.items).toHaveLength(2);
    });
  });
});
