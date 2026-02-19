# 🧪 Mock Payment Service

Mock платёжный сервис для тестирования монетизации без подключения реальных платёжных систем (YooKassa, Stripe).

---

## 📀 Быстрый старт

### Использование в development

По умолчанию в development режиме используется Mock сервис:

```typescript
import { paymentFactory } from '@/services/payments';

const paymentService = paymentFactory.getDefaultProvider();
// MockPaymentService будет использоваться автоматически
```

### Создание платежа

```typescript
const result = await paymentService.createPayment({
  amount: 29900, // 299 рублей в копейках
  currency: 'RUB',
  description: 'Подписка Premium на 30 дней',
  userId: 'user123',
  metadata: { plan: 'premium', type: 'subscription' },
});

console.log(result.paymentId); // mock_payment_1234567890_abc123
```

---

## ⚙️ Конфигурация

### Переменные окружения

```env
# Использовать Mock сервис (по умолчанию в development)
PAYMENT_PROVIDER="mock"

# Симулировать успешную оплату
MOCK_PAYMENT_SUCCESS="true"

# Симулировать ошибку оплаты
MOCK_PAYMENT_ERROR="false"

# Задержка обработки (мс)
MOCK_PAYMENT_DELAY="100"

# Автоматически подтверждать платежи
MOCK_AUTO_CONFIRM="true"

# Логировать операции
MOCK_LOGGING="false"
```

### Программная конфигурация

```typescript
import { MockPaymentService } from '@/services/payments/mock';

const mockService = new MockPaymentService({
  simulateSuccess: true,      // Симулировать успех
  simulateError: false,       // Не симулировать ошибки
  processingDelay: 200,       // Задержка 200мс
  autoConfirmWebhooks: true,  // Авто-подтверждение
  enableLogging: true,        // Включить логи
});
```

---

## 🎯 Сценарии тестирования

### 1. Успешная оплата

```typescript
import { mockPaymentService } from '@/services/payments/mock';

mockService.updateConfig({
  simulateSuccess: true,
  simulateError: false,
});

const result = await mockService.createPayment({
  amount: 29900,
  currency: 'RUB',
  description: 'Test payment',
  userId: 'user123',
});

// Через processingDelay мс платёж будет подтверждён автоматически
```

### 2. Неудачная оплата

```typescript
mockService.updateConfig({
  simulateSuccess: false,
  simulateError: true,
});

try {
  await mockService.createPayment({
    amount: 29900,
    currency: 'RUB',
    description: 'Failed payment',
    userId: 'user123',
  });
} catch (error) {
  console.error(error.message); // "Payment simulation failed: insufficient funds"
}
```

### 3. Ручное подтверждение платежа

```typescript
const result = await mockService.createPayment({...});

// Платёж в статусе "pending"
const status = await mockService.getPaymentStatus(result.paymentId);
console.log(status.status); // "pending"

// Ручное подтверждение
mockService.confirmPayment(result.paymentId);

// Теперь платёж подтверждён
const updated = await mockService.getPaymentStatus(result.paymentId);
console.log(updated.status); // "succeeded"
```

### 4. Возврат средств

```typescript
// Создаём и подтверждаем платёж
const result = await mockService.createPayment({...});
mockService.confirmPayment(result.paymentId);

// Возвращаем средства
await mockService.refund({
  paymentId: result.paymentId,
  amount: 29900,
  description: 'Refund by request',
});

const status = await mockService.getPaymentStatus(result.paymentId);
console.log(status.status); // "succeeded" (mapped from "refunded")
```

---

## 🔍 Инспекция состояния

### Получить все платежи

```typescript
const allPayments = mockService.getAllPayments();
console.log(allPayments);
// [
//   {
//     id: "mock_payment_...",
//     amount: 29900,
//     currency: "RUB",
//     status: "succeeded",
//     ...
//   }
// ]
```

### Получить все вебхуки

```typescript
const allWebhooks = mockService.getAllWebhooks();
console.log(allWebhooks);
// [
//   {
//     paymentId: "mock_payment_...",
//     status: "succeeded",
//     amount: 29900,
//     ...
//   }
// ]
```

### Очистить состояние

```typescript
mockService.clearState();
// Все платежи и вебхуки удалены
```

---

## 📊 Диаграмма состояний

```
┌─────────┐      confirm      ┌───────────┐
│ PENDING ├──────────────────►│ SUCCEEDED │
└─────────┘                   └───────────┘
                                   │
                                   │ refund
                                   ▼
                               ┌──────────┐
                               │ REFUNDED │
                               └──────────┘

┌─────────┐
│ PENDING ├──────────────────► FAILED
└─────────┘    simulateError
```

