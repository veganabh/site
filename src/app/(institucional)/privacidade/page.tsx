import type { Metadata } from "next";
import { STORE_LOCATION } from "@/lib/store-location";

export const metadata: Metadata = {
  title: "Privacidade — Veg.ana",
  description:
    "Como a Veg.ana coleta, usa e protege seus dados. Seus direitos pela LGPD e como exercê-los.",
};

const updatedAt = "29 de maio de 2026";

export default function PrivacidadePage() {
  const waLink = `https://wa.me/${STORE_LOCATION.whatsappNumber}?text=Oi!%20Quero%20falar%20sobre%20meus%20dados%20(privacidade).`;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-divider pb-5">
        <h1 className="text-[24px] leading-tight font-bold text-olive-900 md:text-[30px]">
          Política de Privacidade
        </h1>
        <p className="text-body-sm text-olive-700">
          A gente coleta o mínimo pra entregar seu doce e cuidar do atendimento. Aqui está,
          sem letra miúda, o que guardamos e o que você pode fazer com isso.
        </p>
        <p className="text-caption text-olive-700/80">Última atualização: {updatedAt}</p>
      </header>

      <Section title="Quem é responsável">
        <p>
          A Veg.ana é uma confeitaria vegana delivery em Belo Horizonte. Os dados tratados aqui
          são de responsabilidade da Veg.ana. Para qualquer assunto sobre seus dados, fale com a
          gente pelo WhatsApp{" "}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-terra-700 underline underline-offset-2"
          >
            {STORE_LOCATION.whatsappNumber.replace(
              /^55(\d{2})(\d{5})(\d{4})$/,
              "($1) $2-$3",
            )}
          </a>
          .
        </p>
      </Section>

      <Section title="Quais dados a gente coleta">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="font-semibold text-olive-900">Cadastro:</strong> seu nome e número
            de WhatsApp, pra identificar o pedido e te avisar das novidades.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Entrega:</strong> endereço e CEP de
            quem vai receber — sem isso o doce não chega.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Pedidos:</strong> o que você pediu,
            valores e histórico de compras.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Pagamento:</strong> processado pela
            AbacatePay. A gente não guarda número de cartão — isso fica com o provedor de
            pagamento.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Navegação:</strong> como você usa o
            site (páginas vistas, cliques) via PostHog, inclusive gravação de sessão para
            entender e corrigir problemas de uso. Esses dados são pseudonimizados.
          </li>
        </ul>
      </Section>

      <Section title="Por que a gente usa">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Receber, preparar e entregar seu pedido.</li>
          <li>Falar com você sobre o pedido e o atendimento.</li>
          <li>Mandar novidades e promoções — só se você aceitar.</li>
          <li>Entender o que funciona no site pra melhorar a experiência.</li>
          <li>Cumprir obrigações legais e fiscais.</li>
        </ul>
      </Section>

      <Section title="Com quem a gente compartilha">
        <p>A gente não vende seus dados. Compartilhamos só com quem ajuda a entregar o serviço:</p>
        <ul className="ml-4 mt-2 list-disc space-y-1.5">
          <li>
            <strong className="font-semibold text-olive-900">AbacatePay</strong> — para processar
            o pagamento.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Supabase</strong> — para armazenar os
            dados do site com segurança.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">PostHog</strong> — para análise de uso
            do site.
          </li>
          <li>
            <strong className="font-semibold text-olive-900">Entregadores</strong> — recebem só o
            necessário pra levar o pedido até a porta.
          </li>
        </ul>
      </Section>

      <Section title="Seus direitos (LGPD)">
        <p>A Lei Geral de Proteção de Dados garante que você pode, a qualquer momento:</p>
        <ul className="ml-4 mt-2 list-disc space-y-1.5">
          <li>Saber quais dados a gente tem sobre você.</li>
          <li>Corrigir dados errados ou desatualizados.</li>
          <li>Pedir a exclusão dos seus dados, respeitadas as obrigações legais.</li>
          <li>Revogar o consentimento para receber mensagens.</li>
          <li>Pedir a portabilidade dos seus dados.</li>
        </ul>
        <p className="mt-3">
          Para exercer qualquer um desses direitos, é só{" "}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-terra-700 underline underline-offset-2"
          >
            mandar mensagem no WhatsApp
          </a>
          . A gente responde no mesmo canal.
        </p>
      </Section>

      <Section title="Por quanto tempo a gente guarda">
        <p>
          Mantemos seus dados enquanto sua conta existir e pelo prazo necessário para cumprir
          obrigações fiscais e legais. Depois disso, são apagados ou anonimizados.
        </p>
      </Section>

      <Section title="Segurança">
        <p>
          Usamos acesso restrito e regras de proteção em todas as tabelas do banco. Mesmo assim,
          nenhum sistema é 100% imune — por isso seguimos cuidando e atualizando.
        </p>
      </Section>

      <Section title="Mudanças nesta política">
        <p>
          Se algo mudar, a gente atualiza esta página e a data lá em cima. Mudança grande, a gente
          avisa.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[16px] font-bold text-olive-900 md:text-[18px]">{title}</h2>
      <div className="text-body-sm leading-relaxed text-olive-700">{children}</div>
    </section>
  );
}
