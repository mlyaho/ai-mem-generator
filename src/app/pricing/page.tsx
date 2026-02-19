"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Plan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  cta: string;
  popular?: boolean;
}

interface CreditPack {
  amount: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: 0,
    period: "навсегда",
    description: "Для знакомства с сервисом",
    features: [
      "3 AI генерации в день",
      "До 10 сохранённых мемов",
      "Качество 512px",
      "Публичные мемы",
      "Базовая поддержка",
    ],
    limitations: [
      "Водяной знак на мемах",
      "Очередь на генерацию",
      "Нет приватных мемов",
    ],
    cta: "Начать бесплатно",
  },
  {
    name: "Premium",
    price: 299,
    period: "в месяц",
    description: "Для активных создателей",
    features: [
      "50 AI генераций в день",
      "Безлимитные сохранённые мемы",
      "HD качество (1024px)",
      "Без водяных знаков",
      "Приоритетная генерация",
      "Приватные мемы",
      "Email поддержка",
      "История за 30 дней",
    ],
    limitations: [],
    cta: "Оформить подписку",
    popular: true,
  },
  {
    name: "Pro",
    price: 599,
    period: "в месяц",
    description: "Для профессионалов",
    features: [
      "Безлимитные AI генерации",
      "Безлимитные сохранённые мемы",
      "Ultra HD качество (2048px)",
      "Без водяных знаков",
      "VIP приоритет",
      "Приватные мемы",
      "Priority поддержка 24/7",
      "Полная история",
      "Коммерческая лицензия",
      "API доступ (1000 запросов/мес)",
    ],
    limitations: [],
    cta: "Стать Pro",
  },
];

const creditPacks: CreditPack[] = [
  { amount: 10, price: 99, bonus: 0 },
  { amount: 50, price: 399, bonus: 5, popular: true },
  { amount: 200, price: 999, bonus: 50 },
  { amount: 1000, price: 3999, bonus: 200 },
];

const actionCosts = [
  { action: "Генерация текста", credits: 1 },
  { action: "Генерация изображения", credits: 2 },
  { action: "Мем (текст + изображение)", credits: 3 },
  { action: "HD качество", credits: 1 },
  { action: "Ultra HD качество", credits: 2 },
  { action: "Удаление водяного знака", credits: 5 },
  { action: "Приоритетная генерация", credits: 2 },
];

export default function Pricing() {
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = async (plan: string) => {
    if (!session) {
      window.location.href = "/auth/signin";
      return;
    }

    setSelectedPlan(plan);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscription",
          plan: plan as "premium" | "pro",
        }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreditPurchase = async (amount: number) => {
    if (!session) {
      window.location.href = "/auth/signin";
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "credits",
          amount,
        }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-purple-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Тарифы и цены
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Выберите подходящий план или покупайте кредиты по мере необходимости
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 ${
                plan.popular
                  ? "ring-2 ring-purple-500 scale-105"
                  : "border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  Популярный
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="mb-2">
                  <span className="text-4xl font-black text-zinc-900 dark:text-white">
                    {plan.price === 0 ? "Бесплатно" : `₽${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-zinc-500 ml-2">/{plan.period}</span>
                  )}
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {feature}
                    </span>
                  </li>
                ))}
                {plan.limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-zinc-500">{limitation}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.name.toLowerCase())}
                disabled={isProcessing || plan.price === 0}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing && selectedPlan === plan.name
                  ? "Обработка..."
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Credit Packs */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-8">
            Пакеты кредитов
          </h2>
          <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Покупайте кредиты и используйте их на генерацию мемов без подписки
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creditPacks.map((pack) => (
              <div
                key={pack.amount}
                className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 ${
                  pack.popular
                    ? "ring-2 ring-purple-500"
                    : "border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                    Выгодно
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-3xl font-black text-zinc-900 dark:text-white mb-1">
                    {pack.amount}
                  </div>
                  <div className="text-zinc-500 text-sm">кредитов</div>
                </div>

                {pack.bonus > 0 && (
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-center py-1 rounded-lg mb-4 text-sm font-medium">
                    +{pack.bonus} бонусных
                  </div>
                )}

                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                    ₽{pack.price}
                  </span>
                </div>

                <button
                  onClick={() => handleCreditPurchase(pack.amount)}
                  disabled={isProcessing}
                  className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Обработка..." : "Купить"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Costs */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
            Стоимость действий
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionCosts.map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {item.action}
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {item.credits} кредит{item.credits === 1 ? "" : "а"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-8">
            Частые вопросы
          </h2>

          <div className="space-y-4">
            <details className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
              <summary className="font-semibold text-zinc-900 dark:text-white cursor-pointer">
                Как работает подписка?
              </summary>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Подписка активируется сразу после оплаты и действует 30 дней.
                По окончании периода она автоматически продлевается. Вы можете
                отменить подписку в любой момент — доступ сохранится до конца
                оплаченного периода.
              </p>
            </details>

            <details className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
              <summary className="font-semibold text-zinc-900 dark:text-white cursor-pointer">
                Что такое кредиты и как их использовать?
              </summary>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Кредиты — это внутренняя валюта для оплаты генераций. Каждый
                тип генерации стоит определённое количество кредитов. Кредиты не
                сгорают и действуют бессрочно.
              </p>
            </details>

            <details className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
              <summary className="font-semibold text-zinc-900 dark:text-white cursor-pointer">
                Можно ли сменить тариф?
              </summary>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Да, вы можете перейти на любой тариф в любое время. При переходе
                на более дорогой тариф разница будет пересчитана. При переходе на
                более дешёвый тариф изменения вступят в силу со следующего
                периода.
              </p>
            </details>

            <details className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
              <summary className="font-semibold text-zinc-900 dark:text-white cursor-pointer">
                Какие способы оплаты доступны?
              </summary>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Мы принимаем банковские карты (Visa, Mastercard, МИР), СБП, и
                электронные кошельки. Для международных платежей доступен Stripe.
              </p>
            </details>

            <details className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
              <summary className="font-semibold text-zinc-900 dark:text-white cursor-pointer">
                Есть ли возврат средств?
              </summary>
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">
                Да, вы можете запросить возврат в течение 14 дней после оплаты,
                если не использовали сервис. Возврат средств происходит в течение
                5-10 рабочих дней.
              </p>
            </details>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Остались вопросы?
          </p>
          <Link
            href="/contact"
            className="text-purple-600 hover:text-purple-500 font-medium"
          >
            Связаться с поддержкой →
          </Link>
        </div>
      </div>
    </div>
  );
}
