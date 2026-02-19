import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Тип для обработчика запроса
 */
export type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse>;

/**
 * Тип для валидатора тела запроса
 */
export type BodyValidator<T> = (body: unknown) => { success: boolean; data?: T; error?: string };

/**
 * Конфигурация безопасного API handler
 */
export interface SafeHandlerConfig<T> {
  handler: (req: NextRequest, context: { params: Promise<{ [key: string]: string }> }) => Promise<NextResponse<T>>;
  requireAuth?: boolean;
  rateLimitType?: 'auth' | 'api' | 'ai';
  validateBody?: BodyValidator<T>;
  validateContentType?: boolean;
}

/**
 * 🔒 Безопасный API handler с автоматической защитой
 * 
 * @example
 * export const POST = createSafeHandler({
 *   handler: async (req) => {
 *     const body = await req.json();
 *     return NextResponse.json({ success: true });
 *   },
 *   requireAuth: true,
 *   rateLimitType: 'api',
 *   validateContentType: true,
 * });
 */
export function createSafeHandler<T>({
  handler,
  requireAuth = false,
  rateLimitType,
  validateBody,
  validateContentType = false,
}: SafeHandlerConfig<T>) {
  return async (
    req: NextRequest,
    context: { params: Promise<{ [key: string]: string }> }
  ): Promise<NextResponse> => {
    try {
      // 🔒 Проверка авторизации
      if (requireAuth) {
        const session = await auth();
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Требуется авторизация' },
            { status: 401 }
          );
        }
      }

      // 🔒 Rate limiting
      if (rateLimitType) {
        const rateLimitResponse = rateLimit(req, rateLimitType);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // 🔒 Content-Type валидация
      if (validateContentType) {
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return NextResponse.json(
            { error: 'Content-Type должен быть application/json' },
            { status: 415 }
          );
        }
      }

      // 🔒 Валидация тела запроса
      if (validateBody) {
        const body = await req.json();
        const validation = validateBody(body);
        
        if (!validation.success) {
          return NextResponse.json(
            { error: validation.error || 'Некорректные данные' },
            { status: 400 }
          );
        }
      }

      // Вызов основного handler
      return await handler(req, context);
    } catch (error) {
      console.error('API Handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * 🔒 Быстрый handler только с авторизацией
 */
export function withAuth<T>(
  handler: (req: NextRequest, context: { params: Promise<{ [key: string]: string }> }) => Promise<NextResponse<T>>
) {
  return createSafeHandler<T>({
    handler,
    requireAuth: true,
    validateContentType: true,
  });
}

/**
 * 🔒 Быстрый handler только с rate limiting
 */
export function withRateLimit<T>(
  handler: (req: NextRequest, context: { params: Promise<{ [key: string]: string }> }) => Promise<NextResponse<T>>,
  type: 'auth' | 'api' | 'ai' = 'api'
) {
  return createSafeHandler<T>({
    handler,
    rateLimitType: type,
  });
}

/**
 * 🔒 Быстрый handler только с авторизацией и rate limiting
 * Для использования просто оберните вашу функцию
 */
export function withAuthAndRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: 'auth' | 'api' | 'ai' = 'api'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // 🔒 Проверка авторизации
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    // 🔒 Rate limiting
    const rateLimitResponse = rateLimit(req, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 🔒 Content-Type валидация
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type должен быть application/json' },
        { status: 415 }
      );
    }

    return handler(req);
  };
}
