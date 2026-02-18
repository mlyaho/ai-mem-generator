import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint для генерации изображений через Kandinsky
 * Скрывает API-ключ на сервере
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, width = 512, height = 512 } = body;

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
