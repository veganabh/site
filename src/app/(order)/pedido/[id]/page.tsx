import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrderPageClient } from "@/components/features/order-page-client";
import { getOrderById } from "@/lib/mock-orders";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pedido #${id} — Veg.ana`,
    description: "Acompanhe o status do seu pedido em tempo real.",
  };
}

export default async function PedidoPage({ params }: PageProps) {
  const { id } = await params;

  // Busca o pedido nos mocks (pre-migração Supabase)
  const order = getOrderById(id);
  if (!order) notFound();

  // A verificação de sessão + proteção de rota ocorre no Client Component,
  // pois pré-migração a sessão vive em Zustand (client-side).
  // Pós-migração: mover guarda para middleware + cookies de sessão.

  return <OrderPageClient orderId={id} />;
}
