import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rateLimit';

/**
 * API endpoint для генерации текста через YandexGPT
 * Скрывает API-ключи на сервере
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

    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;

    if (!apiKey || !folderId) {
      return NextResponse.json(
        { error: 'YandexGPT not configured' },
        { status: 503 }
      );
    }

    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.8,
          maxTokens: 100,
        },
        messages: [{
          role: 'user',
          content: `Придумай смешной текст для мема на тему: ${prompt}. Верни только текст для верхней и нижней строки через запятую.`,
        }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'YandexGPT API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.result?.alternatives?.[0]?.message?.text || '';

    // Парсинг ответа (верхняя, нижняя строки)
    const [topText, bottomText] = content.split(',').map((s: string) => s.trim());

    return NextResponse.json({
      topText: topText || '',
      bottomText: bottomText || '',
    });
  } catch (error) {
    console.error('YandexGPT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
