import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";

import { AddressesStoreHydrator } from "@/components/providers/addresses-store-hydrator";
import { AdminOrdersStoreHydrator } from "@/components/providers/admin-orders-store-hydrator";
import { AdminSettingsStoreHydrator } from "@/components/providers/admin-settings-store-hydrator";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CategoriesStoreHydrator } from "@/components/providers/categories-store-hydrator";
import { CollectionsStoreHydrator } from "@/components/providers/collections-store-hydrator";
import { DeliveryPersonsStoreHydrator } from "@/components/providers/delivery-persons-store-hydrator";
import { GiftKitsStoreHydrator } from "@/components/providers/gift-kits-store-hydrator";
import { MenuStoreHydrator } from "@/components/providers/menu-store-hydrator";
import { MetaPixelProvider } from "@/components/providers/meta-pixel-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { RingsStoreHydrator } from "@/components/providers/rings-store-hydrator";
import { listMyAddresses } from "@/server/addresses";
import { listCategories } from "@/server/categories";
import { listCollections } from "@/server/collections";
import { getStoreSettings } from "@/server/store-settings";
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
  applicationName: "Veg.ana",
  // PWA no iOS: permite abrir em tela cheia quando adicionado à home.
  appleWebApp: {
    capable: true,
    title: "Veg.ana",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b3210",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hidrata stores client. RLS já filtra produtos/coleções/kits inativos para
  // não-admin; delivery_rings tem SELECT público (cliente precisa para frete).
  const [
    products,
    rings,
    collections,
    kits,
    orders,
    deliveryPersons,
    addresses,
    categories,
    storeSettings,
  ] = await Promise.all([
    listProducts({ onlyActive: false }),
    listAllRings(),
    listCollections({ onlyActive: false }),
    listGiftKitTemplates({ onlyActive: false }),
    listAllOrders({ excludePreorders: true }),
    listActiveDeliveryPersons(),
    listMyAddresses(),
    listCategories({ onlyActive: false }),
    getStoreSettings(),
  ]);

  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <MenuStoreHydrator products={products} />
        <CategoriesStoreHydrator categories={categories} />
        <AdminSettingsStoreHydrator settings={storeSettings} />
        <RingsStoreHydrator rings={rings} />
        <CollectionsStoreHydrator collections={collections} />
        <GiftKitsStoreHydrator kits={kits} />
        <AdminOrdersStoreHydrator orders={orders} />
        <DeliveryPersonsStoreHydrator persons={deliveryPersons} />
        <AddressesStoreHydrator addresses={addresses} />
        <QueryProvider>
          <AuthProvider>
            <PostHogProvider>
              <MetaPixelProvider>{children}</MetaPixelProvider>
            </PostHogProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster position="bottom-center" richColors closeButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
