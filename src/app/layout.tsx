import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AddressesStoreHydrator } from "@/components/providers/addresses-store-hydrator";
import { AdminOrdersStoreHydrator } from "@/components/providers/admin-orders-store-hydrator";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CollectionsStoreHydrator } from "@/components/providers/collections-store-hydrator";
import { DeliveryPersonsStoreHydrator } from "@/components/providers/delivery-persons-store-hydrator";
import { GiftKitsStoreHydrator } from "@/components/providers/gift-kits-store-hydrator";
import { MenuStoreHydrator } from "@/components/providers/menu-store-hydrator";
import { RingsStoreHydrator } from "@/components/providers/rings-store-hydrator";
import { listMyAddresses } from "@/server/addresses";
import { listCollections } from "@/server/collections";
import { listActiveDeliveryPersons } from "@/server/delivery-persons";
import { listGiftKitTemplates } from "@/server/gift-kits";
import { listAllOrders } from "@/server/orders";
import { listProducts } from "@/server/products";
import { listAllRings } from "@/server/rings";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veg.ana — doces sem lactose em BH",
  description:
    "Doceria vegana feita à mão em Belo Horizonte. Bolos, bombons e bolo no pote sem lactose e sem ingredientes de origem animal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hidrata stores client. RLS já filtra produtos/coleções/kits inativos para
  // não-admin; delivery_rings tem SELECT público (cliente precisa para frete).
  const [products, rings, collections, kits, orders, deliveryPersons, addresses] =
    await Promise.all([
      listProducts({ onlyActive: false }),
      listAllRings(),
      listCollections({ onlyActive: false }),
      listGiftKitTemplates({ onlyActive: false }),
      listAllOrders(),
      listActiveDeliveryPersons(),
      listMyAddresses(),
    ]);

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <MenuStoreHydrator products={products} />
        <RingsStoreHydrator rings={rings} />
        <CollectionsStoreHydrator collections={collections} />
        <GiftKitsStoreHydrator kits={kits} />
        <AdminOrdersStoreHydrator orders={orders} />
        <DeliveryPersonsStoreHydrator persons={deliveryPersons} />
        <AddressesStoreHydrator addresses={addresses} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
