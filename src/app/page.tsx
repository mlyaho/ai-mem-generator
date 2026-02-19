"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import ImageUpload from "@/components/ImageUpload";
import AIPrompt from "@/components/AIPrompt";
import MemePreview from "@/components/MemePreview";
import MemeGallery from "@/components/MemeGallery";
import { apiFactory, pollinationsService } from "@/services";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Инициализация сервисов
apiFactory.register("pollinations", pollinationsService);

interface Meme {
  id: string;
  imageSrc: string;
  topText: string;
  bottomText: string;
  createdAt: number;
}

export default function Home() {
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [image, setImage] = useState<string | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("meme-gallery");
    if (saved) {
      try {
        setMemes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load memes");
      }
    }
  }, []);

  // Debounced localStorage save - сохраняем только через 500ms после изменений
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem("meme-gallery", JSON.stringify(memes));
    }, 500);
    return () => clearTimeout(handler);
  }, [memes]);

  const handleImageSelect = useCallback((file: File, preview: string) => {
    setImage(preview);
    setGeneratedImage(null);
    setImageError(null);
    setTopText("");
    setBottomText("");
  }, []);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setImageError(null);

    try {
      const service = apiFactory.getService();
      const result = await service.generateMeme(prompt);

      if (result.imageUrl) {
        setImage(result.imageUrl);
        setGeneratedImage(result.imageUrl);
      }
      setTopText(result.topText);
      setBottomText(result.bottomText);
    } catch (error) {
      console.error("AI generation error:", error);
      setImageError("Не удалось сгенерировать мем");
    }

    setIsLoading(false);
  }, []);

  const handleTextChange = useCallback((top: string, bottom: string) => {
    setTopText(top);
    setBottomText(bottom);
  }, []);

  const handleSaveMeme = useCallback(async () => {
    if (!image) return;

    if (!session) {
      // Если не авторизован - сохраняем локально
      const newMeme: Meme = {
        id: Date.now().toString(),
        imageSrc: image,
        topText,
        bottomText,
        createdAt: Date.now(),
      };
      setMemes((prev) => [newMeme, ...prev]);
      return;
    }

    // Если авторизован - сохраняем в БД
    try {
      const res = await fetch("/api/memes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: image,
          topText,
          bottomText,
          isPublic,
        }),
      });

      if (res.ok) {
        alert("Мем сохранен в вашу галерею!");
        router.push("/profile");
      } else {
        const data = await res.json();
        alert("Ошибка: " + data.error);
      }
    } catch (error) {
      console.error("Save meme error:", error);
      alert("Не удалось сохранить мем");
    }
  }, [image, topText, bottomText, isPublic, session, router]);

  const handleSelectMeme = useCallback((meme: Meme) => {
    setImage(meme.imageSrc);
    setTopText(meme.topText);
    setBottomText(meme.bottomText);
  }, []);

  const handleDeleteMeme = useCallback((id: string) => {
    setMemes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Показываем загрузку пока сессия не загрузится
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600
                           bg-clip-text text-transparent mb-2">
              🎭 AI Meme Generator
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Загрузи фото → AI придумает текст → Стань легендой
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700
                       rounded-xl font-medium text-zinc-700 dark:text-zinc-300
                       hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              🌍 Лента
            </Link>
            {session ? (
              <Link
                href="/profile"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600
                         text-white font-medium rounded-xl
                         hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                👤 Профиль
              </Link>
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
        </header>

        <div className="space-y-8">
          {/* Upload Section */}
          {!image ? (
            <ImageUpload onImageSelect={handleImageSelect} />
          ) : (
            <div className="space-y-6">
              {/* AI Prompt */}
              <AIPrompt onGenerate={handleGenerate} isLoading={isLoading} />

              {/* Error Message */}
              {imageError && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
                  ⚠️ {imageError}
                </div>
              )}

              {/* Meme Preview */}
              <MemePreview
                imageSrc={image}
                topText={topText}
                bottomText={bottomText}
                onTextChange={handleTextChange}
                onImageError={() => setImageError("Изображение не загрузилось")}
              />

              {/* Privacy Toggle (только для авторизованных) */}
              {session && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4
                                  peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800
                                  rounded-full peer dark:bg-zinc-700
                                  peer-checked:after:translate-x-full peer-checked:after:border-white
                                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                  after:bg-white after:border-zinc-300 after:border after:rounded-full
                                  after:h-5 after:w-5 after:transition-all dark:border-zinc-600
                                  peer-checked:bg-purple-600"></div>
                    <span className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {isPublic ? "🌍 Публичный (видно всем)" : "🔒 Приватный (только мне)"}
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSaveMeme}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600
                           text-white font-semibold rounded-2xl text-lg
                           hover:from-purple-700 hover:to-pink-700
                           transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  💾 {session ? "Сохранить в галерею" : "Сохранить локально"}
                </button>
                <button
                  onClick={() => setImage(null)}
                  className="px-8 py-4 bg-zinc-200 dark:bg-zinc-800
                           text-zinc-700 dark:text-zinc-300 font-semibold rounded-2xl
                           hover:bg-zinc-300 dark:hover:bg-zinc-700
                           transition-all duration-300"
                >
                  🔄 Новое фото
                </button>
              </div>

              {!session && (
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl text-yellow-800 dark:text-yellow-300 text-sm">
                  💡 <strong>Совет:</strong> <Link href="/auth/signup" className="underline font-medium">Зарегистрируйтесь</Link>, чтобы сохранять мемы в облаке и делиться ими с другими!
                </div>
              )}
            </div>
          )}

          {/* Gallery Section */}
          <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
              📚 Твоя галерея
            </h2>
            <MemeGallery
              memes={memes}
              onSelect={handleSelectMeme}
              onDelete={handleDeleteMeme}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
