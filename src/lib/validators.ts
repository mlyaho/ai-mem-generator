import { z } from 'zod';

/**
 * 🔒 Валидатор для AI prompt
 */
export const promptValidator = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt обязателен')
    .max(2000, 'Prompt слишком длинный (макс. 2000 символов)'),
});

/**
 * 🔒 Валидатор для размеров изображения
 */
export const dimensionsValidator = z.object({
  width: z
    .number()
    .optional()
    .refine(
      (val) => !val || [256, 512, 768, 1024].includes(val),
      'Некорректная ширина (256, 512, 768, 1024)'
    ),
  height: z
    .number()
    .optional()
    .refine(
      (val) => !val || [256, 512, 768, 1024].includes(val),
      'Некорректная высота (256, 512, 768, 1024)'
    ),
});

/**
 * 🔒 Комбинированный валидатор для AI генерации
 */
export const aiGenerationValidator = promptValidator.merge(dimensionsValidator);

/**
 * 🔒 Валидатор для email
 */
export const emailValidator = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Некорректный email')
    .max(255, 'Email слишком длинный'),
});

/**
 * 🔒 Валидатор для пароля
 */
export const passwordValidator = z.object({
  password: z
    .string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(128, 'Пароль слишком длинный'),
});

/**
 * 🔒 Валидатор для регистрации
 */
export const registerValidator = emailValidator.merge(passwordValidator).extend({
  name: z
    .string()
    .max(50, 'Имя слишком длинное')
    .optional()
    .or(z.literal('')),
});

/**
 * 🔒 Валидатор для URL изображения (с SSRF защитой)
 */
export const imageUrlValidator = z
  .string()
  .min(1, 'Изображение обязательно')
  .url('Некорректный URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        
        // Только http/https
        if (!['https:', 'http:'].includes(parsed.protocol)) {
          return false;
        }
        
        // Блокировка опасных протоколов
        if (url.toLowerCase().match(/^(javascript:|data:|vbscript:|file:)/)) {
          return false;
        }
        
        // Блокировка внутренних IP
        const internalIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|localhost)/i;
        if (internalIpPattern.test(parsed.hostname)) {
          return false;
        }
        
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Небезопасный URL изображения' }
  );

/**
 * 🔒 Валидатор для создания мема
 */
export const memeValidator = z.object({
  imageUrl: imageUrlValidator,
  topText: z.string().max(200, 'Текст слишком длинный').optional(),
  bottomText: z.string().max(200, 'Текст слишком длинный').optional(),
  isPublic: z.boolean().optional().default(true),
});

/**
 * 🔒 Валидатор для изменения видимости
 */
export const visibilityValidator = z.object({
  isPublic: z.boolean(),
});

/**
 * 🔒 Универсальная функция валидации
 * 
 * @example
 * const validation = validateRequest(body, aiGenerationValidator);
 * if (!validation.success) {
 *   return NextResponse.json({ error: validation.error }, { status: 400 });
 * }
 */
export function validateRequest<T extends z.ZodType>(
  data: unknown,
  schema: T
): { success: boolean; data?: z.infer<T>; error?: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(e => e.message).join('; '),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}
