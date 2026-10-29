import Link from 'next/link';
import { ChevronRight, Plus, Search, Users } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { listarClientes } from '@/server/services/cadastros';
import { formatarMoeda, formatarTelefone } from '@/domain/formatos';
import { Avatar, Cabecalho, Vazio } from '@/components/ui';

export const metadata = { title: 'Clientes' };
export const dynamic = 'force-dynamic';

/** T13 — Clientes: nome, telefone e total devido. */
export default async function Clientes({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const s = await exigirSessao();
  const { busca } = await searchParams;
  const lista = await listarClientes(s, busca);
  return (
    <>
      <Cabecalho titulo="Clientes" subtitulo={`${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'}`}
        acoes={<Link href="/clientes/novo" className="btn-primario"><Plus className="h-4 w-4" /> Cliente</Link>} />
      <form className="mb-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input type="search" name="busca" defaultValue={busca} className="campo pl-11" placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente" />
        </label>
      </form>
      {lista.length === 0 ? <Vazio icone={<Users className="h-6 w-6" />} titulo="Nenhum cliente encontrado" /> : (
        <div className="card divide-y divide-slate-100">
          {lista.map(c => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center gap-3 p-3 transition hover:bg-slate-50 sm:p-4">
              <Avatar nome={c.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.nome}</p>
                <p className="text-xs text-slate-500">{c.telefone ? formatarTelefone(c.telefone) : 'Sem telefone'}</p>
              </div>
              {c.totalDevido > 0 && (
                <div className="text-right"><p className="text-xs text-slate-500">deve</p><p className={`font-bold ${c.totalAtrasado > 0 ? 'text-rose-600' : ''}`}>{formatarMoeda(c.totalDevido)}</p></div>
              )}
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
