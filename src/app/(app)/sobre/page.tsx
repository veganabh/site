import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre — Veg.ana",
  description: "A história da Veg.ana, uma doceria vegana feita à mão em Belo Horizonte.",
};

export default function Sobre() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <h1 className="text-h1 font-bold text-olive-900">Uma cozinha em Belo Horizonte.</h1>
      <p className="text-body-lg text-olive-700">
        A história da Veg.ana fica pronta em breve. Enquanto isso, o cardápio te espera.
      </p>
      <Link
        href="/"
        className="inline-flex w-fit items-center rounded-pill bg-olive-900 px-6 py-3 text-cta font-semibold text-paper-50 transition-colors hover:bg-terra-500"
      >
        Ver cardápio
      </Link>
    </div>
  );
}
