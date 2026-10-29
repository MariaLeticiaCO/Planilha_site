'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, Copy, CreditCard, Crown, Loader2, QrCode } from 'lucide-react';
import { checkoutAcao, simularPagamentoAcao } from '@/app/acoes/assinatura';
import { mascaraDocumento } from '@/components/Formulario';
import { toast } from '@/components/Toaster';
import { formatarData } from '@/domain/datas';
import { formatarMoeda } from '@/domain/formatos';
import type { OpcaoPlano, PlanoInfo } from '@/domain/planos';
import type { Cobranca, PagamentoHistorico } from '@/server/infra/asaas';

interface Status { plano: string; status: string; ativa: boolean; diasTrial: number; fimTrial: string; fimAssinatura: string | null }
const NOME_PLANO: Record<string, string> = { TESTE: 'Teste grátis', BASICO: 'Básico', PRO: 'Pro' };

export function Assinatura({ planos, pagamentos, simulado, status }: { planos: PlanoInfo[]; pagamentos: PagamentoHistorico[]; simulado: boolean; status: Status }) {
  const [documento, setDocumento] = useState('');
  const [cobranca, setCobranca] = useState<(Cobranca & { plano: PlanoInfo }) | null>(null);
  const [pendente, iniciar] = useTransition();
  const [clicado, setClicado] = useState('');
  const router = useRouter();

  const assinar = (plano: PlanoInfo, forma: 'PIX' | 'CARTAO') => {
    setClicado(plano.opcao + forma);
    iniciar(async () => {
      const r = await checkoutAcao(plano.opcao, forma, documento || null);
      if (!r.ok) return toast(r.erro, 'erro');
      if (forma === 'CARTAO' && r.dados!.linkPagamento) { window.location.href = r.dados!.linkPagamento; return; }
      setCobranca({ ...r.dados!, plano });
      window.scrollTo(0, 0);
    });
  };
  const simular = (opcao: OpcaoPlano) => iniciar(async () => {
    const r = await simularPagamentoAcao(opcao);
    if (!r.ok) return toast(r.erro, 'erro');
    toast('Pagamento simulado: plano ativo.');
    setCobranca(null);
    router.refresh();
  });

  if (cobranca) {
    return (
      <div className="mx-auto max-w-md">
        <button onClick={() => setCobranca(null)} className="btn-fantasma -ml-3 mb-2"><ChevronLeft className="h-4 w-4" /> Voltar aos planos</button>
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-500">{cobranca.plano.nome}</p>
          <p className="font-display text-3xl font-extrabold">{formatarMoeda(cobranca.plano.preco)}</p>
          <p className="mt-5 font-semibold">Pague com Pix</p>
          {cobranca.pixQrCodeBase64
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`data:image/png;base64,${cobranca.pixQrCodeBase64}`} alt="QR Code Pix" className="mx-auto mt-3 h-56 w-56" />
            : <div className="mx-auto mt-3 flex h-56 w-56 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><QrCode className="h-16 w-16" /></div>}
          {cobranca.pixCopiaECola && (
            <div className="mt-4 flex gap-2">
              <input readOnly value={cobranca.pixCopiaECola} className="campo text-xs" aria-label="Pix copia e cola" />
              <button type="button" className="btn-suave shrink-0" onClick={() => navigator.clipboard.writeText(cobranca.pixCopiaECola!).then(() => toast('Código copiado!'))}><Copy className="h-4 w-4" />Copiar</button>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-500">Assim que o pagamento for confirmado, seu plano é liberado automaticamente.</p>
          {cobranca.linkPagamento && <a href={cobranca.linkPagamento} target="_blank" rel="noopener noreferrer" className="btn-secundario mt-4 w-full">Abrir fatura</a>}
          {simulado && <button className="btn-primario mt-4 w-full" disabled={pendente} onClick={() => simular(cobranca.plano.opcao)}>{pendente && <Loader2 className="h-4 w-4 animate-spin" />}Simular pagamento confirmado (desenvolvimento)</button>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Plano atual */}
      <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-destaque ${status.ativa ? 'bg-gradient-to-br from-marca-600 to-marca-900' : 'bg-gradient-to-br from-rose-500 to-rose-700'}`}>
        <Crown className="absolute -right-4 -top-4 h-32 w-32 text-white/10" />
        <p className="text-sm font-semibold text-white/80">Plano atual</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="font-display text-3xl font-extrabold" id="plano-atual">{NOME_PLANO[status.plano]}</p>
          <span className="chip bg-white/20 text-white">{status.ativa ? 'Ativo' : 'Vencido'}</span>
        </div>
        <p className="mt-1 text-sm text-white/90">
          {status.plano === 'TESTE'
            ? status.ativa ? `Faltam ${status.diasTrial} ${status.diasTrial === 1 ? 'dia' : 'dias'} de teste (até ${formatarData(status.fimTrial)}).` : `O teste acabou em ${formatarData(status.fimTrial)}.`
            : status.fimAssinatura ? `${status.status === 'CANCELADA' ? 'Cancelada; vale' : 'Válida'} até ${formatarData(status.fimAssinatura)}.` : 'Pagamento único — sem mensalidade.'}
        </p>
      </div>

      {simulado && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <b>Modo de desenvolvimento:</b> o Asaas não está configurado (ASAAS_API_KEY). As cobranças são simuladas e você confirma o pagamento na tela seguinte.
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold">Escolha seu plano</h2>
        {!simulado && (
          <label className="w-full sm:w-72"><span className="rotulo text-xs">CPF ou CNPJ (para emitir a cobrança)</span>
            <input className="campo" inputMode="numeric" value={documento} onChange={e => setDocumento(mascaraDocumento(e.target.value))} /></label>
        )}
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {planos.map(p => {
          const destaque = p.opcao === 'PRO_ANUAL';
          return (
            <div key={p.opcao} className={`flex flex-col rounded-2xl p-5 ${destaque ? 'bg-white shadow-destaque ring-2 ring-marca-600' : 'card'}`} data-plano={p.opcao}>
              <div className="flex items-center justify-between"><h3 className="font-bold">{p.nome}</h3>{destaque && <span className="chip-marca">Melhor preço</span>}</div>
              <p className="mt-2"><span className="font-display text-3xl font-extrabold">{formatarMoeda(p.preco)}</span> <span className="text-sm text-slate-500">{p.periodicidade}</span></p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600">{p.inclui.map(i => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{i}</li>)}</ul>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="btn-primario" disabled={pendente} onClick={() => assinar(p, 'PIX')}>{pendente && clicado === p.opcao + 'PIX' ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Pix</button>
                <button className="btn-secundario" disabled={pendente} onClick={() => assinar(p, 'CARTAO')}>{pendente && clicado === p.opcao + 'CARTAO' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Cartão</button>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-lg font-bold">Histórico de pagamentos</h2>
      <div className="card mt-3 divide-y divide-slate-100">
        {pagamentos.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Nenhum pagamento ainda.</p>}
        {pagamentos.map(pg => (
          <div key={pg.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div><p className="font-semibold">{pg.descricao}</p><p className="text-xs text-slate-500">{formatarData(pg.data)}</p></div>
            <div className="text-right">
              <p className="font-bold">{formatarMoeda(pg.valor)}</p>
              {pg.status === 'Aguardando pagamento' && pg.linkPagamento ? <a href={pg.linkPagamento} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-marca-700">Pagar</a>
                : <span className={pg.status === 'Pago' ? 'chip-verde' : 'chip-cinza'}>{pg.status}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
