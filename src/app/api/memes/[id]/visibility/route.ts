import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { memeService } from "@/services/app";

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

    const updatedMeme = await memeService.updateVisibility(id, session.user.id, isPublic);
    return NextResponse.json(updatedMeme);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === 'Мем не найден' ? 404 :
                     error.message.includes('Нет прав') ? 403 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }
    console.error("Update meme visibility error:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении" },
      { status: 500 }
    );
  }
}
