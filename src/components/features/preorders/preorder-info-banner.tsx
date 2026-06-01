import { Clock, CalendarDays, BadgeDollarSign } from "lucide-react";
import type { PreorderSettings } from "@/types/store-settings";
import { formatBRL } from "@/lib/format";

type PreorderInfoBannerProps = {
  settings: PreorderSettings;
};

export function PreorderInfoBanner({ settings }: PreorderInfoBannerProps) {
  const minBRL = formatBRL(settings.minValueCents / 100);

  return (
    <div className="rounded-sm border border-terra-500/30 bg-terra-500/5 px-5 py-4">
      <p className="mb-3 text-body-sm font-semibold text-olive-900">Como funciona</p>
      <ul className="flex flex-col gap-2 sm:flex-row sm:gap-6">
        <li className="flex items-start gap-2 text-body-sm text-olive-700">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-terra-500" aria-hidden="true" />
          <span>
            Peça com{" "}
            <strong className="text-olive-900">
              {settings.minLeadDays} a {settings.maxLeadDays} dias
            </strong>{" "}
            de antecedência
          </span>
        </li>
        <li className="flex items-start gap-2 text-body-sm text-olive-700">
          <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-terra-500" aria-hidden="true" />
          <span>
            Valor mínimo de <strong className="text-olive-900">{minBRL}</strong> — pago antecipado
          </span>
        </li>
        <li className="flex items-start gap-2 text-body-sm text-olive-700">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-terra-500" aria-hidden="true" />
          <span>
            Entrega entre{" "}
            <strong className="text-olive-900">
              {settings.hourFrom}h e {settings.hourTo}h
            </strong>
          </span>
        </li>
      </ul>
    </div>
  );
}
