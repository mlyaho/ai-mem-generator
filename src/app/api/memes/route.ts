import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { withAuthAndRateLimit } from "@/lib/safeHandler";
import { memeValidator, validateRequest } from "@/lib/validators";
import { memeService } from "@/services/app";

// GET - получение мемов
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const isPublicParam = searchParams.get("isPublic");
    const cursor = searchParams.get("cursor");

    // Используем userId из сессии, если он не указан
    const targetUserId = userId || session?.user?.id;

    // Передаём isPublic только если он явно указан в запросе
    const memes = await memeService.getMemes(
      {
        userId: targetUserId,
        isPublic: isPublicParam === 'true' ? true : (isPublicParam === 'false' ? false : undefined),
        cursor
      },
      session?.user?.id
    );

    return NextResponse.json(memes);
  } catch (error) {
    console.error("Get memes error:", error);
    return NextResponse.json(
      { error: "Ошибка при получении мемов" },
      { status: 500 }
    );
  }
}

// POST - создание мема
export const POST = withAuthAndRateLimit(async (req: NextRequest) => {
  const body = await req.json();
  const session = await auth();

  // 🔒 Валидация данных
  const validation = validateRequest(body, memeValidator);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const meme = await memeService.createMeme({
    userId: session?.user?.id || '',
    ...validation.data!,
  });

  return NextResponse.json(meme, { status: 201 });
}, 'api');

// DELETE - удаление мема
export const DELETE = withAuthAndRateLimit(async (req: NextRequest) => {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Требуется авторизация" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const memeId = searchParams.get("id");

  if (!memeId) {
    return NextResponse.json(
      { error: "ID мема обязателен" },
      { status: 400 }
    );
  }

  try {
    const result = await memeService.deleteMeme(memeId, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === 'Мем не найден' ? 404 :
                     error.message.includes('Нет прав') ? 403 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "Ошибка при удалении мема" },
      { status: 500 }
    );
  }
}, 'api');
