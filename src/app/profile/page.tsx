"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import GallerySkeleton from "@/components/GallerySkeleton";

interface Meme {
  id: string;
  imageUrl: string;
  topText: string;
  bottomText: string;
  isPublic: boolean;
  createdAt: string;
}

// Для локальных мемов (без авторизации)
interface LocalMeme {
  id: string;
  imageSrc: string;
  topText: string;
  bottomText: string;
  createdAt: number;
}

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();
  const router = useRouter();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [localMemes, setLocalMemes] = useState<LocalMeme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublicFilter, setIsPublicFilter] = useState<"all" | "public" | "private">("all");

  // Редирект если не авторизован и нет локальных мемов
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Проверяем есть ли локальные мемы
      const saved = localStorage.getItem("meme-gallery");
      if (!saved) {
        router.push("/auth/signin");
      }
    }
  }, [isAuthenticated, authLoading, router]);

  // Загрузка локальных мемов
  useEffect(() => {
    if (!isAuthenticated) {
      const saved = localStorage.getItem("meme-gallery");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLocalMemes(parsed);
        } catch {
          console.error("Failed to load local memes");
        }
      }
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadMemes = useCallback(async () => {
    console.log(session?.user?.id)
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      let url = `/api/memes?userId=${session.user.id}`;
      if (isPublicFilter === "public") url += "&isPublic=true";
      if (isPublicFilter === "private") url += "&isPublic=false";

      const res = await fetch(url);
      const data = await res.json();
      setMemes(data.items || []);
    } catch (error) {
      console.error("Failed to load memes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, isPublicFilter]);

  useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      loadMemes();
    }
  }, [isAuthenticated, loadMemes, session?.user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот мем?")) return;

    try {
      const res = await fetch(`/api/memes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemes((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete meme:", error);
    }
  };

  const handleTogglePublic = async (id: string, currentIsPublic: boolean) => {
    try {
      const res = await fetch(`/api/memes/${id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !currentIsPublic }),
      });

      if (res.ok) {
        setMemes((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isPublic: !currentIsPublic } : m))
        );
      }
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  };

  // Заглушка для загрузки
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50
                      dark:from-zinc-950 dark:via-zinc-900 dark:to-purple-950
                      flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50
                    dark:from-zinc-950 dark:via-zinc-900 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600
                       bg-clip-text text-transparent"
            >
              🎭 AI Meme Generator
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700
                       rounded-xl font-medium text-zinc-700 dark:text-zinc-300
                       hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              🌍 Лента мемов
            </Link>
            {session?.user && (
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl
                           text-zinc-700 dark:text-zinc-300 font-medium
                           hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={80}
                height={80}
                className="rounded-full"
                priority
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600
                              flex items-center justify-center text-3xl font-bold text-white">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
                {session?.user?.name || "Пользователь"}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">{session?.user?.email}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                📊 Мемов: {memes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
              📚 Моя галерея
            </h2>
            <div className="flex gap-2">
              <select
                value={isPublicFilter}
                onChange={(e) => setIsPublicFilter(e.target.value as "all" | "public" | "private")}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700
                         rounded-xl text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Все мемы</option>
                <option value="public">Публичные</option>
                <option value="private">Приватные</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <GallerySkeleton />
          ) : memes.length === 0 && localMemes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <p className="text-lg">Галерея пуста</p>
              <Link
                href="/"
                className="text-purple-600 hover:text-purple-500 font-medium mt-2 inline-block"
              >
                Создать первый мем →
              </Link>
            </div>
          ) : (
            <>
              {/* Локальные мемы (без авторизации) */}
              {localMemes.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                    📱 Локальные мемы ({localMemes.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {localMemes.map((meme, index) => (
                      <div
                        key={meme.id}
                        className="group relative aspect-square rounded-xl overflow-hidden
                                   bg-zinc-100 dark:bg-zinc-800 cursor-pointer
                                   hover:ring-2 hover:ring-purple-500 transition-all"
                        onClick={() => {
                          router.push("/");
                          localStorage.setItem("selected-meme", JSON.stringify(meme));
                        }}
                      >
                        <img
                          src={meme.imageSrc}
                          alt="Meme"
                          className="w-full h-full object-cover"
                          loading={index < 4 ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent
                                        opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-white text-xs line-clamp-2">
                              {meme.topText || meme.bottomText || "Без текста"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      💡 Эти мемы сохранены только в этом браузере.{" "}
                      <Link href="/auth/signin" className="underline font-medium">
                        Войдите
                      </Link>{" "}
                      чтобы синхронизировать с облаком.
                    </p>
                  </div>
                </div>
              )}

              {/* Мемы из БД (авторизованные) */}
              {memes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {memes.map((meme, index) => (
                    <div
                      key={meme.id}
                      className="group relative aspect-square rounded-xl overflow-hidden
                             bg-zinc-100 dark:bg-zinc-800 cursor-pointer
                             hover:ring-2 hover:ring-purple-500 transition-all"
                    >
                      <Image
                        src={meme.imageUrl}
                        alt="Meme"
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                        loading={index < 8 ? "eager" : "lazy"}
                        priority={index < 8}
                      />

                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${meme.isPublic
                            ? "bg-green-500 text-white"
                            : "bg-zinc-700 text-white"
                            }`}
                        >
                          {meme.isPublic ? "🌍 Публичный" : "🔒 Приватный"}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs line-clamp-2">
                            {meme.topText || meme.bottomText || "Без текста"}
                          </p>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTogglePublic(meme.id, meme.isPublic)}
                          className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all"
                          title={meme.isPublic ? "Сделать приватным" : "Сделать публичным"}
                        >
                          {meme.isPublic ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(meme.id)}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
