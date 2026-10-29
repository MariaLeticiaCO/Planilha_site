import Link from 'next/link';
import { ImageIcon, Package, Pencil, Plus, Search } from 'lucide-react';
import { exigirDono } from '@/server/sessao';
import { listarCategorias, listarProdutos } from '@/server/services/cadastros';
import { alterarAtivoProdutoAcao } from '@/app/acoes/cadastros';
import { formatarMoeda } from '@/domain/formatos';
import { Cabecalho, ChipMargem, Vazio } from '@/components/ui';
import { BotaoAcao } from '@/components/BotaoAcao';
import { FiltroAuto } from '@/components/FiltroAuto';

export const metadata = { title: 'Produtos' };
export const dynamic = 'force-dynamic';

/** T09 — Produtos (lista). */
export default async function Produtos({ searchParams }: { searchParams: Promise<{ busca?: string; categoriaId?: string; status?: string }> }) {
  const s = await exigirDono();
  const f = await searchParams;
  const filtro = { busca: f.busca, categoriaId: Number(f.categoriaId) || null, status: f.status ?? 'ativos' };
  const [produtos, categorias] = await Promise.all([listarProdutos(s, filtro), listarCategorias(s, true)]);

  return (
    <>
      <Cabecalho titulo="Produtos" subtitulo={`${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`}
        acoes={<Link href="/produtos/novo" className="btn-primario"><Plus className="h-4 w-4" /> Produto</Link>} />

      <FiltroAuto className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input type="search" name="busca" defaultValue={filtro.busca} className="campo pl-11" placeholder="Buscar por nome ou código" aria-label="Buscar produto" />
        </label>
        <div className="flex gap-2">
          <select name="categoriaId" defaultValue={filtro.categoriaId ?? ''} className="campo sm:w-48" data-auto aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select name="status" defaultValue={filtro.status} className="campo sm:w-40" data-auto aria-label="Status">
            <option value="ativos">Ativos</option><option value="estoque-baixo">Estoque baixo</option><option value="inativos">Inativos</option><option value="todos">Todos</option>
          </select>
        </div>
      </FiltroAuto>

      {produtos.length === 0 ? (
        <Vazio icone={<Package className="h-6 w-6" />} titulo="Nenhum produto por aqui" texto="Cadastre o que você vende com custo e preço para ver a margem e o lucro."
          acao={<Link href="/produtos/novo" className="btn-primario"><Plus className="h-4 w-4" /> Cadastrar produto</Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {produtos.map(p => {
            const baixo = p.ativo && p.estoque <= p.estoqueMinimo;
            return (
              <div key={p.id} className={`card flex gap-3 p-3 transition hover:shadow-md ${p.ativo ? '' : 'opacity-60'}`}>
                <Link href={`/produtos/${p.id}/editar`} className="shrink-0">
                  {p.fotoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.fotoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" loading="lazy" />
                    : <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-marca-50 to-marca-100 text-marca-300"><ImageIcon className="h-8 w-8" /></span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/produtos/${p.id}/editar`} className="block truncate font-semibold hover:text-marca-700">{p.nome}</Link>
                  <p className="truncate text-xs text-slate-500">{p.categoria ?? 'Sem categoria'}{p.codigo ? ` · ${p.codigo}` : ''}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-display font-bold">{formatarMoeda(p.precoVenda)}</span>
                    <ChipMargem margem={p.margem} />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-xs ${baixo ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>{baixo ? '⚠ ' : ''}Estoque: {p.estoque}</span>
                    <span className="flex items-center">
                      <Link href={`/produtos/${p.id}/editar`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Editar"><Pencil className="h-4 w-4" /></Link>
                      <BotaoAcao acao={alterarAtivoProdutoAcao.bind(null, p.id, !p.ativo)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                        {p.ativo ? 'Desativar' : 'Reativar'}
                      </BotaoAcao>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
