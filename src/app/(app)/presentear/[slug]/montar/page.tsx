import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findKitBySlug } from "@/lib/mock-gift-kits";
import { KitBuilder } from "@/components/gift/kit-builder";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const kit = findKitBySlug(slug);
  if (!kit) return { title: "Montar kit — Veg.ana" };
  return {
    title: `Montar ${kit.name} — Veg.ana`,
    description: kit.tagline,
  };
}

export default async function KitBuilderPage({ params }: PageProps) {
  const { slug } = await params;
  const kit = findKitBySlug(slug);
  if (!kit) notFound();

  return (
    <Suspense fallback={null}>
      <KitBuilder slug={slug} />
    </Suspense>
  );
}
