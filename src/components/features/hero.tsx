import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
};

/**
 * Hero da home — seção editorial afetiva no topo.
 * Copy aplicada do Brand Voice Guide §6.6.
 */
export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn("mx-auto max-w-4xl px-4 py-10 text-center md:py-16 md:text-left", className)}
      aria-label="Apresentação"
    >
      <h1 className="font-serif text-h1 text-olive-900 italic md:text-display">
        Doce feito em casa.
        <br />
        Sem lactose.
      </h1>
      <p className="mt-5 text-body-lg text-olive-700 md:mt-6">Feito à mão em Belo Horizonte.</p>
      <div aria-hidden="true" className="mt-8 flex justify-center gap-1.5 md:justify-start">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="block h-2 w-2 rounded-full bg-terra-500" />
        ))}
      </div>
    </section>
  );
}
