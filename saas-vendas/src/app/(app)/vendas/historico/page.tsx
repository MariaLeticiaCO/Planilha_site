import Link from 'next/link';
import { ChevronLeft, ChevronRight, Filter, Plus, Receipt } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { listarVendas } from '@/server/services/vendas';
import { listarFormas } from '@/server/services/cadastros';
import { formatarDataHora, hoje, somarDias } from '@/domain/datas';
import { formatarMoeda } from '@/domain/formatos';
import { Cabecalho, Vazio } from '@/components/ui';
import { LinhaClicavel } from '@/components/LinhaClicavel';

export const metadata = { title: 'Histórico de vendas' };
export const dynamic = 'force-dynamic';

type Busca = { inicio?: string; fim?: string; formaPagamentoId?: string; status?: string; pagina?: string };
const data = (v: string | undefined, padrao: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : padrao);

/** T08 — Histórico de vendas. */
export default async function Historico({ searchParams }: { searchParams: Promise<Busca> }) {
  const s = await exigirSessao();
  const b = await searchParams;
  const filtro = {
    inicio: data(b.inicio, somarDias(hoje(), -30)), fim: data(b.fim, hoje()),
    formaPagamentoId: Number(b.formaPagamentoId) || null,
    status: b.status === 'CONCLUIDA' || b.status === 'CANCELADA' ? (b.status as 'CONCLUIDA' | 'CANCELADA') : null,
    pagina: Number(b.pagina) || 1
  };
  const [r, formas] = await Promise.all([listarVendas(s, filtro), listarFormas(s)]);
  const dono = s.perfil === 'DONO';
  const url = (pagina: number) => `?${new URLSearchParams({ inicio: filtro.inicio, fim: filtro.fim, formaPagamentoId: String(filtro.formaPagamentoId ?? ''), status: filtro.status ?? '', pagina: String(pagina) })}`;

  return (
    <>
      <Cabecalho titulo="Vendas" subtitulo={`${r.totalItens} ${r.totalItens === 1 ? 'venda encontrada' : 'vendas encontradas'}${dono ? '' : ' (só as suas)'}`}
        acoes={<Link href="/vendas/nova" className="btn-primario"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova venda</span></Link>} />

      <form className="card-p grid grid-cols-2 gap-3 md:grid-cols-5 md:items-end">
        <div><label className="rotulo" htmlFor="inicio">De</label><input id="inicio" name="inicio" type="date" defaultValue={filtro.inicio} className="campo" /></div>
        <div><label className="rotulo" htmlFor="fim">Até</label><input id="fim" name="fim" type="date" defaultValue={filtro.fim} className="campo" /></div>
        <div>
          <label className="rotulo" htmlFor="formaPagamentoId">Pagamento</label>
          <select id="formaPagamentoId" name="formaPagamentoId" defaultValue={filtro.formaPagamentoId ?? ''} className="campo">
            <option value="">Todas</option>
            {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filtro.status ?? ''} className="campo">
            <option value="">Todos</option><option value="CONCLUIDA">Concluídas</option><option value="CANCELADA">Canceladas</option>
          </select>
        </div>
        <button className="btn-suave col-span-2 md:col-span-1"><Filter className="h-4 w-4" /> Filtrar</button>
      </form>

      <div className="mt-4">
        {r.itens.length === 0 ? <Vazio icone={<Receipt className="h-6 w-6" />} titulo="Nenhuma venda nesse filtro" /> : (
          <>
            {/* Celular: cards */}
            <div className="card divide-y divide-slate-100 md:hidden">
              {r.itens.map(v => (
                <Link key={v.id} href={`/vendas/${v.id}`} className="flex items-center justify-between gap-3 p-4 active:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{v.cliente ?? `Venda nº ${v.id}`}</p>
                    <p className="text-xs text-slate-500">{formatarDataHora(v.dataVenda)} · {v.formaPagamento}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-bold ${v.status === 'CANCELADA' ? 'text-slate-400 line-through' : ''}`}>{formatarMoeda(v.total)}</p>
                    {v.status === 'CANCELADA' ? <span className="chip-cinza">Cancelada</span> : v.lucro != null && <p className="text-xs font-semibold text-emerald-600">lucro {formatarMoeda(v.lucro)}</p>}
                  </div>
                </Link>
              ))}
            </div>
            {/* Computador: tabela */}
            <div className="card hidden overflow-hidden md:block">
              <table className="tabela">
                <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Pagamento</th>{dono && <th>Vendedor</th>}<th className="text-right">Total</th>{dono && <th className="text-right">Lucro</th>}<th>Status</th></tr></thead>
                <tbody>
                  {r.itens.map(v => (
                    <LinhaClicavel key={v.id} href={`/vendas/${v.id}`}>
                      <td className="text-slate-500">{v.id}</td>
                      <td>{formatarDataHora(v.dataVenda)}</td>
                      <td>{v.cliente ?? '—'}</td>
                      <td>{v.formaPagamento}</td>
                      {dono && <td className="text-slate-500">{v.vendedor}</td>}
                      <td className="text-right font-semibold">{formatarMoeda(v.total)}</td>
                      {dono && <td className={`text-right font-semibold ${(v.lucro ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatarMoeda(v.lucro)}</td>}
                      <td>{v.status === 'CANCELADA' ? <span className="chip-cinza">Cancelada</span> : <span className="chip-verde">Concluída</span>}</td>
                    </LinhaClicavel>
                  ))}
                </tbody>
              </table>
            </div>
            {r.totalPaginas > 1 && (
              <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
                {r.pagina > 1 ? <Link href={url(r.pagina - 1)} className="btn-secundario btn-sm"><ChevronLeft className="h-4 w-4" />Anterior</Link> : <span />}
                <span className="text-slate-500">Página {r.pagina} de {r.totalPaginas}</span>
                {r.pagina < r.totalPaginas ? <Link href={url(r.pagina + 1)} className="btn-secundario btn-sm">Próxima<ChevronRight className="h-4 w-4" /></Link> : <span />}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
