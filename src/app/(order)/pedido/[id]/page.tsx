import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { OrderPageClient } from "@/components/features/order-page-client";
import { getOrderById } from "@/server/orders";
import { createSupabaseServerClient } from "@/server/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);
  const label = order ? `Pedido #${order.orderNumber}` : "Pedido";
  return {
    title: `${label} — Veg.ana`,
    description: "Acompanhe o status do seu pedido em tempo real.",
  };
}

/**
 * Defesa em profundidade — RLS já bloqueia row alheia em SELECT, mas mantemos
 * o ownership check explícito para que o servidor responda 404 (não 200 com
 * conteúdo vazio) quando outro usuário tentar enxergar pedido de terceiro.
 *
 * Admin (`is_admin()`) usa `/gestao/pedidos`; aqui é vista do cliente final.
 */
export default async function PedidoPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/pedido/${id}`);
  }

  const order = await getOrderById(id);
  if (!order) notFound();
  if (order.customerId !== user.id) notFound();

  return <OrderPageClient orderId={id} />;
}
