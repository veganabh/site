"use client";

import type { AnchorHTMLAttributes } from "react";

import { captureEvent } from "@/lib/analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Link de WhatsApp que dispara `contact_whatsapp` (→ Contact no Meta Pixel) ao
 * clicar. Usar nos pontos PÚBLICOS de contato do cliente (footer, /contato) —
 * não nos links admin/mãe→cliente, que não são lead.
 *
 * `target="_blank"` + `rel` seguros por padrão; sobrescrevíveis via props.
 */
export function WhatsAppLeadLink({ children, onClick, ...rest }: Props) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      onClick={(e) => {
        captureEvent("contact_whatsapp");
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
