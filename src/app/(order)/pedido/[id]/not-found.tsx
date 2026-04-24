import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-serif text-h2 text-olive-900 italic">Esse pedido não existe.</h1>
      <p className="mt-3 text-body-sm text-olive-700">
        Confere o link ou fala com a gente pelo WhatsApp.
      </p>
      <Link
        href="/conta"
        className="mt-8 inline-flex rounded-pill bg-olive-900 px-6 py-2.5 text-[13px] font-semibold text-paper-50 transition hover:bg-olive-700"
      >
        Minha conta
      </Link>
    </main>
  );
}
