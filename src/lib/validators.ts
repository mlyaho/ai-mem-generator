import { z } from "zod";

// Схема для регистрации
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email обязателен")
    .email("Некорректный email")
    .max(255, "Email слишком длинный"),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(128, "Пароль слишком длинный")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Пароль должен содержать заглавные и строчные буквы, а также цифры"
    ),
  name: z
    .string()
    .max(50, "Имя слишком длинное")
    .regex(/^[\w\s-]*$/, "Имя содержит недопустимые символы")
    .optional()
    .or(z.literal("")),
});

// Схема для создания мема
export const memeSchema = z.object({
  imageUrl: z
    .string()
    .min(1, "Изображение обязательно")
    .url("Некорректный URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Разрешаем только http/https
          if (!["https:", "http:"].includes(parsed.protocol)) {
            return false;
          }
          // Блокируем javascript: и data: URL
          if (url.startsWith("javascript:") || url.startsWith("data:")) {
            return false;
          }
          // Блокируем внутренние IP адреса
          const internalIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|localhost)/i;
          if (internalIpPattern.test(parsed.hostname)) {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      },
      { message: "Небезопасный URL изображения" }
    ),
  topText: z.string().max(200, "Текст слишком длинный").optional(),
  bottomText: z.string().max(200, "Текст слишком длинный").optional(),
  isPublic: z.boolean().optional().default(true),
});

// Схема для обновления видимости
export const visibilitySchema = z.object({
  isPublic: z.boolean(),
});
