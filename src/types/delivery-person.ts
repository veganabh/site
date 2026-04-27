/**
 * Entregador (motoqueiro). orders.delivery_call_id armazena `id` como
 * text — não há FK pra preservar histórico mesmo após soft-delete.
 *
 * Quando a integração WhatsApp Cloud API chegar, `callDelivery` na store
 * admin substitui o sorteio por uma Server Action que dispara o webhook.
 * O contrato da store (retorna id string) não muda.
 */
export type DeliveryPerson = {
  id: string;
  name: string;
  /** Formato: (31) 9XXXX-XXXX */
  phone: string;
  /** Placa no padrão Mercosul ou antigo */
  plate: string;
  avatarUrl?: string;
  active: boolean;
};
