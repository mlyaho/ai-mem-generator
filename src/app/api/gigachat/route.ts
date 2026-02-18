import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/safeHandler';
import { promptValidator, validateRequest } from '@/lib/validators';

/**
 * API endpoint для генерации текста через GigaChat
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
}, 'ai');
