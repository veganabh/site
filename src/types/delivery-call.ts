/**
 * Chamada ao entregador — stub de integração com logística local.
 *
 * Pré-migração: simula via setTimeout + motoqueiro fake gerado aleatoriamente.
 * Pós-migração: substitui pelo shape real da API de logística (ex: iFood Courier,
 * Mottu, ou próprio). Interface permanece a mesma para os consumers.
 *
 * Fluxo: admin clica "Chamar entregador" em status PRONTO
 *   → stub cria DeliveryCall com status AGUARDANDO
 *   → setTimeout 2s → status CONFIRMADO + broadcast
 *   → pedido avança para A_CAMINHO automaticamente
 */

export type DeliveryCallStatus = "AGUARDANDO" | "CONFIRMADO" | "EM_ROTA" | "ENTREGUE" | "FALHOU";

export type FakeDeliveryPerson = {
  name: string;
  /** Formato: "(31) 9XXXX-XXXX" */
  phone: string;
  /** Placa do veículo. Ex: "ABC-1D23". */
  plate: string;
  /** Iniciais para o avatar. Ex: "MR" para "Marcos Rocha". */
  avatarInitials: string;
};

export type DeliveryCall = {
  id: string;
  /** ID do pedido que originou esta chamada. */
  orderId: string;
  status: DeliveryCallStatus;
  deliveryPerson: FakeDeliveryPerson;
  /** ISO datetime — quando a chamada foi disparada. */
  requestedAt: string;
  /** ISO datetime — quando o entregador confirmou. */
  confirmedAt?: string;
  /** ISO datetime — quando marcou como entregue. */
  deliveredAt?: string;
};
