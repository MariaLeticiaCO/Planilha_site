'use client';

import { useState, useTransition } from 'react';
import { Banknote, BookOpen, Cake, Check, CreditCard, Gift, Info, Landmark, Loader2, Sparkles, Shirt, Smartphone, Store, Wallet } from 'lucide-react';
import { concluirOnboardingAcao } from '@/app/acoes/onboarding';
import { CampoDinheiro } from '@/components/Formulario';
import { toast } from '@/components/Toaster';
import { calcularMargem, corMargem } from '@/domain/calculadora';
import { formatarMoeda, formatarPercentual, lerNumero } from '@/domain/formatos';
import type { TipoPagamento } from '@/domain/tipos';

const ICONES_SETOR = { camiseta: Shirt, bolo: Cake, batom: Sparkles, catalogo: BookOpen, celular: Smartphone, presente: Gift, loja: Store } as const;
const ICONES_FORMA: Record<TipoPagamento, typeof Wallet> = { PIX: Landmark, DINHEIRO: Banknote, DEBITO: CreditCard, CREDITO: CreditCard, CREDIARIO: Wallet };

interface Props { setores: { id: number; nome: string; icone: string; categoriasSugeridas: string[] }[]; formas: { tipo: TipoPagamento; nome: string }[]; nome: string }

