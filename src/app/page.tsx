"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import AIPrompt from "@/components/AIPrompt";
import MemePreview from "@/components/MemePreview";
import MemeGallery from "@/components/MemeGallery";
import { apiFactory, pollinationsService } from "@/services";

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
  const [image, setImage] = useState<string | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

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

  useEffect(() => {
    localStorage.setItem("meme-gallery", JSON.stringify(memes));
  }, [memes]);

  const handleImageSelect = (file: File, preview: string) => {
    setImage(preview);
    setGeneratedImage(null);
    setImageError(null);
    setTopText("");
    setBottomText("");
  };

  const handleGenerate = async (prompt: string) => {
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
  };

  const handleTextChange = (top: string, bottom: string) => {
    setTopText(top);
    setBottomText(bottom);
  };

  const handleSaveMeme = () => {
    if (!image) return;

    const newMeme: Meme = {
      id: Date.now().toString(),
      imageSrc: image,
      topText,
      bottomText,
      createdAt: Date.now(),
    };

    setMemes((prev) => [newMeme, ...prev]);
  };

  const handleSelectMeme = (meme: Meme) => {
    setImage(meme.imageSrc);
    setTopText(meme.topText);
    setBottomText(meme.bottomText);
  };

  const handleDeleteMeme = (id: string) => {
    setMemes((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 
                    dark:from-zinc-950 dark:via-zinc-900 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 
                         bg-clip-text text-transparent mb-2">
            🎭 AI Meme Generator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Загрузи фото → AI придумает текст → Стань легендой
          </p>
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

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleSaveMeme}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 
                           text-white font-semibold rounded-2xl text-lg
                           hover:from-purple-700 hover:to-pink-700
                           transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  💾 Сохранить в галерею
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
