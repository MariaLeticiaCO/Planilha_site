import Link from 'next/link';
import { MessageCircle, Pencil } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { obterCliente } from '@/server/services/cadastros';
import { listarVendas } from '@/server/services/vendas';
import { parcelasDoCliente } from '@/server/services/crediario';
import { idValido, ou404 } from '@/server/paginas';
import { desativarClienteAcao } from '@/app/acoes/cadastros';
import { formatarData, formatarDataHora } from '@/domain/datas';
import { formatarMoeda, formatarTelefone } from '@/domain/formatos';
import { Avatar, Cabecalho, ChipSituacao } from '@/components/ui';
import { BotaoAcao } from '@/components/BotaoAcao';

export const dynamic = 'force-dynamic';

/** T13 — Detalhe do cliente: histórico de compras e parcelas. */
export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const id = idValido((await params).id);
  const c = await ou404(obterCliente(s, id));
  const [compras, parcelas] = await Promise.all([listarVendas(s, { clienteId: id, pagina: 1 }), parcelasDoCliente(s, id)]);
  const devendo = parcelas.filter(p => p.situacao !== 'PAGA').reduce((t, p) => t + p.valor, 0);
  const comprou = compras.itens.filter(v => v.status === 'CONCLUIDA').reduce((t, v) => t + v.total, 0);

  return (
    <>
      <Cabecalho voltar="/clientes" titulo={<span className="flex items-center gap-3"><Avatar nome={c.nome} tamanho="h-11 w-11 text-sm" />{c.nome}</span>}
        subtitulo={`${c.telefone ? formatarTelefone(c.telefone) : 'Sem telefone'}${c.documento ? ` · ${c.documento}` : ''}`}
        acoes={<Link href={`/clientes/${id}/editar`} className="btn-secundario btn-sm"><Pencil className="h-4 w-4" /> Editar</Link>} />
      {c.observacao && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{c.observacao}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card-p"><p className="sobretitulo">Comprou (últimas)</p><p className="mt-1 font-display text-xl font-extrabold">{formatarMoeda(comprou)}</p></div>
        <div className="card-p"><p className="sobretitulo">Deve no crediário</p><p className={`mt-1 font-display text-xl font-extrabold ${devendo > 0 ? 'text-rose-600' : ''}`}>{formatarMoeda(devendo)}</p></div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-3.5 font-bold">Parcelas</h2>
          <ul className="divide-y divide-slate-100">
            {parcelas.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhuma parcela.</li>}
            {parcelas.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold">{formatarMoeda(p.valor)} <span className="font-normal text-slate-500">· {p.numero}/{p.totalParcelas}</span></p>
                  <p className="text-xs text-slate-500">Vence {formatarData(p.dataVencimento)} · <Link className="text-marca-700" href={`/vendas/${p.vendaId}`}>venda nº {p.vendaId}</Link></p>
                </div>
                <div className="flex items-center gap-2">
                  <ChipSituacao situacao={p.situacao} diasAtraso={p.diasAtraso} />
                  {p.situacao !== 'PAGA' && <a href={`/crediario/${p.id}/cobrar`} target="_blank" rel="noopener" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50" title="Cobrar no WhatsApp"><MessageCircle className="h-5 w-5" /></a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-100 px-5 py-3.5 font-bold">Histórico de compras</h2>
          <ul className="divide-y divide-slate-100">
            {compras.itens.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhuma compra registrada.</li>}
            {compras.itens.map(v => (
              <li key={v.id}>
                <Link href={`/vendas/${v.id}`} className="flex items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-slate-50">
                  <div><p className="font-semibold">Venda nº {v.id}</p><p className="text-xs text-slate-500">{formatarDataHora(v.dataVenda)} · {v.formaPagamento}</p></div>
                  <span className={`font-bold ${v.status === 'CANCELADA' ? 'text-slate-400 line-through' : ''}`}>{formatarMoeda(v.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {devendo === 0 && (
        <div className="mt-4">
          <BotaoAcao acao={desativarClienteAcao.bind(null, id)} className="btn-fantasma text-rose-600" confirmar={`Remover ${c.nome} da lista de clientes? O histórico de vendas continua.`}>Remover cliente da lista</BotaoAcao>
        </div>
      )}
    </>
  );
}
