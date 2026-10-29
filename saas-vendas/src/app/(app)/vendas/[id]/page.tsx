import Link from 'next/link';
import { Download, X } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { obterVenda } from '@/server/services/vendas';
import { idValido, ou404 } from '@/server/paginas';
import { cancelarVendaAcao } from '@/app/acoes/vendas';
import { formatarData, formatarDataHora } from '@/domain/datas';
import { formatarMoeda } from '@/domain/formatos';
import { Cabecalho, ChipSituacao } from '@/components/ui';
import { BotaoAcao } from '@/components/BotaoAcao';

export const metadata = { title: 'Detalhe da venda' };
export const dynamic = 'force-dynamic';

export default async function DetalheVenda({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const id = idValido((await params).id);
  const v = await ou404(obterVenda(s, id));
  const cancelada = v.status === 'CANCELADA';

  return (
    <>
      <Cabecalho voltar="/vendas/historico" titulo={`Venda nº ${v.id}`} subtitulo={`${formatarDataHora(v.dataVenda)} · por ${v.vendedor}`}
        acoes={cancelada ? <span className="chip-cinza">Cancelada</span> : <span className="chip-verde">Concluída</span>} />

      {cancelada && v.dataCancelamento && (
        <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Cancelada em {formatarDataHora(v.dataCancelamento)}. O estoque foi devolvido e as parcelas em aberto foram canceladas.</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-hidden">
            <h2 className="border-b border-slate-100 px-5 py-3.5 font-bold">Itens</h2>
            <ul className="divide-y divide-slate-100">
              {v.itens.map((i, n) => (
                <li key={n} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{i.quantidade}× {i.produto}</p>
                    <p className="text-xs text-slate-500">{formatarMoeda(i.precoUnitario)} cada{i.custoUnitario != null ? ` · custo ${formatarMoeda(i.custoUnitario)}` : ''}</p>
                  </div>
                  <span className="font-semibold">{formatarMoeda(i.quantidade * i.precoUnitario)}</span>
                </li>
              ))}
            </ul>
          </div>
          {v.parcelas.length > 0 && (
            <div className="card overflow-hidden">
              <h2 className="border-b border-slate-100 px-5 py-3.5 font-bold">Parcelas do crediário</h2>
              <ul className="divide-y divide-slate-100">
                {v.parcelas.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{p.numero}/{p.totalParcelas} · {formatarMoeda(p.valor)}</p>
                      <p className="text-xs text-slate-500">Vence {formatarData(p.dataVencimento)}{p.dataPagamento ? ` · paga em ${formatarData(p.dataPagamento)}` : ''}</p>
                    </div>
                    <ChipSituacao situacao={p.situacao} diasAtraso={p.diasAtraso} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-p">
            <dl className="space-y-2 text-sm">
              {v.cliente && <div className="flex justify-between gap-2"><dt className="text-slate-500">Cliente</dt><dd className="text-right font-semibold"><Link href={`/clientes/${v.clienteId}`} className="text-marca-700">{v.cliente}</Link></dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Pagamento</dt><dd className="font-semibold">{v.formaPagamento}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatarMoeda(v.valorBruto)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Desconto</dt><dd>− {formatarMoeda(v.desconto)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-semibold">Total</dt><dd className="font-display text-lg font-extrabold">{formatarMoeda(v.valorLiquido)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Taxa</dt><dd>− {formatarMoeda(v.valorTaxa)}</dd></div>
              {v.custoTotal != null && <div className="flex justify-between"><dt className="text-slate-500">Custo dos itens</dt><dd>− {formatarMoeda(v.custoTotal)}</dd></div>}
              {v.lucro != null && (
                <div className={`flex justify-between rounded-lg px-3 py-2 font-bold ${v.lucro < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}><dt>Lucro</dt><dd>{formatarMoeda(v.lucro)}</dd></div>
              )}
            </dl>
            {v.observacao && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{v.observacao}</p>}
          </div>
          <div className="space-y-2">
            <a href={v.linkRecibo} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full">Enviar recibo no WhatsApp</a>
            <a href={`/vendas/${v.id}/recibo`} target="_blank" className="btn-secundario w-full"><Download className="h-4 w-4" /> Recibo em PDF</a>
            {s.perfil === 'DONO' && !cancelada && (
              <BotaoAcao acao={cancelarVendaAcao.bind(null, v.id)} className="btn w-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                confirmar={`Cancelar a venda nº ${v.id}? O estoque volta e as parcelas em aberto são canceladas. Isso não pode ser desfeito.`}>
                <X className="h-4 w-4" /> Cancelar venda
              </BotaoAcao>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
