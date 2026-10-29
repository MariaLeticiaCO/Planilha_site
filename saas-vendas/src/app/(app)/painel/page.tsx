import Link from 'next/link';
import { Plus, ShoppingBag } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { painelVendedor } from '@/server/services/vendas';
import { formatarMoeda } from '@/domain/formatos';
import { Vazio } from '@/components/ui';
import { PainelDono } from './PainelDono';

export const metadata = { title: 'Início' };
export const dynamic = 'force-dynamic';

/** T06 — Dashboard. O Vendedor não vê lucro: vê só as próprias vendas do dia. */
export default async function Painel() {
  const s = await exigirSessao();
  const primeiro = s.nome.split(' ')[0];
  if (s.perfil === 'DONO') return <PainelDono nome={primeiro} />;

  const p = await painelVendedor(s);
  return (
    <>
      <p className="subtitulo">Olá, {primeiro}!</p>
      <h1 className="titulo-pagina">Suas vendas de hoje</h1>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="card-p"><p className="sobretitulo">Vendas</p><p className="mt-2 font-display text-3xl font-extrabold">{p.qtdVendas}</p></div>
        <div className="rounded-2xl bg-gradient-to-br from-marca-600 to-marca-800 p-5 text-white shadow-destaque">
          <p className="sobretitulo text-marca-100">Total vendido</p><p className="mt-2 font-display text-3xl font-extrabold">{formatarMoeda(p.total)}</p>
        </div>
      </div>
      <Link href="/vendas/nova" className="btn-primario btn-lg mt-5 w-full sm:w-auto"><Plus className="h-5 w-5" /> Nova venda</Link>
      <div className="mt-5">
        {p.vendas.length === 0 ? <Vazio icone={<ShoppingBag className="h-6 w-6" />} titulo="Nenhuma venda hoje ainda" texto="Bora vender! Toque em Nova venda." /> : (
          <div className="card divide-y divide-slate-100">
            {p.vendas.map(v => (
              <Link key={v.id} href={`/vendas/${v.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div><p className="font-semibold">{v.cliente ?? `Venda nº ${v.id}`}</p><p className="text-xs text-slate-500">{v.dataVenda.slice(11, 16)} · {v.formaPagamento}</p></div>
                <div className="text-right">
                  <p className={`font-bold ${v.status === 'CANCELADA' ? 'text-slate-400 line-through' : ''}`}>{formatarMoeda(v.total)}</p>
                  {v.status === 'CANCELADA' && <span className="chip-cinza">Cancelada</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
