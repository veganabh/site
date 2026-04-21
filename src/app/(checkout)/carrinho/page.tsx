import type { Metadata } from "next";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";

export const metadata: Metadata = {
  title: "Carrinho — Veg.ana",
  description: "Finalize seu pedido na Veg.ana.",
};

export default function CarrinhoPage() {
  return <CheckoutSteps />;
}
