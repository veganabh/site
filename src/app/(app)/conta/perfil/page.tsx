import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProfileForm } from "@/components/conta/profile-form";
import { AddressManager } from "@/components/conta/address-manager";

export const metadata: Metadata = {
  title: "Meus dados — Veg.ana",
  description: "Edite seus dados de cadastro e gerencie endereços de entrega.",
};

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          href="/conta"
          className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar pra conta
        </Link>
        <div>
          <h1 className="text-[20px] leading-snug font-bold text-olive-900 md:text-[24px]">
            Meus dados
          </h1>
          <p className="mt-1 text-body-sm text-olive-700">
            Mantém atualizado pra gente não errar o endereço nem o WhatsApp.
          </p>
        </div>
      </header>

      <ProfileForm />
      <AddressManager />
    </div>
  );
}