export function Wizard({ setores, formas: padrao, nome }: Props) {
  const [passo, setPasso] = useState(1);
  const [negocio, setNegocio] = useState('');
  const [setorId, setSetorId] = useState<number | null>(null);
  const [formas, setFormas] = useState(padrao.map(f => ({ ...f, ativo: true, taxa: '0' })));
  const [produto, setProduto] = useState({ nome: '', custo: 0, preco: 0 });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();

  const avancar = () => {
    if (passo === 1) {
      const e: Record<string, string> = {};
      if (!negocio.trim()) e.negocio = 'Informe o nome do negócio.';
      if (!setorId) e.setor = 'Escolha o setor do seu negócio.';
      setErros(e);
      if (Object.keys(e).length) return;
    }
    if (passo === 2 && !formas.some(f => f.ativo)) return toast('Deixe pelo menos uma forma de pagamento marcada.', 'erro');
    setPasso(p => p + 1);
    window.scrollTo(0, 0);
  };

  const concluir = (pular: boolean) => iniciar(async () => {
    const temProduto = !pular && produto.nome.trim() && produto.preco > 0;
    const r = await concluirOnboardingAcao({
      nomeNegocio: negocio, setorId,
      formas: formas.map(f => ({ tipo: f.tipo, ativo: f.ativo, taxaPercentual: lerNumero(f.taxa) })),
      produto: temProduto ? { nome: produto.nome.trim(), custo: produto.custo, preco: produto.preco } : null
    });
    if (r && !r.ok) toast(r.erro, 'erro');
  });

  const margem = calcularMargem(produto.custo, produto.preco);
  const setor = setores.find(s => s.id === setorId);

  return (
    <div className="card animate-entrar p-6 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Passo {passo} de 3</span><span>Leva uns 2 minutos</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map(i => <div key={i} className={`h-1.5 rounded-full transition-colors ${i <= passo ? 'bg-marca-600' : 'bg-slate-200'}`} />)}
        </div>
      </div>

      {passo === 1 && (
        <section>
          <h1 className="text-2xl font-extrabold">Oi, {nome}! Como se chama seu negócio?</h1>
          <div className="mt-5">
            <label htmlFor="negocio" className="rotulo">Nome do negócio</label>
            <input id="negocio" className={`campo ${erros.negocio ? 'campo-erro' : ''}`} placeholder="Ex.: Doces da Ana" value={negocio} autoFocus onChange={e => setNegocio(e.target.value)} />
            {erros.negocio && <span className="erro-campo">{erros.negocio}</span>}
          </div>
          <p className="rotulo mt-6">O que você vende?</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {setores.map(s => {
              const I = ICONES_SETOR[s.icone as keyof typeof ICONES_SETOR] ?? Store;
              const sel = setorId === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setSetorId(s.id)} aria-pressed={sel}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center text-sm font-semibold transition ${sel ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-200 text-slate-700 hover:border-marca-300'}`}>
                  {sel && <Check className="absolute right-2 top-2 h-4 w-4 text-marca-600" />}
                  <I className={`h-7 w-7 ${sel ? 'text-marca-600' : 'text-slate-400'}`} />
                  {s.nome}
                </button>
              );
            })}
          </div>
          {erros.setor && <span className="erro-campo">{erros.setor}</span>}
          {setor && <p className="dica mt-3">Vamos criar as categorias: {setor.categoriasSugeridas.join(', ')}. Dá para mudar depois.</p>}
          <button type="button" className="btn-primario btn-lg mt-7 w-full" onClick={avancar}>Continuar</button>
        </section>
      )}

      {passo === 2 && (
        <section>
          <h1 className="text-2xl font-extrabold">Como você recebe?</h1>
          <p className="mt-1 text-sm text-slate-500">Deixe marcadas as formas que você usa e informe a taxa de cada uma.</p>
          <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {formas.map((f, i) => {
              const I = ICONES_FORMA[f.tipo];
              const comTaxa = ['PIX', 'DEBITO', 'CREDITO'].includes(f.tipo);
              return (
                <div key={f.tipo} className="flex items-center gap-3 p-3">
                  <label className="flex flex-1 items-center gap-3 text-sm font-semibold">
                    <input type="checkbox" checked={f.ativo} onChange={e => setFormas(l => l.map((x, j) => (j === i ? { ...x, ativo: e.target.checked } : x)))}
                      className="h-5 w-5 rounded border-slate-300 text-marca-600 focus:ring-marca-500" />
                    <I className="h-5 w-5 text-slate-400" />{f.nome}
                  </label>
                  {comTaxa ? (
                    <div className="relative w-24">
                      <input inputMode="decimal" aria-label={`Taxa do ${f.nome} em %`} value={f.taxa} className="campo pr-7 text-right"
                        onChange={e => setFormas(l => l.map((x, j) => (j === i ? { ...x, taxa: e.target.value.replace(/[^\d,.]/g, '') } : x)))} />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
                    </div>
                  ) : <span className="w-24 text-right text-xs text-slate-400">sem taxa</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><Info className="h-4 w-4 shrink-0" />Veja a taxa no app da sua maquininha. Se não souber agora, deixe 0 e ajuste depois em Formas de pagamento.</p>
          <div className="mt-7 flex gap-3">
            <button type="button" className="btn-secundario btn-lg" onClick={() => setPasso(1)}>Voltar</button>
            <button type="button" className="btn-primario btn-lg flex-1" onClick={avancar}>Continuar</button>
          </div>
        </section>
      )}

      {passo === 3 && (
        <section>
          <h1 className="text-2xl font-extrabold">Cadastre seu primeiro produto</h1>
          <p className="mt-1 text-sm text-slate-500">Assim você já registra uma venda e vê o lucro.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="produto" className="rotulo">Nome do produto</label>
              <input id="produto" className="campo" placeholder="Ex.: Brigadeiro gourmet" value={produto.nome} onChange={e => setProduto(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <CampoDinheiro rotulo="Custo" nome="custo" aoMudar={v => setProduto(p => ({ ...p, custo: v }))} />
              <CampoDinheiro rotulo="Preço de venda" nome="preco" aoMudar={v => setProduto(p => ({ ...p, preco: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">Margem</span>
              {produto.preco > 0
                ? <span className={corMargem(margem) === 'verde' ? 'chip-verde' : corMargem(margem) === 'amarelo' ? 'chip-amarelo' : 'chip-vermelho'} id="onb-margem">
                    {formatarPercentual(margem)} · lucro {formatarMoeda(produto.preco - produto.custo)} por unidade
                  </span>
                : <span className="chip-cinza">—</span>}
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-3">
            <button type="button" className="btn-primario btn-lg w-full" disabled={pendente} onClick={() => concluir(false)}>
              {pendente && <Loader2 className="h-4 w-4 animate-spin" />} Concluir e ir para o painel
            </button>
            <div className="flex gap-3">
              <button type="button" className="btn-secundario flex-1" onClick={() => setPasso(2)} disabled={pendente}>Voltar</button>
              <button type="button" className="btn-secundario flex-1" onClick={() => concluir(true)} disabled={pendente}>Pular</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
