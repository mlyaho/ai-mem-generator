import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint для генерации текста через YandexGPT
 * Скрывает API-ключи на сервере
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

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
        modelUri: 'gpt://b1g***/*yandexgpt-lite',
        completionOptions: {
          stream: false,
          temperature: 0.8,
          maxTokens: 100,
        },
        messages: [
          {
            role: 'system',
            content: 'Придумай ОЧЕНЬ смешную подпись для мема. Верни ТОЛЬКО 2 строки: первая строка - текст СВЕРХУ, вторая строка - текст СНИЗУ. Без кавычек, без объяснений. Язык: русский.',
          },
          {
            role: 'user',
            content: `Тема мема: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'YandexGPT API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.result?.alternatives?.[0]?.message?.text || '';
    const lines = text.trim().split('\n').filter((l: string) => l.trim());

    return NextResponse.json({
      topText: lines[0]?.replace(/["']/g, '').trim() || 'КОГДА ТЫ',
      bottomText: lines[1]?.replace(/["']/g, '').trim() || 'ПРОГРАММИСТ',
    });
  } catch (error) {
    console.error('YandexGPT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
