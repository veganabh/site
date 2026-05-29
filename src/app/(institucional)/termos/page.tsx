import type { Metadata } from "next";
import { STORE_LOCATION } from "@/lib/store-location";

export const metadata: Metadata = {
  title: "Termos de uso — Veg.ana",
  description:
    "As regras simples de quem pede na Veg.ana: pedidos, pagamento, entrega, troca e produtos.",
};

const updatedAt = "29 de maio de 2026";

export default function TermosPage() {
  const waLink = `https://wa.me/${STORE_LOCATION.whatsappNumber}`;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-divider pb-5">
        <h1 className="text-h2 leading-tight font-bold text-olive-900 md:text-h2">Termos de uso</h1>
        <p className="text-body-sm text-olive-700">
          As regras de quem pede com a gente, em português de gente. Ao fazer um pedido, você
          concorda com o que está aqui.
        </p>
        <p className="text-caption text-olive-700/80">Última atualização: {updatedAt}</p>
      </header>

      <Section title="Sobre a Veg.ana">
        <p>
          A Veg.ana é uma confeitaria vegana delivery em {STORE_LOCATION.city}. Todos os doces são
          100% vegetais — sem leite, ovo ou qualquer ingrediente de origem animal — e feitos à mão.
        </p>
      </Section>

      <Section title="Pedidos e pagamento">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Os preços e a disponibilidade dos produtos aparecem no cardápio do site.</li>
          <li>
            O pedido é confirmado depois da aprovação do pagamento, processado pela AbacatePay (PIX
            ou cartão).
          </li>
          <li>
            Se algum item ficar indisponível depois do pedido, a gente avisa pelo WhatsApp e resolve
            com você.
          </li>
        </ul>
      </Section>

      <Section title="Entrega">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Entregamos numa área definida de {STORE_LOCATION.city}. O site confirma se o seu CEP é
            atendido antes de fechar o pedido.
          </li>
          <li>O valor e o prazo do frete aparecem no carrinho, conforme a região.</li>
          <li>
            O prazo é uma estimativa — doce feito à mão pede um respiro. Se atrasar, a gente avisa.
          </li>
        </ul>
      </Section>

      <Section title="Cancelamento e troca">
        <p>
          Por serem alimentos perecíveis feitos sob demanda, pedidos já em produção não podem ser
          cancelados. Se algo chegar errado ou com problema, fala com a gente pelo{" "}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-terra-700 underline underline-offset-2"
          >
            WhatsApp
          </a>{" "}
          no mesmo dia que a gente resolve — troca ou reembolso, o que fizer mais sentido.
        </p>
      </Section>

      <Section title="Sobre os produtos">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Todos os doces são veganos, sem lactose e sem ingredientes de origem animal.</li>
          <li>
            São produzidos numa cozinha que também manipula glúten, oleaginosas e soja. Tem alergia
            ou restrição? Pergunta antes pelo WhatsApp.
          </li>
          <li>As fotos são ilustrativas — cada doce feito à mão tem seu charme próprio.</li>
        </ul>
      </Section>

      <Section title="Conteúdo do site">
        <p>
          O nome Veg.ana, as fotos, os textos e a identidade visual são nossos. Usar sem permissão,
          não rola.
        </p>
      </Section>

      <Section title="Falar com a gente">
        <p>
          Dúvida sobre estes termos? Chama no{" "}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-terra-700 underline underline-offset-2"
          >
            WhatsApp
          </a>{" "}
          ou veja a página de{" "}
          <a href="/contato" className="font-semibold text-terra-700 underline underline-offset-2">
            contato
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-body font-bold text-olive-900 md:text-body-lg">{title}</h2>
      <div className="text-body-sm leading-relaxed text-olive-700">{children}</div>
    </section>
  );
}
