import { describe, it, expect } from 'vitest';
import {
  promptValidator,
  dimensionsValidator,
  aiGenerationValidator,
  emailValidator,
  passwordValidator,
  registerValidator,
  imageUrlValidator,
  memeValidator,
  visibilityValidator,
  validateRequest,
} from '@/lib/validators';

describe('validators', () => {
  describe('promptValidator', () => {
    it('должен принимать валидный prompt', () => {
      const result = promptValidator.safeParse({ prompt: 'Generate a cat meme' });
      expect(result.success).toBe(true);
    });

    it('должен отклонять пустой prompt', () => {
      const result = promptValidator.safeParse({ prompt: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Prompt обязателен');
      }
    });

    it('должен отклонять prompt длиннее 2000 символов', () => {
      const longPrompt = 'a'.repeat(2001);
      const result = promptValidator.safeParse({ prompt: longPrompt });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('макс. 2000');
      }
    });
  });

  describe('dimensionsValidator', () => {
    it('должен принимать валидные размеры', () => {
      const result = dimensionsValidator.safeParse({ width: 512, height: 512 });
      expect(result.success).toBe(true);
    });

    it('должен принимать только разрешённые размеры', () => {
      const validSizes = [256, 512, 768, 1024];
      for (const size of validSizes) {
        const result = dimensionsValidator.safeParse({ width: size, height: size });
        expect(result.success).toBe(true);
      }
    });

    it('должен отклонять недопустимые размеры', () => {
      const result = dimensionsValidator.safeParse({ width: 300, height: 300 });
      expect(result.success).toBe(false);
    });

    it('должен принимать отсутствие размеров (опционально)', () => {
      const result = dimensionsValidator.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('aiGenerationValidator', () => {
    it('должен принимать валидный prompt и размеры', () => {
      const result = aiGenerationValidator.safeParse({
        prompt: 'Generate a dog',
        width: 512,
        height: 512,
      });
      expect(result.success).toBe(true);
    });

    it('должен отклонять невалидный prompt', () => {
      const result = aiGenerationValidator.safeParse({
        prompt: '',
        width: 512,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('emailValidator', () => {
    it('должен принимать валидный email', () => {
      const result = emailValidator.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('должен отклонять невалидный email', () => {
      const result = emailValidator.safeParse({ email: 'invalid-email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Некорректный email');
      }
    });

    it('должен отклонять пустой email', () => {
      const result = emailValidator.safeParse({ email: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('passwordValidator', () => {
    it('должен принимать пароль от 6 символов', () => {
      const result = passwordValidator.safeParse({ password: '123456' });
      expect(result.success).toBe(true);
    });

    it('должен отклонять пароль короче 6 символов', () => {
      const result = passwordValidator.safeParse({ password: '12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('минимум 6 символов');
      }
    });

    it('должен отклонять пустой пароль', () => {
      const result = passwordValidator.safeParse({ password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerValidator', () => {
    it('должен принимать валидные данные регистрации', () => {
      const result = registerValidator.safeParse({
        email: 'test@example.com',
        password: '123456',
        name: 'John',
      });
      expect(result.success).toBe(true);
    });

    it('должен принимать пустое имя', () => {
      const result = registerValidator.safeParse({
        email: 'test@example.com',
        password: '123456',
        name: '',
      });
      expect(result.success).toBe(true);
    });

    it('должен отклонять имя длиннее 50 символов', () => {
      const longName = 'a'.repeat(51);
      const result = registerValidator.safeParse({
        email: 'test@example.com',
        password: '123456',
        name: longName,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('imageUrlValidator', () => {
    it('должен принимать валидный HTTPS URL', () => {
      const result = imageUrlValidator.safeParse('https://example.com/image.png');
      expect(result.success).toBe(true);
    });

    it('должен принимать валидный HTTP URL', () => {
      const result = imageUrlValidator.safeParse('http://example.com/image.png');
      expect(result.success).toBe(true);
    });

    it('должен отклонять пустой URL', () => {
      const result = imageUrlValidator.safeParse('');
      expect(result.success).toBe(false);
    });

    it('должен отклонять невалидный URL', () => {
      const result = imageUrlValidator.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });

    it('должен отклонять javascript: протокол', () => {
      const result = imageUrlValidator.safeParse('javascript:alert(1)');
      expect(result.success).toBe(false);
    });

    it('должен отклонять data: протокол', () => {
      const result = imageUrlValidator.safeParse('data:image/png;base64,abc');
      expect(result.success).toBe(false);
    });

    it('должен отклонять внутренние IP (192.168.x.x)', () => {
      const result = imageUrlValidator.safeParse('http://192.168.1.1/image.png');
      expect(result.success).toBe(false);
    });

    it('должен отклонять localhost', () => {
      const result = imageUrlValidator.safeParse('http://localhost/image.png');
      expect(result.success).toBe(false);
    });

    it('должен отклонять 127.0.0.1', () => {
      const result = imageUrlValidator.safeParse('http://127.0.0.1/image.png');
      expect(result.success).toBe(false);
    });

    it('должен отклонять 10.x.x.x', () => {
      const result = imageUrlValidator.safeParse('http://10.0.0.1/image.png');
      expect(result.success).toBe(false);
    });

    it('должен отклонять 172.16.x.x - 172.31.x.x', () => {
      const result = imageUrlValidator.safeParse('http://172.16.0.1/image.png');
      expect(result.success).toBe(false);
    });
  });

  describe('memeValidator', () => {
    it('должен принимать валидные данные мема', () => {
      const result = memeValidator.safeParse({
        imageUrl: 'https://example.com/meme.png',
        topText: 'Top text',
        bottomText: 'Bottom text',
        isPublic: true,
      });
      expect(result.success).toBe(true);
    });

    it('должен принимать без текста (опционально)', () => {
      const result = memeValidator.safeParse({
        imageUrl: 'https://example.com/meme.png',
      });
      expect(result.success).toBe(true);
    });

    it('должен отклонять невалидный imageUrl', () => {
      const result = memeValidator.safeParse({
        imageUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('должен отклонять topText длиннее 200 символов', () => {
      const longText = 'a'.repeat(201);
      const result = memeValidator.safeParse({
        imageUrl: 'https://example.com/meme.png',
        topText: longText,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('visibilityValidator', () => {
    it('должен принимать true', () => {
      const result = visibilityValidator.safeParse({ isPublic: true });
      expect(result.success).toBe(true);
    });

    it('должен принимать false', () => {
      const result = visibilityValidator.safeParse({ isPublic: false });
      expect(result.success).toBe(true);
    });

    it('должен отклонять отсутствие isPublic', () => {
      const result = visibilityValidator.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('validateRequest', () => {
    it('должен возвращать успех для валидных данных', () => {
      const validation = validateRequest(
        { email: 'test@example.com', password: '123456' },
        registerValidator
      );
      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data?.email).toBe('test@example.com');
      }
    });

    it('должен возвращать ошибку для невалидных данных', () => {
      const validation = validateRequest(
        { email: 'invalid', password: '12' },
        registerValidator
      );
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error).toBeDefined();
      }
    });

    it('должен возвращать несколько ошибок', () => {
      const validation = validateRequest(
        { email: '', password: '' },
        registerValidator
      );
      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error).toContain(';');
      }
    });
  });
});
