import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60 * 1000, maxRequests: 5 },      // 5 запросов в минуту
  api: { windowMs: 60 * 1000, maxRequests: 30 },      // 30 запросов в минуту
  ai: { windowMs: 60 * 1000, maxRequests: 10 },       // 10 запросов в минуту
};

export function rateLimit(
  req: NextRequest,
  type: "auth" | "api" | "ai" = "api"
): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const now = Date.now();
  const config = RATE_LIMIT_CONFIG[type];
  
  const userLimit = rateLimitMap.get(ip) || { 
    count: 0, 
    resetTime: now + config.windowMs 
  };

  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + config.windowMs;
  }

  userLimit.count++;
  rateLimitMap.set(ip, userLimit);

  if (userLimit.count > config.maxRequests) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: "Слишком много запросов. Попробуйте позже.",
        retryAfter: retryAfter 
      },
      { 
        status: 429,
        headers: { 
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": String(0),
        },
      }
    );
  }

  return null;
}

// Очистка старых записей (каждые 5 минут)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
