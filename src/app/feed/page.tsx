"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Meme {
  id: string;
  imageUrl: string;
  topText: string;
  bottomText: string;
  isPublic: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export default function Feed() {
  const { data: session } = useSession();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadMemes();
  }, []);

  const loadMemes = async (cursor?: string | null) => {
    try {
      let url = "/api/memes?isPublic=true";
      if (cursor) url += `&cursor=${cursor}`;

      const res = await fetch(url);
      const data = await res.json();

      if (cursor) {
        setMemes((prev) => [...prev, ...(data.items || [])]);
      } else {
        setMemes(data.items || []);
      }
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Failed to load memes:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      loadMemes(nextCursor);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50
                    dark:from-zinc-950 dark:via-zinc-900 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600
                     bg-clip-text text-transparent"
          >
            🎭 AI Meme Generator
          </Link>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                <Link
                  href="/profile"
                  className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700
                           rounded-xl font-medium text-zinc-700 dark:text-zinc-300
                           hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                >
                  👤 Профиль
                </Link>
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-10 h-10 rounded-full"
                  />
                )}
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600
                         text-white font-medium rounded-xl
                         hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Войти
              </Link>
            )}
          </div>
        </div>

        {/* Feed Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600
                         bg-clip-text text-transparent mb-2">
            🌍 Лента мемов
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Лучшие мемы от сообщества
          </p>
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            Загрузка...
          </div>
        ) : memes.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            <p className="text-lg">Лента пуста</p>
            <p className="text-sm">Будьте первым, кто создаст мем!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {memes.map((meme) => (
                <div
                  key={meme.id}
                  className="group relative aspect-square rounded-xl overflow-hidden
                             bg-zinc-100 dark:bg-zinc-800
                             hover:ring-2 hover:ring-purple-500 transition-all"
                >
                  <img
                    src={meme.imageUrl}
                    alt="Meme"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2">
                        {meme.topText || meme.bottomText || "Без текста"}
                      </p>
                    </div>
                  </div>

                  {meme.user && (
                    <div className="absolute top-2 left-2 flex items-center gap-2">
                      {meme.user.image ? (
                        <img
                          src={meme.user.image}
                          alt={meme.user.name || "User"}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600
                                        flex items-center justify-center text-xs font-bold text-white">
                          {meme.user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {nextCursor && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600
                           text-white font-semibold rounded-xl
                           hover:from-purple-700 hover:to-pink-700
                           transition-all duration-300 disabled:opacity-50"
                >
                  {isLoadingMore ? "Загрузка..." : "Загрузить ещё"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
