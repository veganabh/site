import { Card } from "@/components/ui/card";

export default function GestaoLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando painel de gestão">
      {/* Banner skeleton */}
      <div className="h-10 w-full animate-pulse rounded-md bg-paper-100" />

      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-32 animate-pulse rounded bg-paper-100" />
        <div className="h-5 w-48 animate-pulse rounded bg-paper-100" />
      </div>

      {/* Grid skeleton — 8 cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} padding="md" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-md bg-paper-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-paper-100" />
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-paper-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-paper-100" />
            <div className="mt-auto h-9 w-full animate-pulse rounded-sm bg-paper-100" />
          </Card>
        ))}
      </div>
    </div>
  );
}
