import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/safeHandler';
import { promptValidator, validateRequest } from '@/lib/validators';

/**
 * API endpoint для генерации текста через YandexGPT
 * 🔒 Безопасность: с помощью createSafeHandler
 */
export const POST = withAuthAndRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // 🔒 Валидация данных
    const validation = validateRequest(body, promptValidator);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { prompt } = validation.data!;
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
}, 'ai');
