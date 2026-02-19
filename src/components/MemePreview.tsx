"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface MemePreviewProps {
  imageSrc: string;
  topText: string;
  bottomText: string;
  onTextChange: (top: string, bottom: string) => void;
  onImageError?: () => void;
}

export default function MemePreview({
  imageSrc,
  topText,
  bottomText,
  onTextChange,
  onImageError,
}: MemePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(true);
  const isDataUrl = imageSrc?.startsWith("data:");

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `meme-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleImageError = () => {
    setImageLoaded(false);
    onImageError?.();
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative inline-block max-w-full">
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {imageLoaded ? (
            isDataUrl ? (
              // Для Data URL используем обычный img
              <img
                src={imageSrc}
                alt="Meme base"
                className="w-full max-w-[500px] h-auto object-contain bg-zinc-100 dark:bg-zinc-800"
                onError={handleImageError}
              />
            ) : (
              // Для внешних URL используем Next.js Image
              <div className="relative w-full max-w-[500px] h-auto aspect-square">
                <Image
                  src={imageSrc}
                  alt="Meme base"
                  fill
                  sizes="(max-width: 500px) 100vw, 500px"
                  className="object-contain bg-zinc-100 dark:bg-zinc-800"
                  onError={handleImageError}
                  priority
                />
              </div>
            )
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
              <p className="text-zinc-500 dark:text-zinc-400">Изображение не загрузилось</p>
            </div>
          )}
          
          {/* Top Text */}
          <div className="absolute top-4 left-4 right-4">
            <textarea
              value={topText}
              onChange={(e) => onTextChange(e.target.value, bottomText)}
              placeholder="Текст сверху..."
              className="w-full text-center text-2xl md:text-4xl font-black 
                         text-white bg-black/60 px-4 py-2 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-purple-500
                         placeholder:text-white/50"
              rows={2}
            />
          </div>
          
          {/* Bottom Text */}
          <div className="absolute bottom-4 left-4 right-4">
            <textarea
              value={bottomText}
              onChange={(e) => onTextChange(topText, e.target.value)}
              placeholder="Текст снизу..."
              className="w-full text-center text-2xl md:text-4xl font-black 
                         text-white bg-black/60 px-4 py-2 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-purple-500
                         placeholder:text-white/50"
              rows={2}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleExport}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 
                   text-white font-semibold rounded-2xl text-lg
                   hover:from-green-600 hover:to-emerald-700
                   transition-all duration-300 shadow-lg hover:shadow-xl"
      >
        📥 Скачать мем
      </button>
    </div>
  );
}
