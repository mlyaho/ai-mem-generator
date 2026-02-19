import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

// Helper для создания мок запроса
function createMockRequest(options: {
  ip?: string;
  forwardedFor?: string;
} = {}) {
  const { ip = '127.0.0.1', forwardedFor } = options;
  
  const headers = new Headers();
  if (forwardedFor) {
    headers.set('x-forwarded-for', forwardedFor);
  } else {
    headers.set('x-forwarded-for', ip);
  }
  
  // Создаем запрос с моковыми headers
  const req = {
    headers,
  } as unknown as NextRequest;
  
  return req;
}

describe('rateLimit', () => {
  beforeEach(() => {
    // Очищаем карту rate limit перед каждым тестом
    const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
    // Используем vi.spyOn для доступа к внутренней переменной
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('базовая функциональность', () => {
    it('должен возвращать null при первом запросе', () => {
      const req = createMockRequest({ ip: '192.168.1.1' });
      
      const result = rateLimit(req, 'api');
      
      expect(result).toBeNull();
    });

    it('должен использовать IP из x-forwarded-for', () => {
      const req = createMockRequest({ forwardedFor: '10.0.0.1, 10.0.0.2' });
      
      const result = rateLimit(req, 'api');
      
      expect(result).toBeNull();
    });

    it('должен использовать "unknown" если IP не определен', () => {
      const req = createMockRequest({ forwardedFor: '' });
      
      const result = rateLimit(req, 'api');
      
      expect(result).toBeNull();
    });
  });

  describe('auth rate limit (5 запросов в минуту)', () => {
    it('должен разрешить первые 5 запросов', () => {
      const ip = 'auth-user-1';
      
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip });
        const result = rateLimit(req, 'auth');
        expect(result).toBeNull();
      }
    });

    it('должен возвращать 429 на 6-й запрос', () => {
      const ip = 'auth-user-2';
      
      // Первые 5 запросов
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'auth');
      }
      
      // 6-й запрос должен быть заблокирован
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'auth');
      
      expect(result?.status).toBe(429);
    });

    it('должен возвращать правильные заголовки при 429', async () => {
      const ip = 'auth-user-3';
      
      // Превышаем лимит
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'auth');
      }
      
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'auth');
      
      expect(result?.status).toBe(429);
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('Retry-After')).toBeDefined();
      
      const json = await result?.json();
      expect(json?.error).toBe('Слишком много запросов. Попробуйте позже.');
      expect(json?.retryAfter).toBeDefined();
    });
  });

  describe('api rate limit (30 запросов в минуту)', () => {
    it('должен разрешить первые 30 запросов', () => {
      const ip = 'api-user-1';
      
      for (let i = 1; i <= 30; i++) {
        const req = createMockRequest({ ip });
        const result = rateLimit(req, 'api');
        expect(result).toBeNull();
      }
    });

    it('должен возвращать 429 на 31-й запрос', () => {
      const ip = 'api-user-2';
      
      // Первые 30 запросов
      for (let i = 1; i <= 30; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'api');
      }
      
      // 31-й запрос должен быть заблокирован
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'api');
      
      expect(result?.status).toBe(429);
    });

    it('должен возвращать правильные заголовки при 429', async () => {
      const ip = 'api-user-3';
      
      // Превышаем лимит
      for (let i = 1; i <= 30; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'api');
      }
      
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'api');
      
      expect(result?.status).toBe(429);
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('30');
    });
  });

  describe('ai rate limit (10 запросов в минуту)', () => {
    it('должен разрешить первые 10 запросов', () => {
      const ip = 'ai-user-1';
      
      for (let i = 1; i <= 10; i++) {
        const req = createMockRequest({ ip });
        const result = rateLimit(req, 'ai');
        expect(result).toBeNull();
      }
    });

    it('должен возвращать 429 на 11-й запрос', () => {
      const ip = 'ai-user-2';
      
      // Первые 10 запросов
      for (let i = 1; i <= 10; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'ai');
      }
      
      // 11-й запрос должен быть заблокирован
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'ai');
      
      expect(result?.status).toBe(429);
    });

    it('должен возвращать правильные заголовки при 429', async () => {
      const ip = 'ai-user-3';
      
      // Превышаем лимит
      for (let i = 1; i <= 10; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'ai');
      }
      
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'ai');
      
      expect(result?.status).toBe(429);
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10');
    });
  });

  describe('разные IP адреса', () => {
    it('должен считать лимиты отдельно для каждого IP', () => {
      const ip1 = 'user-1';
      const ip2 = 'user-2';
      
      // IP1 делает 5 запросов
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip: ip1 });
        rateLimit(req, 'auth');
      }
      
      // IP2 еще может делать запросы
      const req = createMockRequest({ ip: ip2 });
      const result = rateLimit(req, 'auth');
      
      expect(result).toBeNull();
    });
  });

  describe('сброс счетчика', () => {
    it('должен сбрасывать счетчик после истечения windowMs', () => {
      const ip = 'reset-user';
      const config = { windowMs: 60 * 1000, maxRequests: 5 };
      
      // Делаем 5 запросов
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'auth');
      }
      
      // Симулируем истечение времени
      vi.useFakeTimers();
      vi.advanceTimersByTime(config.windowMs + 1000);
      
      // После сброса должен быть разрешен еще 1 запрос
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'auth');
      
      expect(result).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('type по умолчанию', () => {
    it('должен использовать "api" по умолчанию', () => {
      const ip = 'default-user';
      
      // Первые 30 запросов должны пройти (api лимит)
      for (let i = 1; i <= 30; i++) {
        const req = createMockRequest({ ip });
        const result = rateLimit(req);
        expect(result).toBeNull();
      }
      
      // 31-й должен быть заблокирован
      const req = createMockRequest({ ip });
      const result = rateLimit(req);
      
      expect(result?.status).toBe(429);
    });
  });

  describe('Retry-After заголовок', () => {
    it('должен содержать корректное время в секундах', async () => {
      const ip = 'retry-user';
      
      // Превышаем лимит
      for (let i = 1; i <= 5; i++) {
        const req = createMockRequest({ ip });
        rateLimit(req, 'auth');
      }
      
      const req = createMockRequest({ ip });
      const result = rateLimit(req, 'auth');
      
      expect(result?.status).toBe(429);
      const retryAfter = result?.headers.get('Retry-After');
      expect(retryAfter).toBeDefined();
      expect(Number(retryAfter)).toBeGreaterThan(0);
      expect(Number(retryAfter)).toBeLessThanOrEqual(60);
      
      const json = await result?.json();
      expect(json?.retryAfter).toBe(Number(retryAfter));
    });
  });
});
