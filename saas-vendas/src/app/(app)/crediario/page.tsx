import Link from 'next/link';
import { PartyPopper, Wallet } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { devedores, listarParcelas, resumoCrediario, type Aba } from '@/server/services/crediario';
import { formatarData } from '@/domain/datas';
import { formatarMoeda } from '@/domain/formatos';
import { PLANOS } from '@/domain/planos';
import { Avatar, Cabecalho } from '@/components/ui';
import { CartaoParcela } from './CartaoParcela';

export const metadata = { title: 'Crediário' };
export const dynamic = 'force-dynamic';

const ABAS: [string, string][] = [['atrasadas', 'Atrasadas'], ['a-vencer', 'A vencer'], ['pagas', 'Pagas'], ['clientes', 'Por cliente']];

/** T14 — Crediário. */
export default async function Crediario({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const s = await exigirSessao();
  const empresa = await obterEmpresa(s.empresaId);
  if (!empresa.temRecursosPro) {
    return (
      <div className="card mx-auto mt-6 max-w-lg p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-100 text-marca-700"><Wallet className="h-7 w-7" /></span>
        <h1 className="mt-4 text-xl font-extrabold">Crediário é do plano Pro</h1>
        <p className="mt-2 text-slate-600">Venda no fiado com parcelas automáticas, saiba quem está atrasado e cobre pelo WhatsApp com a mensagem pronta.</p>
        {s.perfil === 'DONO' && <Link href="/assinatura" className="btn-primario btn-lg mt-6 w-full">Conhecer o Pro — {formatarMoeda(PLANOS[1].preco)}/mês</Link>}
      </div>
    );
  }
  const abaParam = (await searchParams).aba ?? 'a-vencer';
  const aba = ABAS.some(([k]) => k === abaParam) ? abaParam : 'a-vencer';
  const [resumo, parcelas, lista] = await Promise.all([
    resumoCrediario(s),
    aba === 'clientes' ? Promise.resolve(null) : listarParcelas(s, aba as Aba),
    aba === 'clientes' ? devedores(s) : Promise.resolve(null)
  ]);

  return (
    <>
      <Cabecalho titulo="Crediário" subtitulo="O fiado organizado, com cobrança pronta no WhatsApp." />
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-marca-600 to-marca-800 p-5 text-white shadow-destaque md:col-span-1">
          <p className="sobretitulo text-marca-100">Total a receber</p><p className="mt-1 font-display text-3xl font-extrabold">{formatarMoeda(resumo.totalAReceber)}</p>
        </div>
        <div className="card-p border-rose-200 bg-rose-50/70">
          <p className="sobretitulo text-rose-700">Atrasado</p><p className="mt-1 font-display text-xl font-extrabold text-rose-700">{formatarMoeda(resumo.atrasado)}</p>
          <p className="text-xs text-rose-600">{resumo.qtdAtrasadas} {resumo.qtdAtrasadas === 1 ? 'parcela' : 'parcelas'}</p>
        </div>
        <div className="card-p"><p className="sobretitulo">Vence esta semana</p><p className="mt-1 font-display text-xl font-extrabold">{formatarMoeda(resumo.venceEstaSemana)}</p></div>
      </div>

      {/* Abas: Atrasadas · A vencer · Pagas */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <nav className="segmentado" aria-label="Abas do crediário">
          {ABAS.map(([k, n]) => <Link key={k} href={`/crediario?aba=${k}`} className={aba === k ? 'ativo' : ''}>{n}</Link>)}
        </nav>
      </div>

      <div className="mt-4">
        {lista ? (
          <div className="card divide-y divide-slate-100">
            {lista.length === 0 && <p className="flex items-center justify-center gap-2 p-10 text-slate-500"><PartyPopper className="h-5 w-5" />Ninguém devendo.</p>}
            {lista.map(d => (
              <Link key={d.clienteId} href={`/clientes/${d.clienteId}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                <Avatar nome={d.cliente} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.cliente}</p>
                  <p className="text-xs text-slate-500">{d.qtdParcelas} {d.qtdParcelas === 1 ? 'parcela' : 'parcelas'} · próxima {formatarData(d.proximoVencimento)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold">{formatarMoeda(d.totalDevido)}</p>
                  {d.atrasado > 0 && <p className="text-xs font-semibold text-rose-600">{formatarMoeda(d.atrasado)} atrasado</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : parcelas!.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">{aba === 'atrasadas' ? 'Nenhuma parcela atrasada. 🎉' : aba === 'pagas' ? 'Nenhuma parcela paga ainda.' : 'Nenhuma parcela a vencer.'}</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{parcelas!.map(p => <CartaoParcela key={p.id} p={p} />)}</div>
        )}
      </div>
    </>
  );
}
