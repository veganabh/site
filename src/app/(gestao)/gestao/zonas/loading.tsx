export default function ZonasLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-paper-100" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-paper-100" />
      </div>

      {/* Map + panel skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-[500px] animate-pulse rounded-lg bg-paper-100" />
        <div className="flex flex-col gap-4">
          <div className="h-24 animate-pulse rounded-lg bg-paper-100" />
          <div className="h-12 animate-pulse rounded-lg bg-paper-100" />
          <div className="h-80 animate-pulse rounded-lg bg-paper-100" />
        </div>
      </div>
    </div>
  );
}
