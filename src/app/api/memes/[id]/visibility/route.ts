import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const { isPublic } = await req.json();

    const meme = await prisma.meme.findUnique({
      where: { id },
    });

    if (!meme) {
      return NextResponse.json(
        { error: "Мем не найден" },
        { status: 404 }
      );
    }

    if (meme.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Нет прав на редактирование этого мема" },
        { status: 403 }
      );
    }

    const updatedMeme = await prisma.meme.update({
      where: { id },
      data: { isPublic },
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

    return NextResponse.json(updatedMeme);
  } catch (error) {
    console.error("Update meme visibility error:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении" },
      { status: 500 }
    );
  }
}
