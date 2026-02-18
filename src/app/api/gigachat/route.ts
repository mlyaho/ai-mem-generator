import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint для генерации текста через GigaChat
 * Скрывает клиентские ключи на сервере
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

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
        { error: 'GigaChat auth failed' },
        { status: authResponse.status }
      );
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Запрос к GigaChat
    const chatResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'GigaChat',
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
        temperature: 0.8,
        max_tokens: 100,
      }),
    });

    if (!chatResponse.ok) {
      return NextResponse.json(
        { error: 'GigaChat API error' },
        { status: chatResponse.status }
      );
    }

    const data = await chatResponse.json();
    const text = data.choices?.[0]?.message?.content || '';
    const lines = text.trim().split('\n').filter((l: string) => l.trim());

    return NextResponse.json({
      topText: lines[0]?.replace(/["']/g, '').trim() || 'КОГДА ТЫ',
      bottomText: lines[1]?.replace(/["']/g, '').trim() || 'ПРОГРАММИСТ',
    });
  } catch (error) {
    console.error('GigaChat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
