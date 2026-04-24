export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8" role="status" aria-label="Carregando pedido">
      <div className="flex animate-pulse flex-col gap-4">
        {/* Cabeçalho */}
        <div className="h-5 w-32 rounded bg-paper-100" />
        <div className="h-7 w-48 rounded bg-paper-100" />

        {/* Card status */}
        <div className="h-20 w-full rounded-2xl bg-paper-100" />

        {/* Stepper */}
        <div className="mt-2 flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 shrink-0 rounded-full bg-paper-100" />
              <div className="flex flex-col gap-1.5 pt-0.5">
                <div className="h-4 w-40 rounded bg-paper-100" />
                <div className="h-3 w-16 rounded bg-paper-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
