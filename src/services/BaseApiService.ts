/**
 * Базовый абстрактный класс для API-сервисов
 */
export abstract class BaseApiService {
  protected baseUrl: string;
  protected timeout: number;

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Выполняет GET-запрос с таймаутом
   */
  protected async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: this.getHeaders(),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      return await this.parseResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      throw new ApiError(`Network error: ${error}`, 0);
    }
  }

  /**
   * Выполняет POST-запрос с таймаутом
   */
  protected async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(body),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      return await this.parseResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      throw new ApiError(`Network error: ${error}`, 0);
    }
  }

  /**
   * Получает заголовки для запросов
   */
  protected getHeaders(): Record<string, string> {
    return {};
  }

  /**
   * Парсит ответ в зависимости от Content-Type
   */
  protected async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as Promise<T>;
    }
    
    // Для бинарных данных (изображения и т.д.)
    return response.blob() as Promise<T>;
  }

  /**
   * Абстрактный метод для проверки доступности сервиса
   */
  abstract healthCheck(): Promise<boolean>;
}

/**
 * Ошибка API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
