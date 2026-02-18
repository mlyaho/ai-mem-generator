import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { registerValidator, validateRequest } from '@/lib/validators';

/**
 * API endpoint для регистрации пользователя
 * 🔒 Безопасность: ручная с использованием абстракций
 */
export async function POST(req: NextRequest) {
  // 🔒 Rate limiting
  const rateLimitResponse = rateLimit(req, 'auth');
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

  try {
    const body = await req.json();
    
    // 🔒 Валидация данных
    const validation = validateRequest(body, registerValidator);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data!;

    const existingUser = await prisma.user.findUnique({
      where: { email: email!.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password!, 12);

    const user = await prisma.user.create({
      data: {
        email: email!.toLowerCase(),
        passwordHash,
        name: name || email!.split('@')[0],
      },
    });

    return NextResponse.json(
      { message: 'Пользователь успешно создан', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Ошибка при регистрации' },
      { status: 500 }
    );
  }
}
