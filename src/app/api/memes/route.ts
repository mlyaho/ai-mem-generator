import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { memeSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rateLimit";

// GET - получение мемов
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const cursor = searchParams.get("cursor");

    let where: any = {};

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

    // 🔒 Rate limiting
    const rateLimitResponse = rateLimit(req, "api");
    if (rateLimitResponse) {
      return rateLimitResponse;
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimit(req, "api");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // Валидация данных
    const validation = memeSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join("; ");
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    const { imageUrl, topText, bottomText, isPublic } = validation.data;

    const meme = await prisma.meme.create({
      data: {
        userId: session.user.id,
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
  } catch (error) {
    console.error("Create meme error:", error);
    return NextResponse.json(
      { error: "Ошибка при создании мема" },
      { status: 500 }
    );
  }
}

// DELETE - удаление мема
export async function DELETE(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimit(req, "api");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
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

    const meme = await prisma.meme.findUnique({
      where: { id: memeId },
    });

    if (!meme) {
      return NextResponse.json(
        { error: "Мем не найден" },
        { status: 404 }
      );
    }

    if (meme.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Нет прав на удаление этого мема" },
        { status: 403 }
      );
    }

    await prisma.meme.delete({
      where: { id: memeId },
    });

    return NextResponse.json({ message: "Мем удален" });
  } catch (error) {
    console.error("Delete meme error:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении мема" },
      { status: 500 }
    );
  }
}
