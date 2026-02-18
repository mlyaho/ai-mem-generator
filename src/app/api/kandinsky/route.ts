import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rateLimit';

/**
 * API endpoint для генерации изображений через Kandinsky
 * Скрывает API-ключ на сервере
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
    const { prompt, width = 512, height = 512 } = body;

    // 🔒 Валидация входных данных
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: "Prompt обязателен" },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt слишком длинный (макс. 1000 символов)" },
        { status: 400 }
      );
    }

    // 🔒 Валидация размеров
    const validDimensions = [256, 512, 768, 1024];
    if (!validDimensions.includes(width) || !validDimensions.includes(height)) {
      return NextResponse.json(
        { error: "Некорректные размеры изображения (256, 512, 768, 1024)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.KANDINSKY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kandinsky not configured' },
        { status: 503 }
      );
    }

    // Отправка запроса на генерацию
    const generateResponse = await fetch('https://api-key.fusionbrain.ai/api/v1/text2image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Key': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt + ', meme style, funny, high quality',
        negative_prompt: 'ugly, blurry, low quality',
        width,
        height,
        samples: 1,
      }),
    });

    if (!generateResponse.ok) {
      return NextResponse.json(
        { error: 'Kandinsky API error' },
        { status: generateResponse.status }
      );
    }

    const generateData = await generateResponse.json();
    const uuid = generateData.uuid;

    // Ожидание готовности (до 60 секунд)
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `https://api-key.fusionbrain.ai/api/v1/text2image/status/${uuid}`,
        {
          headers: {
            'X-Key': `Key ${apiKey}`,
          },
        }
      );

      const status = await statusResponse.json();

      if (status.status === 'DONE') {
        return NextResponse.json({
          imageUrl: status.images?.[0] || '',
        });
      }

      if (status.status === 'FAIL') {
        return NextResponse.json(
          { error: 'Kandinsky generation failed' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Kandinsky generation timeout' },
      { status: 408 }
    );
  } catch (error) {
    console.error('Kandinsky API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
