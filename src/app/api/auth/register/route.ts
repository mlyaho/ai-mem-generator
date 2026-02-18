import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // 🔒 Rate limiting для защиты от brute-force
  const rateLimitResponse = rateLimit(req, "auth");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 🔒 Content-Type валидация
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: "Content-Type должен быть application/json" },
      { status: 415 }
    );
  }

  try {
    const body = await req.json();
    
    // Валидация входных данных
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(e => e.message).join("; ");
      return NextResponse.json(
        { error: errors },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split("@")[0],
      },
    });

    return NextResponse.json(
      { message: "Пользователь успешно создан", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Ошибка при регистрации" },
      { status: 500 }
    );
  }
}
