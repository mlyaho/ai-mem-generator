import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSafeHandler,
  withAuth,
  withRateLimit,
  withAuthAndRateLimit,
  ApiHandler,
  BodyValidator,
} from '@/lib/safeHandler';

// Мокируем зависимости
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rateLimit';

// Helper для создания мок запроса
function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  url?: string;
} = {}) {
  const { method = 'GET', headers = {}, body, url = 'http://localhost:3000' } = options;
  
  return new NextRequest(new URL(url), {
    method,
    headers: new Headers({
      'content-type': 'application/json',
      ...headers,
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('safeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createSafeHandler', () => {
    it('должен вызывать handler без дополнительных проверок', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = createSafeHandler({
        handler: mockHandler,
      });

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });

    it('должен возвращать 401 при отсутствии авторизации', async () => {
      vi.mocked(auth).mockResolvedValue({ user: null });

      const mockHandler = vi.fn();

      const handler = createSafeHandler({
        handler: mockHandler,
        requireAuth: true,
      });

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Требуется авторизация');
    });

    it('должен вызывать handler при успешной авторизации', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = createSafeHandler({
        handler: mockHandler,
        requireAuth: true,
      });

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });

    it('должен возвращать 429 при превышении rate limit', async () => {
      vi.mocked(rateLimit).mockReturnValue(
        NextResponse.json(
          { error: 'Слишком много запросов' },
          { status: 429 }
        )
      );

      const mockHandler = vi.fn();

      const handler = createSafeHandler({
        handler: mockHandler,
        rateLimitType: 'api',
      });

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it('должен возвращать 415 при неправильном Content-Type', async () => {
      const mockHandler = vi.fn();

      const handler = createSafeHandler({
        handler: mockHandler,
        validateContentType: true,
      });

      const req = createMockRequest({
        headers: { 'content-type': 'text/plain' },
      });
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(415);
      const json = await response.json();
      expect(json.error).toBe('Content-Type должен быть application/json');
    });

    it('должен возвращать 400 при невалидном теле запроса', async () => {
      const mockValidator: BodyValidator<{ name: string }> = (body) => {
        if (!body || typeof body !== 'object' || !('name' in body)) {
          return { success: false, error: 'name обязателен' };
        }
        return { success: true, data: body as { name: string } };
      };

      const mockHandler = vi.fn();

      const handler = createSafeHandler({
        handler: mockHandler,
        validateBody: mockValidator,
      });

      const req = createMockRequest({ method: 'POST', body: {} });
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('name обязателен');
    });

    it('должен вызывать handler при валидном теле запроса', async () => {
      const mockValidator: BodyValidator<{ name: string }> = (body) => {
        if (!body || typeof body !== 'object' || !('name' in body)) {
          return { success: false, error: 'name обязателен' };
        }
        return { success: true, data: body as { name: string } };
      };

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = createSafeHandler({
        handler: mockHandler,
        validateBody: mockValidator,
      });

      const req = createMockRequest({ method: 'POST', body: { name: 'test' } });
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });

    it('должен возвращать 500 при ошибке в handler', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));

      const handler = createSafeHandler({
        handler: mockHandler,
      });

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Internal server error');
    });

    it('должен применять все проверки одновременно', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockValidator: BodyValidator<{ name: string }> = (body) => {
        if (!body || typeof body !== 'object' || !('name' in body)) {
          return { success: false, error: 'name обязателен' };
        }
        return { success: true, data: body as { name: string } };
      };

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = createSafeHandler({
        handler: mockHandler,
        requireAuth: true,
        rateLimitType: 'api',
        validateContentType: true,
        validateBody: mockValidator,
      });

      const req = createMockRequest({ method: 'POST', body: { name: 'test' } });
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });
  });

  describe('withAuth', () => {
    it('должен требовать авторизацию и Content-Type', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withAuth(mockHandler);

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });

    it('должен возвращать 401 без авторизации', async () => {
      vi.mocked(auth).mockResolvedValue({ user: null });

      const mockHandler = vi.fn();

      const handler = withAuth(mockHandler);

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      const response = await handler(req, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('withRateLimit', () => {
    it('должен применять rate limiting по умолчанию (api)', async () => {
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withRateLimit(mockHandler);

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(rateLimit).toHaveBeenCalledWith(req, 'api');
      expect(mockHandler).toHaveBeenCalledWith(req, context);
    });

    it('должен применять rate limiting для auth', async () => {
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withRateLimit(mockHandler, 'auth');

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(rateLimit).toHaveBeenCalledWith(req, 'auth');
    });

    it('должен применять rate limiting для ai', async () => {
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withRateLimit(mockHandler, 'ai');

      const req = createMockRequest();
      const context = { params: Promise.resolve({}) };

      await handler(req, context);

      expect(rateLimit).toHaveBeenCalledWith(req, 'ai');
    });
  });

  describe('withAuthAndRateLimit', () => {
    it('должен требовать авторизацию и rate limiting', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withAuthAndRateLimit(mockHandler, 'api');

      const req = createMockRequest();

      await handler(req);

      expect(mockHandler).toHaveBeenCalledWith(req);
    });

    it('должен возвращать 401 без авторизации', async () => {
      vi.mocked(auth).mockResolvedValue({ user: null });

      const mockHandler = vi.fn();

      const handler = withAuthAndRateLimit(mockHandler, 'api');

      const req = createMockRequest();

      const response = await handler(req);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('должен возвращать 429 при превышении rate limit', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      vi.mocked(rateLimit).mockReturnValue(
        NextResponse.json(
          { error: 'Слишком много запросов' },
          { status: 429 }
        )
      );

      const mockHandler = vi.fn();

      const handler = withAuthAndRateLimit(mockHandler, 'api');

      const req = createMockRequest();

      const response = await handler(req);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it('должен возвращать 415 при неправильном Content-Type', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn();

      const handler = withAuthAndRateLimit(mockHandler, 'api');

      const req = createMockRequest({
        headers: { 'content-type': 'text/plain' },
      });

      const response = await handler(req);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(415);
    });

    it('должен использовать api rate limit по умолчанию', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      vi.mocked(rateLimit).mockReturnValue(null);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const handler = withAuthAndRateLimit(mockHandler);

      const req = createMockRequest();

      await handler(req);

      expect(rateLimit).toHaveBeenCalledWith(req, 'api');
    });
  });
});
