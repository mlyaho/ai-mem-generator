import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Adapter } from "next-auth/adapters";

// Хранение неудачных попыток входа в памяти (для production лучше использовать БД/Redis)
const failedLoginAttempts = new Map<string, { count: number; resetTime: number }>();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email и пароль обязательны");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const now = Date.now();
        const lockoutTime = 15 * 60 * 1000; // 15 минут
        const maxAttempts = 5;

        // Проверка блокировки
        const attempt = failedLoginAttempts.get(email.toLowerCase());
        if (attempt && now < attempt.resetTime) {
          if (attempt.count >= maxAttempts) {
            const remainingTime = Math.ceil((attempt.resetTime - now) / 60000);
            throw new Error(
              `Слишком много неудачных попыток. Попробуйте через ${remainingTime} мин.`
            );
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          // Запись неудачной попытки
          if (!attempt || now > attempt.resetTime) {
            failedLoginAttempts.set(email.toLowerCase(), { count: 1, resetTime: now + lockoutTime });
          } else {
            attempt.count++;
            failedLoginAttempts.set(email.toLowerCase(), attempt);
          }
          throw new Error("Неверный email или пароль");
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
          // Запись неудачной попытки
          if (!attempt || now > attempt.resetTime) {
            failedLoginAttempts.set(email.toLowerCase(), { count: 1, resetTime: now + lockoutTime });
          } else {
            attempt.count++;
            failedLoginAttempts.set(email.toLowerCase(), attempt);
          }
          throw new Error("Неверный email или пароль");
        }

        // Очистка при успешном входе
        failedLoginAttempts.delete(email.toLowerCase());

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  pages: {
    signIn: "/auth/signin",
  },
  // Настройки безопасности
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // 🔒 trustHost: true требуется для работы с OAuth
  // В production использовать HTTPS и правильные NEXTAUTH_URL
  trustHost: true,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
