import type { Metadata } from "next";

import { getStoreSettings } from "@/server/store-settings";
import { getPreorderCapacityByDate } from "@/server/preorders";
import { PreorderCartCheckoutForm } from "@/components/features/preorders/preorder-cart-checkout-form";

export const metadata: Metadata = {
  title: "Finalizar encomenda — Veg.ana",
  description: "Escolha a data de entrega e finalize sua encomenda.",
};

export default async function PreorderFinalizar() {
  const settings = await getStoreSettings();

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
    <div className="mx-auto max-w-lg pt-4 pb-40 md:pb-10">
      <PreorderCartCheckoutForm
        settings={settings.preorder}
        minDate={formatDate(minDate)}
        maxDate={formatDate(maxDate)}
        capacityMap={capacityMap}
      />
    </div>
  );
}
