"use client";

import Image from "next/image";

interface Meme {
  id: string;
  imageSrc: string;
  topText: string;
  bottomText: string;
  createdAt: number;
}

interface MemeGalleryProps {
  memes: Meme[];
  onSelect: (meme: Meme) => void;
  onDelete: (id: string) => void;
}

export default function MemeGallery({ memes, onSelect, onDelete }: MemeGalleryProps) {
  if (memes.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        <p className="text-lg">Галерея пуста</p>
        <p className="text-sm">Создайте свой первый мем!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {memes.map((meme, index) => (
        <div
          key={meme.id}
          className="group relative aspect-square rounded-xl overflow-hidden
                     bg-zinc-100 dark:bg-zinc-800 cursor-pointer
                     hover:ring-2 hover:ring-purple-500 transition-all"
          onClick={() => onSelect(meme)}
        >
          <Image
            src={meme.imageSrc}
            alt="Meme"
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
            loading={index < 4 ? "eager" : "lazy"}
            priority={index < 4}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent 
                          opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-xs line-clamp-2">
                {meme.topText || meme.bottomText || "Без текста"}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(meme.id);
            }}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full
                       opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