---

## 🧪 Примеры тестов

### Unit тест с MockPaymentService

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentService } from '@/services/payments/mock';

describe('PaymentService', () => {
  let mockService: MockPaymentService;

  beforeEach(() => {
    mockService = new MockPaymentService({
      simulateSuccess: true,
      autoConfirmWebhooks: true,
      processingDelay: 0,
    });
  });

  it('должен создавать успешный платёж', async () => {
    const result = await mockService.createPayment({
      amount: 29900,
      currency: 'RUB',
      description: 'Test',
      userId: 'user123',
    });

    expect(result.paymentId).toBeDefined();
    expect(result.paymentId).toMatch(/^mock_payment_/);
  });

  it('должен подтверждать платёж', async () => {
    const result = await mockService.createPayment({...});
    
    // До подтверждения
    let status = await mockService.getPaymentStatus(result.paymentId);
    expect(status.status).toBe('pending');

    // Подтверждение
    mockService.confirmPayment(result.paymentId);

    // После подтверждения
    status = await mockService.getPaymentStatus(result.paymentId);
    expect(status.status).toBe('succeeded');
  });

  it('должен генерировать вебхуки', async () => {
    const result = await mockService.createPayment({...});
    mockService.confirmPayment(result.paymentId);

    const webhooks = mockService.getAllWebhooks();
    expect(webhooks.length).toBe(1);
    expect(webhooks[0].status).toBe('succeeded');
  });
});
```

### Integration тест с API

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('POST /api/payment/create', () => {
  beforeEach(() => {
    // Настраиваем Mock сервис перед каждым тестом
    process.env.PAYMENT_PROVIDER = 'mock';
    process.env.MOCK_PAYMENT_SUCCESS = 'true';
    process.env.MOCK_AUTO_CONFIRM = 'true';
  });

  it('должен создавать платёж и обновлять баланс', async () => {
    // Создаём платёж через API
    const response = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'credits',
        amount: 50,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.paymentId).toBeDefined();

    // Ждём подтверждения вебхука
    await new Promise(r => setTimeout(r, 200));

    // Проверяем баланс
    const balanceResponse = await fetch('/api/payment/balance');
    const balance = await balanceResponse.json();
    expect(balance.balance.current).toBe(50);
  });
});
```

---

## 🔧 API MockPaymentService

| Метод | Описание |
|-------|----------|
| `createPayment(options)` | Создать тестовый платёж |
| `getPaymentStatus(paymentId)` | Получить статус платежа |
| `refund(options)` | Возврат средств |
| `handleWebhook(body, signature)` | Обработка вебхука |
| `confirmPayment(paymentId)` | Ручное подтверждение платежа |
| `getAllPayments()` | Получить все платежи |
| `getAllWebhooks()` | Получить все вебхуки |
| `clearState()` | Очистить состояние |
| `updateConfig(config)` | Обновить конфигурацию |
| `simulateSuccessfulPayment(options)` | Симулировать успешную оплату |
| `simulateFailedPayment(options)` | Симулировать неудачную оплату |

---

## 🎯 Сценарии использования

### Development

```env
PAYMENT_PROVIDER="mock"
MOCK_PAYMENT_SUCCESS="true"
MOCK_AUTO_CONFIRM="true"
MOCK_PAYMENT_DELAY="100"
```

### Testing (CI/CD)

```env
PAYMENT_PROVIDER="mock"
MOCK_PAYMENT_SUCCESS="true"
MOCK_AUTO_CONFIRM="true"
MOCK_PAYMENT_DELAY="0"
MOCK_LOGGING="false"
```

### Demo / Staging

```env
PAYMENT_PROVIDER="mock"
MOCK_PAYMENT_SUCCESS="true"
MOCK_AUTO_CONFIRM="false"  # Ручное подтверждение для демо
MOCK_PAYMENT_DELAY="1000"  # Имитация задержки
MOCK_LOGGING="true"
```

---

## ⚠️ Ограничения

- ❌ Не поддерживает реальные платежи
- ❌ Не интегрирован с банками
- ❌ Не отправляет уведомления
- ❌ Данные хранятся только в памяти (сбрасываются при перезапуске)

---

## ✅ Преимущества

- ✅ Быстрое тестирование без реальных платежей
- ✅ Полный контроль над сценариями (успех/ошибка)
- ✅ Инспекция состояния (все платежи и вебхуки)
- ✅ Автоматическое подтверждение для удобства
- ✅ Логирование для отладки

---

**Создано:** 19 февраля 2026  
**Версия:** 1.0.0
