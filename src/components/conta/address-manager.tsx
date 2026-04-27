"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  AddressFormModal,
  AddressTypeChip,
  addressTypeLabel,
} from "@/components/checkout/checkout-steps";
import { formatBRL } from "@/lib/format";
import { useAddressStore } from "@/stores/address-store";
import type { Address } from "@/stores/address-store";
import { removeAddressAction } from "@/server/profile/address-actions";

export function AddressManager() {
  const addresses = useAddressStore((s) => s.addresses);
  const removeAddressLocal = useAddressStore((s) => s.removeAddressLocal);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [toRemoveId, setToRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  function handleAddNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(address: Address) {
    setEditing(address);
    setFormOpen(true);
  }

  function confirmRemove() {
    const id = toRemoveId;
    if (!id) return;
    setRemoveError(null);
    startRemoving(async () => {
      const result = await removeAddressAction(id);
      if (!result.ok) {
        setRemoveError(result.message);
        return;
      }
      removeAddressLocal(id);
      setToRemoveId(null);
    });
  }

  return (
    <section
      aria-labelledby="perfil-enderecos-titulo"
      className="flex flex-col gap-3 rounded-2xl border border-divider bg-paper-50 p-4 md:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="perfil-enderecos-titulo" className="text-h3 font-bold text-olive-900">
            Endereços salvos
          </h2>
          <p className="text-[12px] leading-snug text-olive-700">
            Dá pra salvar mais de um — no checkout você escolhe pra onde vai.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill bg-olive-900 px-3.5 text-[12px] font-semibold text-paper-50 transition-colors hover:bg-olive-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Adicionar
        </button>
      </header>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-divider bg-paper-50 p-6 text-center">
          <MapPin className="h-6 w-6 text-olive-700" aria-hidden="true" />
          <p className="text-body-sm text-olive-700">Nenhum endereço salvo ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Endereços salvos">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-start gap-3 rounded-xl border border-divider bg-paper-50 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <AddressTypeChip type={address.type} />
                  {address.nickname && address.nickname !== addressTypeLabel(address.type) && (
                    <p className="text-[13px] leading-snug font-semibold text-olive-900">
                      {address.nickname}
                    </p>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-olive-700">
                  {address.street}, {address.number}
                  {address.complement ? ` — ${address.complement}` : ""}
                </p>
                <p className="text-[12px] leading-relaxed text-olive-700">
                  {address.neighborhood} · {address.city}/{address.state} · {address.cep}
                </p>
                {address.shippingFee > 0 ? (
                  <p className="mt-1 text-[11px] font-semibold text-terra-700">
                    Taxa de entrega: {formatBRL(address.shippingFee)}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-success">Entrega grátis</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Editar ${address.nickname || addressTypeLabel(address.type)}`}
                  onClick={() => handleEdit(address)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${address.nickname || addressTypeLabel(address.type)}`}
                  onClick={() => setToRemoveId(address.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && <AddressFormModal initialData={editing} onClose={() => setFormOpen(false)} />}

      {toRemoveId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar remoção"
          className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !removing) setToRemoveId(null);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper-50 p-6 shadow-lg">
            <h3 className="text-h3 font-bold text-olive-900">Remover esse endereço?</h3>
            <p className="mt-2 text-body-sm text-olive-700">
              A gente não apaga em outros lugares — só daqui da sua lista.
            </p>
            {removeError ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-terra-500/10 px-3 py-2 text-[12px] font-semibold text-terra-700"
              >
                {removeError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setToRemoveId(null)}
                disabled={removing}
                className="inline-flex h-10 items-center rounded-pill px-4 text-[13px] font-semibold text-olive-700 hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removing}
                className="inline-flex h-10 items-center rounded-pill bg-error px-4 text-[13px] font-semibold text-paper-50 hover:bg-error/90 disabled:cursor-wait disabled:opacity-70"
              >
                {removing ? "Removendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
