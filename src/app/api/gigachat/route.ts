import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rateLimit';

/**
 * API endpoint для генерации текста через GigaChat
 * Скрывает клиентские ключи на сервере
 * 
 * 🔒 БЕЗОПАСНОСТЬ:
 * - Требуется авторизация
 * - Rate limiting: 10 запросов в минуту
 * - Валидация Content-Type
 * - Валидация входных данных
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 Проверка авторизации
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    // 🔒 Rate limiting
    const rateLimitResponse = rateLimit(request, "ai");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 🔒 Content-Type валидация
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: "Content-Type должен быть application/json" },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    // 🔒 Валидация входных данных
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: "Prompt обязателен" },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt слишком длинный (макс. 2000 символов)" },
        { status: 400 }
      );
    }

    const clientId = process.env.GIGACHAT_CLIENT_ID;
    const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'GigaChat not configured' },
        { status: 503 }
      );
    }

    // Получение токена
    const authResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: 'GigaChat auth error' },
        { status: 503 }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Генерация текста
    const generateResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: 'GigaChat',
        messages: [{
          role: 'user',
          content: `Придумай смешной текст для мема на тему: ${prompt}. Верни только текст для верхней и нижней строки через запятую.`,
        }],
      }),
    });

    if (!generateResponse.ok) {
      return NextResponse.json(
        { error: 'GigaChat API error' },
        { status: generateResponse.status }
      );
    }

    const generateData = await generateResponse.json();
    const content = generateData.choices?.[0]?.message?.content || '';

    // Парсинг ответа (верхняя, нижняя строки)
    const [topText, bottomText] = content.split(',').map((s: string) => s.trim());

    return NextResponse.json({
      topText: topText || '',
      bottomText: bottomText || '',
    });
  } catch (error) {
    console.error('GigaChat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
