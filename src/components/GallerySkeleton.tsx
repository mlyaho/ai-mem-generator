export default function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-pulse"
        />
      ))}
    </div>
  );
}
