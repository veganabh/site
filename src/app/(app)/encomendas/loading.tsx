export default function EncomendasLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Hero banner skeleton */}
      <div className="min-h-[216px] animate-pulse rounded-sm bg-paper-100 md:min-h-[244px]" />

      {/* Categorias skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-28 animate-pulse rounded-sm bg-paper-100" />
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="h-14 w-14 animate-pulse rounded-sm bg-paper-100 md:h-16 md:w-16" />
              <div className="h-3 w-12 animate-pulse rounded-sm bg-paper-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[4/3] animate-pulse rounded-sm bg-paper-100" />
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-paper-100" />
            <div className="h-3 w-1/2 animate-pulse rounded-sm bg-paper-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
