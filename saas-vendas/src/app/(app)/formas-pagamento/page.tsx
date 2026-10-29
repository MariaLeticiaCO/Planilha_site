import { CreditCard } from 'lucide-react';
import { exigirDono } from '@/server/sessao';
import { listarFormas } from '@/server/services/cadastros';
import { criarFaixasCreditoAcao } from '@/app/acoes/cadastros';
import { Cabecalho } from '@/components/ui';
import { BotaoAcao } from '@/components/BotaoAcao';
import { Formas } from './Formas';

export const metadata = { title: 'Formas de pagamento' };
export const dynamic = 'force-dynamic';

/** T12 — Formas de pagamento e taxas. */
export default async function FormasPagamento() {
  const s = await exigirDono();
  return (
    <>
      <Cabecalho titulo="Formas de pagamento" subtitulo="Informe as taxas da sua maquininha. O lucro de cada venda já sai descontado."
        acoes={<BotaoAcao acao={criarFaixasCreditoAcao} className="btn-suave btn-sm"><CreditCard className="h-4 w-4" /> Criar faixas de crédito parcelado</BotaoAcao>} />
      <Formas lista={await listarFormas(s)} />
    </>
  );
}
