'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, CalendarRange, PackageOpen, Plus, Receipt, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatarMoeda, formatarNumero } from '@/domain/formatos';
import { hoje, somarDias } from '@/domain/datas';
import type { DadosPainel } from '@/server/services/painel';

// Paleta validada (scripts/validate_palette.js): linha = marca + aqua; pizza = ordem categórica fixa.
const COR_FATURAMENTO = '#6d28d9';
const COR_LUCRO = '#1baf7a';
const CORES_FORMAS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#008300', '#e34948'];
const PERIODOS = [['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']] as const;

const curto = (v: number) => (Math.abs(v) >= 1000 ? `R$ ${formatarNumero(v / 1000, 1)} mil` : formatarMoeda(v));

export function PainelDono({ nome }: { nome: string }) {
  const [periodo, setPeriodo] = useState<string>('hoje');
  const [intervalo, setIntervalo] = useState({ inicio: somarDias(hoje(), -6), fim: hoje() });
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (p: string, ini?: string, fim?: string) => {
    setCarregando(true);
    const q = new URLSearchParams({ periodo: p, ...(ini && fim ? { inicio: ini, fim } : {}) });
    try {
      const r = await fetch(`/painel/dados?${q}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setDados(await r.json());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { if (periodo !== 'personalizado') carregar(periodo); }, [periodo, carregar]);

  const r = dados?.resumo;
  const margem = r && r.faturamento > 0 ? (r.lucro / r.faturamento) * 100 : 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="subtitulo">Olá, {nome}!</p>
          <h1 className="titulo-pagina">{dados?.periodoTexto ?? 'Seu lucro'}</h1>
        </div>
        <Link href="/vendas/nova" className="btn-primario hidden sm:inline-flex"><Plus className="h-4 w-4" /> Nova venda</Link>
      </div>

      {/* Filtro: Hoje · Semana · Mês · Ano e intervalo personalizado */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="segmentado" role="tablist" aria-label="Período">
            {PERIODOS.map(([k, n]) => <button key={k} role="tab" aria-selected={periodo === k} className={periodo === k ? 'ativo' : ''} onClick={() => setPeriodo(k)}>{n}</button>)}
            <button role="tab" aria-selected={periodo === 'personalizado'} className={periodo === 'personalizado' ? 'ativo' : ''} onClick={() => setPeriodo('personalizado')}>
              <CalendarRange className="-mt-0.5 mr-1 inline h-4 w-4" />Período
            </button>
          </div>
        </div>
        {periodo === 'personalizado' && (
          <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); carregar('personalizado', intervalo.inicio, intervalo.fim); }}>
            <input type="date" aria-label="De" className="campo w-auto py-2" value={intervalo.inicio} max={hoje()} onChange={e => setIntervalo(i => ({ ...i, inicio: e.target.value }))} />
            <span className="text-sm text-slate-500">até</span>
            <input type="date" aria-label="Até" className="campo w-auto py-2" value={intervalo.fim} max={hoje()} onChange={e => setIntervalo(i => ({ ...i, fim: e.target.value }))} />
            <button className="btn-suave">Aplicar</button>
          </form>
        )}
      </div>

      {/* 4 cards */}
      <div className={`mt-5 grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 lg:gap-4 ${carregando && dados ? 'opacity-60' : ''}`}>
        <div className="relative col-span-2 overflow-hidden rounded-2xl bg-gradient-to-br from-marca-600 via-marca-700 to-marca-900 p-5 text-white shadow-destaque lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-marca-100"><TrendingUp className="h-4 w-4" />Lucro líquido</p>
          <p className="mt-2 font-display text-3xl font-extrabold lg:text-[1.7rem] xl:text-3xl" data-card="lucro">{r ? formatarMoeda(r.lucro) : <span className="inline-block h-8 w-36 animate-pulse rounded-lg bg-white/20" />}</p>
          <p className="mt-1 text-xs text-marca-100">{r ? (r.faturamento > 0 ? `${formatarNumero(margem, 1)}% do faturamento · custo ${formatarMoeda(r.custo)}` : 'Nenhuma venda no período') : ' '}</p>
        </div>
        <Cartao icone={<Banknote className="h-4 w-4" />} titulo="Faturamento" valor={r && formatarMoeda(r.faturamento)} rodape={r && `${r.qtdVendas} ${r.qtdVendas === 1 ? 'venda' : 'vendas'}`} classe="lg:col-start-1 lg:row-start-1" chave="faturamento" />
        <Cartao icone={<Receipt className="h-4 w-4" />} titulo="Ticket médio" valor={r && formatarMoeda(r.ticketMedio)} rodape={r && `Taxas: ${formatarMoeda(r.taxas)}`} chave="ticket" />
        <Link href="/crediario" className="col-span-2 lg:col-span-1">
          <Cartao icone={<Wallet className="h-4 w-4" />} titulo="A receber no crediário" valor={r && formatarMoeda(r.aReceber)} chave="receber"
            rodape={r && (r.atrasado > 0 ? <span className="font-semibold text-rose-600">{formatarMoeda(r.atrasado)} atrasado</span> : <span className="font-semibold text-emerald-600">Nada atrasado 🎉</span>)} />
        </Link>
      </div>

      {dados && dados.estoqueBaixo.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Estoque abaixo do mínimo</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {dados.estoqueBaixo.map(p => <li key={p.id} className={p.estoque <= 0 ? 'chip-vermelho' : 'chip-amarelo'}>{p.nome}: {p.estoque}</li>)}
            </ul>
          </div>
          <Link href="/produtos?status=estoque-baixo" className="text-sm font-semibold text-amber-800 underline">Ver</Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card-p lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">Faturamento e lucro</h2>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COR_FATURAMENTO }} />Faturamento</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COR_LUCRO }} />Lucro</span>
            </div>
          </div>
          <div className="-ml-3 mt-3 h-[270px]">
            {dados ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dados.serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COR_FATURAMENTO} stopOpacity={0.22} /><stop offset="100%" stopColor={COR_FATURAMENTO} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gLuc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COR_LUCRO} stopOpacity={0.18} /><stop offset="100%" stopColor={COR_LUCRO} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef0f4" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={curto} width={78} />
                  <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} content={<DicaSerie />} />
                  <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke={COR_FATURAMENTO} strokeWidth={2} fill="url(#gFat)" animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="lucro" name="Lucro" stroke={COR_LUCRO} strokeWidth={2} fill="url(#gLuc)" animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="skeleton ml-3 h-full" />}
          </div>
        </div>

        <div className="card-p">
          <h2 className="font-bold">Formas de pagamento</h2>
          {dados && dados.formas.length > 0 ? (
            <>
              <div className="relative mx-auto mt-2 h-[190px] max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dados.formas} dataKey="total" nameKey="nome" innerRadius="66%" outerRadius="100%" paddingAngle={2} stroke="#fff" strokeWidth={2} animationDuration={500}>
                      {dados.formas.map((f, i) => <Cell key={f.nome} fill={CORES_FORMAS[i % CORES_FORMAS.length]} />)}
                    </Pie>
                    <Tooltip content={<DicaForma />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-500">Total</span>
                  <span className="font-display text-lg font-extrabold">{curto(dados.resumo.faturamento)}</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {dados.formas.map((f, i) => (
                  <li key={f.nome} className="flex items-center gap-2">
                    <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CORES_FORMAS[i % CORES_FORMAS.length] }} />
                    <span className="flex-1 truncate text-slate-600">{f.nome}</span>
                    <span className="font-semibold">{formatarMoeda(f.total)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : dados ? <p className="py-16 text-center text-sm text-slate-500">Sem vendas no período</p> : <div className="skeleton mt-3 h-[220px]" />}
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Taxas pagas no período: <b className="text-slate-900" id="total-taxas">{dados ? formatarMoeda(dados.totalTaxas) : '—'}</b></p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Ranking titulo="Top 5 mais vendidos" icone={<Trophy className="h-5 w-5 text-emerald-600" />} itens={dados?.maisVendidos} cor="bg-emerald-500" vazio="Nenhuma venda no período." />
        <Ranking titulo="Top 5 menos vendidos" subtitulo="Com o estoque ao lado, para ver o que está parado." icone={<PackageOpen className="h-5 w-5 text-amber-600" />}
          itens={dados?.menosVendidos} cor="bg-amber-400" mostrarEstoque vazio="Cadastre produtos para ver o que está parado." />
      </div>

      {/* Botão flutuante "+ Nova venda" */}
      <Link href="/vendas/nova" className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-marca-500 to-marca-700 px-5 py-3.5 font-semibold text-white shadow-destaque transition hover:brightness-110 lg:bottom-8 lg:right-8" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <Plus className="h-5 w-5" /> Nova venda
      </Link>
    </>
  );
}

function Cartao({ icone, titulo, valor, rodape, classe = '', chave }: { icone: React.ReactNode; titulo: string; valor?: string | null; rodape?: React.ReactNode; classe?: string; chave: string }) {
  return (
    <div className={`card-p h-full transition hover:shadow-md ${classe}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{icone}{titulo}</p>
      <p className="mt-2 font-display text-xl font-extrabold text-slate-900 sm:text-2xl" data-card={chave}>{valor ?? <span className="skeleton inline-block h-7 w-24" />}</p>
      <p className="mt-1 text-xs text-slate-500">{rodape ?? ' '}</p>
    </div>
  );
}

type Dica = { active?: boolean; payload?: { value: number; name: string; color?: string; payload: Record<string, unknown> }[]; label?: string };

function DicaSerie({ active, payload, label }: Dica) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}: <b className="text-slate-900">{formatarMoeda(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function DicaForma({ active, payload }: Dica) {
  if (!active || !payload?.length) return null;
  const f = payload[0].payload as { nome: string; total: number; taxas: number; qtd: number };
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">{f.nome}</p>
      <p className="text-slate-600">{formatarMoeda(f.total)} · {f.qtd} {f.qtd === 1 ? 'venda' : 'vendas'}</p>
      <p className="text-slate-500">Taxas: {formatarMoeda(f.taxas)}</p>
    </div>
  );
}

function Ranking({ titulo, subtitulo, icone, itens, cor, mostrarEstoque, vazio }: {
  titulo: string; subtitulo?: string; icone: React.ReactNode; itens?: DadosPainel['maisVendidos']; cor: string; mostrarEstoque?: boolean; vazio: string;
}) {
  const max = Math.max(1, ...(itens ?? []).map(i => i.qtd));
  return (
    <div className="card-p">
      <h2 className="flex items-center gap-2 font-bold">{icone}{titulo}</h2>
      {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
      <ol className="mt-4 space-y-3">
        {!itens ? [0, 1, 2].map(i => <li key={i} className="skeleton h-9" />)
          : itens.length === 0 ? <li className="py-6 text-center text-sm text-slate-500">{vazio}</li>
          : itens.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{p.nome}</span>
                  <span className="shrink-0 text-sm font-bold">{p.qtd} un.</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${cor}`} style={{ width: `${Math.max((p.qtd / max) * 100, 2)}%` }} /></div>
                  <span className={`shrink-0 text-xs ${mostrarEstoque && p.estoque <= 0 ? 'text-rose-600' : 'text-slate-500'}`}>{mostrarEstoque ? `estoque ${p.estoque}` : formatarMoeda(p.total)}</span>
                </div>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
