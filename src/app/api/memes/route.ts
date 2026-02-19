import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withAuthAndRateLimit } from "@/lib/safeHandler";
import { memeValidator, validateRequest } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

// GET - получение мемов
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const cursor = searchParams.get("cursor");

    const where: Prisma.MemeWhereInput = {};

    // 🔒 Защита от enumeration атак
    if (userId) {
      // Если запрос к своим мемам - показываем все
      if (session?.user?.id === userId) {
        where.userId = userId;
      } else {
        // Если запрос к чужим - только публичные
        where.userId = userId;
        where.isPublic = true;
      }
    } else if (isPublic !== 'true') {
      // Если userId не указан и не явно public - только публичные
      where.isPublic = true;
    }

    const take = 20;
    const skip = cursor ? 1 : 0;

    const memes = await prisma.meme.findMany({
      where,
      take: take + skip,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const nextCursor = memes.length > take ? memes[take - 1].id : null;
    const items = memes.length > take ? memes.slice(0, take) : memes;

    return NextResponse.json({
      items,
      nextCursor,
    });
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
  
  // 🔒 Валидация данных
  const validation = validateRequest(body, memeValidator);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const session = await auth();
  const { imageUrl, topText, bottomText, isPublic } = validation.data!;

  const meme = await prisma.meme.create({
    data: {
      userId: session?.user?.id || '',
      imageUrl,
      topText: topText || "",
      bottomText: bottomText || "",
      isPublic,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json(meme, { status: 201 });
}, 'api');

// DELETE - удаление мема
export const DELETE = withAuthAndRateLimit(async (req: NextRequest) => {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const memeId = searchParams.get("id");

  if (!memeId) {
    return NextResponse.json(
      { error: "ID мема обязателен" },
      { status: 400 }
    );
  }

  const meme = await prisma.meme.findUnique({
    where: { id: memeId },
  });

  if (!meme) {
    return NextResponse.json(
      { error: "Мем не найден" },
      { status: 404 }
    );
  }

  if (meme.userId !== session!.user!.id) {
    return NextResponse.json(
      { error: "Нет прав на удаление этого мема" },
      { status: 403 }
    );
  }

  await prisma.meme.delete({
    where: { id: memeId },
  });

  return NextResponse.json({ message: "Мем удален" });
}, 'api');
