import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStoreSettings } from "@/server/store-settings";
import { listProducts } from "@/server/products";
import { PreorderCheckoutForm } from "@/components/features/preorders/preorder-checkout-form";
import { getPreorderCapacityByDate } from "@/server/preorders";

export const metadata: Metadata = {
  title: "Finalizar encomenda — Veg.ana",
  description: "Confirme os detalhes da sua encomenda e finalize o pagamento.",
};

type CheckoutProps = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function PreorderCheckoutPage({ searchParams }: CheckoutProps) {
  const { productId } = await searchParams;

  if (!productId) {
    redirect("/encomendas");
  }

  const [settings, allProducts] = await Promise.all([
    getStoreSettings(),
    listProducts({ onlyActive: true }),
  ]);

  const product = allProducts.find((p) => p.id === productId && p.availableForPreorder);

  if (!product) {
    redirect("/encomendas");
  }

  // Calcula o range de datas válidas para o date-picker
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + settings.preorder.minLeadDays);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + settings.preorder.maxLeadDays);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Busca capacidade por data no range
  const capacityMap = await getPreorderCapacityByDate(formatDate(minDate), formatDate(maxDate));

  return (
    <div className="mx-auto max-w-lg">
      <PreorderCheckoutForm
        product={product}
        settings={settings.preorder}
        minDate={formatDate(minDate)}
        maxDate={formatDate(maxDate)}
        capacityMap={capacityMap}
      />
    </div>
  );
}
