'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Loader2, MessageCircle } from 'lucide-react';
import { darBaixaAcao } from '@/app/acoes/vendas';
import { toast } from '@/components/Toaster';
import { ChipSituacao } from '@/components/ui';
import { formatarData } from '@/domain/datas';
import { formatarMoeda } from '@/domain/formatos';
import type { ParcelaItem } from '@/server/services/vendas';

/** Parcela com os botões "Dar baixa" e "Cobrar no WhatsApp". */
export function CartaoParcela({ p }: { p: ParcelaItem }) {
  const [paga, setPaga] = useState(p.situacao === 'PAGA');
  const [pendente, iniciar] = useTransition();
  const baixa = () => {
    if (!window.confirm(`Confirmar o pagamento de ${formatarMoeda(p.valor)} de ${p.cliente}?`)) return;
    iniciar(async () => {
      const r = await darBaixaAcao(p.id);
      if (!r.ok) return toast(r.erro, 'erro');
      setPaga(true);
      toast('Pagamento registrado.');
    });
  };
  return (
    <div className={`card p-4 transition ${paga && p.situacao !== 'PAGA' ? 'opacity-70' : ''}`} data-parcela={p.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/clientes/${p.clienteId}`} className="block truncate font-semibold hover:text-marca-700">{p.cliente}</Link>
          <p className="text-xs text-slate-500">Parcela {p.numero}/{p.totalParcelas} · <Link href={`/vendas/${p.vendaId}`} className="hover:text-marca-700">venda nº {p.vendaId}</Link></p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-extrabold">{formatarMoeda(p.valor)}</p>
          {paga ? <span className="chip-verde">Paga</span> : <ChipSituacao situacao={p.situacao} diasAtraso={p.diasAtraso} />}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" />
          {p.dataPagamento ? `Paga em ${formatarData(p.dataPagamento)}` : `Vence ${formatarData(p.dataVencimento)}`}</p>
        {!paga ? (
          <div className="flex gap-2">
            <a href={`/crediario/${p.id}/cobrar`} target="_blank" rel="noopener" className="btn-whatsapp btn-sm" title={p.telefone ? 'Abrir conversa com a mensagem pronta' : 'Cliente sem telefone: você escolhe o contato'}>
              <MessageCircle className="h-4 w-4" /> Cobrar no WhatsApp
            </a>
            <button type="button" className="btn-primario btn-sm" onClick={baixa} disabled={pendente} data-baixa={p.id}>
              {pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Dar baixa
            </button>
          </div>
        ) : p.situacao !== 'PAGA' && <span className="text-sm font-semibold text-emerald-600">Baixa feita</span>}
      </div>
    </div>
  );
}
