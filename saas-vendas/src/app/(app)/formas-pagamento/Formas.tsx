'use client';

import { useActionState, useState } from 'react';
import { Banknote, CreditCard, Landmark, Plus, Wallet } from 'lucide-react';
import { alterarAtivoFormaAcao, salvarFormaAcao } from '@/app/acoes/cadastros';
import { CampoDinheiro, Enviar, useResultado } from '@/components/Formulario';
import { BotaoAcao } from '@/components/BotaoAcao';
import { valorRecebido } from '@/domain/calculadora';
import { formatarMoeda, lerNumero } from '@/domain/formatos';
import { NOME_TIPO_PAGAMENTO, TIPOS_PAGAMENTO, type TipoPagamento } from '@/domain/tipos';
import type { FormaItem } from '@/server/services/cadastros';

const ICONES: Record<TipoPagamento, typeof Wallet> = { PIX: Landmark, DINHEIRO: Banknote, DEBITO: CreditCard, CREDITO: CreditCard, CREDIARIO: Wallet };
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function Formas({ lista }: { lista: FormaItem[] }) {
  const [simulado, setSimulado] = useState(100);
  return (
    <>
      {/* Simulador: "numa venda de R$ 100 você recebe R$ X" */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-marca-600 to-marca-800 p-5 text-white shadow-destaque">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <p className="text-sm font-semibold text-marca-100">Simulador: numa venda de</p>
        <CampoDinheiro rotulo="" nome="simular" valorInicial={100} aoMudar={setSimulado} className="mt-2 max-w-[220px] [&_input]:border-0 [&_input]:bg-white/15 [&_input]:py-2 [&_input]:text-2xl [&_input]:font-extrabold [&_input]:text-white [&_span]:text-marca-100" />
        <p className="mt-2 text-sm text-marca-100">você recebe (já descontada a taxa):</p>
      </div>
      <div className="mt-4 space-y-3">
        {lista.map(f => <LinhaForma key={f.id} f={f} simulado={simulado} />)}
      </div>
      <NovaForma />
    </>
  );
}

function LinhaForma({ f, simulado }: { f: FormaItem; simulado: number }) {
  const [estado, acao] = useActionState(salvarFormaAcao, null);
  useResultado(estado);
  const [pct, setPct] = useState(num(f.taxaPercentual));
  const [fixa, setFixa] = useState(num(f.taxaFixa));
  const I = ICONES[f.tipo];
  return (
    <form action={acao} className={`card p-4 ${f.ativo ? '' : 'opacity-60'}`}>
      <input type="hidden" name="id" value={f.id} />
      <input type="hidden" name="ativo" value={String(f.ativo)} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-marca-700"><I className="h-5 w-5" /></span>
        <div className="min-w-[9rem] flex-1">
          <input name="nome" defaultValue={f.nome} maxLength={40} aria-label="Nome" className="w-full rounded-lg border-0 bg-transparent p-0 font-semibold focus:ring-0" />
          <select name="tipo" defaultValue={f.tipo} aria-label="Tipo" className="mt-0.5 rounded-lg border-0 bg-transparent p-0 pr-7 text-xs text-slate-500 focus:ring-0">
            {TIPOS_PAGAMENTO.map(t => <option key={t} value={t}>{NOME_TIPO_PAGAMENTO[t]}</option>)}
          </select>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">recebe</p>
          <p className="font-display text-lg font-extrabold text-emerald-600" data-recebe>{formatarMoeda(simulado > 0 ? valorRecebido(simulado, lerNumero(pct), lerNumero(fixa)) : 0)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="w-28"><span className="rotulo text-xs">Taxa %</span><input name="taxaPercentual" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value.replace(/[^\d,.]/g, ''))} className="campo py-2" /></label>
        <label className="w-28"><span className="rotulo text-xs">Taxa fixa R$</span><input name="taxaFixa" inputMode="decimal" value={fixa} onChange={e => setFixa(e.target.value.replace(/[^\d,.]/g, ''))} className="campo py-2" /></label>
        <Enviar className="btn-primario btn-sm py-2.5">Salvar</Enviar>
        <span className="flex-1" />
        <BotaoAcao acao={alterarAtivoFormaAcao.bind(null, f.id, !f.ativo)} className="btn-fantasma btn-sm">{f.ativo ? 'Desativar' : 'Ativar'}</BotaoAcao>
      </div>
    </form>
  );
}

function NovaForma() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao] = useActionState(salvarFormaAcao, null);
  useResultado(estado, () => setAberto(false));
  if (!aberto) return <button type="button" className="btn-secundario mt-4" onClick={() => setAberto(true)}><Plus className="h-4 w-4" /> Nova forma de pagamento</button>;
  return (
    <form action={acao} className="card-p mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
      <label className="sm:col-span-2"><span className="rotulo">Nome</span><input name="nome" className="campo" placeholder="Ex.: Crédito 2–6x" maxLength={40} required autoFocus /></label>
      <label><span className="rotulo">Tipo</span><select name="tipo" className="campo">{TIPOS_PAGAMENTO.map(t => <option key={t} value={t}>{NOME_TIPO_PAGAMENTO[t]}</option>)}</select></label>
      <label><span className="rotulo">Taxa %</span><input name="taxaPercentual" defaultValue="0" inputMode="decimal" className="campo" /></label>
      <label><span className="rotulo">Taxa fixa R$</span><input name="taxaFixa" defaultValue="0" inputMode="decimal" className="campo" /></label>
      <div className="flex gap-2 sm:col-span-3"><button type="button" className="btn-secundario" onClick={() => setAberto(false)}>Cancelar</button><Enviar className="btn-primario flex-1">Adicionar</Enviar></div>
    </form>
  );
}
