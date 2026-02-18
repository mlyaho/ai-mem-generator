// Проверка переменных окружения при старте приложения
export function validateEnv() {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error(
        "NEXTAUTH_SECRET должен быть установлен в production"
      );
    }

    if (process.env.NEXTAUTH_SECRET.length < 32) {
      throw new Error(
        "NEXTAUTH_SECRET должен содержать минимум 32 символа"
      );
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL должен быть установлен");
    }

    // Проверка, что NEXTAUTH_URL не localhost в production
    if (
      process.env.NEXTAUTH_URL?.includes("localhost") ||
      process.env.NEXTAUTH_URL?.includes("127.0.0.1")
    ) {
      console.warn(
        "⚠️ Предупреждение: NEXTAUTH_URL использует localhost в production"
      );
    }
  }
}

// Запуск проверки
validateEnv();
