import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemeService, MemeServiceError } from '@/services/app/MemeService';
import { memeRepository } from '@/repositories';

// Мокируем репозиторий
vi.mock('@/repositories', () => ({
  memeRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateVisibility: vi.fn(),
    countByUser: vi.fn(),
  },
}));

describe('MemeService', () => {
  let service: MemeService;

  beforeEach(() => {
    service = new MemeService();
    vi.clearAllMocks();
  });

  describe('getMemes', () => {
    it('должен возвращать только публичные мемы, если userId не указан', async () => {
      const mockMemes = { items: [{ id: '1', isPublic: true }] };
      vi.mocked(memeRepository.findMany).mockResolvedValue(mockMemes);

      const result = await service.getMemes({});

      expect(memeRepository.findMany).toHaveBeenCalledWith({
        isPublic: true,
        cursor: undefined,
        take: undefined,
      });
      expect(result).toEqual(mockMemes);
    });

    it('должен возвращать все мемы пользователя, если запрос к своим мемам', async () => {
      const currentUserId = 'user-123';
      const mockMemes = { items: [{ id: '1', isPublic: true }, { id: '2', isPublic: false }] };
      vi.mocked(memeRepository.findMany).mockResolvedValue(mockMemes);

      const result = await service.getMemes({ userId: currentUserId }, currentUserId);

      expect(memeRepository.findMany).toHaveBeenCalledWith({
        userId: currentUserId,
        isPublic: undefined,
        cursor: undefined,
        take: undefined,
      });
      expect(result).toEqual(mockMemes);
    });

    it('должен возвращать только публичные мемы, если запрос к чужим мемам', async () => {
      const currentUserId = 'user-123';
      const otherUserId = 'user-456';
      const mockMemes = { items: [{ id: '1', isPublic: true }] };
      vi.mocked(memeRepository.findMany).mockResolvedValue(mockMemes);

      const result = await service.getMemes({ userId: otherUserId }, currentUserId);

      expect(memeRepository.findMany).toHaveBeenCalledWith({
        userId: otherUserId,
        isPublic: true,
        cursor: undefined,
        take: undefined,
      });
      expect(result).toEqual(mockMemes);
    });

    it('должен передавать параметры пагинации', async () => {
      const mockMemes = { items: [{ id: '1', isPublic: true }] };
      vi.mocked(memeRepository.findMany).mockResolvedValue(mockMemes);

      await service.getMemes({ cursor: 'cursor-123', take: 10 });

      expect(memeRepository.findMany).toHaveBeenCalledWith({
        isPublic: true,
        cursor: 'cursor-123',
        take: 10,
      });
    });
  });

  describe('createMeme', () => {
    it('должен создавать мем с валидными данными', async () => {
      const mockMeme = {
        id: 'meme-123',
        userId: 'user-123',
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top',
        bottomText: 'Bottom',
        isPublic: true,
      };
      vi.mocked(memeRepository.create).mockResolvedValue(mockMeme);

      const result = await service.createMeme({
        userId: 'user-123',
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top',
        bottomText: 'Bottom',
        isPublic: true,
      });

      expect(memeRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top',
        bottomText: 'Bottom',
        isPublic: true,
      });
      expect(result).toEqual(mockMeme);
    });
  });

  describe('deleteMeme', () => {
    it('должен удалять мем, если пользователь владелец', async () => {
      const memeId = 'meme-123';
      const userId = 'user-123';
      const mockMeme = { id: memeId, userId };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);
      vi.mocked(memeRepository.delete).mockResolvedValue(undefined as never);

      const result = await service.deleteMeme(memeId, userId);

      expect(memeRepository.findById).toHaveBeenCalledWith(memeId);
      expect(memeRepository.delete).toHaveBeenCalledWith(memeId);
      expect(result).toEqual({ message: 'Мем удален' });
    });

    it('должен бросать ошибку, если мем не найден', async () => {
      vi.mocked(memeRepository.findById).mockResolvedValue(null);

      await expect(service.deleteMeme('non-existent', 'user-123')).rejects.toThrow(
        MemeServiceError
      );
      await expect(service.deleteMeme('non-existent', 'user-123')).rejects.toHaveProperty(
        'code',
        'MEME_NOT_FOUND'
      );
    });

    it('должен бросать ошибку, если пользователь не владелец', async () => {
      const memeId = 'meme-123';
      const ownerId = 'owner-123';
      const currentUserId = 'user-456';
      const mockMeme = { id: memeId, userId: ownerId };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);

      await expect(service.deleteMeme(memeId, currentUserId)).rejects.toThrow(
        MemeServiceError
      );
      await expect(service.deleteMeme(memeId, currentUserId)).rejects.toHaveProperty(
        'code',
        'MEME_ACCESS_DENIED'
      );
    });
  });

  describe('updateVisibility', () => {
    it('должен обновлять видимость, если пользователь владелец', async () => {
      const memeId = 'meme-123';
      const userId = 'user-123';
      const mockMeme = { id: memeId, userId, isPublic: true };
      const updatedMeme = { ...mockMeme, isPublic: false };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);
      vi.mocked(memeRepository.updateVisibility).mockResolvedValue(updatedMeme);

      const result = await service.updateVisibility(memeId, userId, false);

      expect(memeRepository.findById).toHaveBeenCalledWith(memeId);
      expect(memeRepository.updateVisibility).toHaveBeenCalledWith(memeId, { isPublic: false });
      expect(result).toEqual(updatedMeme);
    });

    it('должен бросать ошибку, если мем не найден', async () => {
      vi.mocked(memeRepository.findById).mockResolvedValue(null);

      await expect(service.updateVisibility('non-existent', 'user-123', true)).rejects.toThrow(
        MemeServiceError
      );
    });

    it('должен бросать ошибку, если пользователь не владелец', async () => {
      const memeId = 'meme-123';
      const ownerId = 'owner-123';
      const currentUserId = 'user-456';
      const mockMeme = { id: memeId, userId: ownerId };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);

      await expect(
        service.updateVisibility(memeId, currentUserId, true)
      ).rejects.toThrow(MemeServiceError);
    });
  });

  describe('canAccessMeme', () => {
    it('должен возвращать true, если пользователь владелец', async () => {
      const memeId = 'meme-123';
      const userId = 'user-123';
      const mockMeme = { id: memeId, userId, isPublic: false };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);

      const result = await service.canAccessMeme(memeId, userId);

      expect(result).toBe(true);
    });

    it('должен возвращать true, если мем публичный', async () => {
      const memeId = 'meme-123';
      const userId = 'user-456';
      const mockMeme = { id: memeId, userId: 'owner-123', isPublic: true };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);

      const result = await service.canAccessMeme(memeId, userId);

      expect(result).toBe(true);
    });

    it('должен возвращать false, если мем приватный и пользователь не владелец', async () => {
      const memeId = 'meme-123';
      const userId = 'user-456';
      const mockMeme = { id: memeId, userId: 'owner-123', isPublic: false };
      vi.mocked(memeRepository.findById).mockResolvedValue(mockMeme);

      const result = await service.canAccessMeme(memeId, userId);

      expect(result).toBe(false);
    });

    it('должен возвращать false, если мем не найден', async () => {
      vi.mocked(memeRepository.findById).mockResolvedValue(null);

      const result = await service.canAccessMeme('non-existent', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('getUserMemeCount', () => {
    it('должен возвращать количество мемов пользователя', async () => {
      const userId = 'user-123';
      vi.mocked(memeRepository.countByUser).mockResolvedValue(5);

      const result = await service.getUserMemeCount(userId);

      expect(memeRepository.countByUser).toHaveBeenCalledWith(userId);
      expect(result).toBe(5);
    });
  });
});
