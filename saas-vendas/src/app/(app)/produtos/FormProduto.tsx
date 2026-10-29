'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Calculator, ImagePlus, Trash2 } from 'lucide-react';
import { salvarProdutoAcao, excluirProdutoAcao } from '@/app/acoes/cadastros';
import { Campo, CampoDinheiro, Enviar, ResumoErro } from '@/components/Formulario';
import { BotaoAcao } from '@/components/BotaoAcao';
import { toast } from '@/components/Toaster';
import { calcularMargem, corMargem } from '@/domain/calculadora';
import { formatarMoeda, formatarPercentual, lerNumero } from '@/domain/formatos';

interface Produto { id: number; nome: string; categoriaId: number | null; codigo: string | null; custo: number; precoVenda: number; estoque: number; estoqueMinimo: number; fotoUrl: string | null }

const CHIP = { verde: 'chip-verde', amarelo: 'chip-amarelo', vermelho: 'chip-vermelho' } as const;

export function FormProduto({ produto, categorias }: { produto: Produto | null; categorias: { id: number; nome: string }[] }) {
  const [estado, acao] = useActionState(salvarProdutoAcao, null);
  const e = estado && !estado.ok ? estado.campos ?? {} : {};
  const [custo, setCusto] = useState(produto?.custo ?? 0);
  const [preco, setPreco] = useState(produto?.precoVenda ?? 0);
  const [margemDesejada, setMargemDesejada] = useState('40');
  const [foto, setFoto] = useState<string | null>(produto?.fotoUrl ?? null);
  const [chave, setChave] = useState(0);

  const margem = calcularMargem(custo, preco);
  const desejada = lerNumero(margemDesejada);
  const sugerido = custo > 0 && desejada < 100 ? Math.round((custo / (1 - desejada / 100)) * 100) / 100 : null;

  return (
    <>
      <form action={acao} className="grid gap-4 lg:grid-cols-3" noValidate>
        <input type="hidden" name="id" value={produto?.id ?? ''} />
        <div className="card-p space-y-4 lg:col-span-2">
          <ResumoErro estado={estado} />
          <div className="flex items-start gap-4">
            <label className="group relative shrink-0 cursor-pointer" title="Foto do produto">
              {foto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={foto} alt="" className="h-24 w-24 rounded-2xl object-cover" />
                : <span className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 text-xs text-slate-500 transition group-hover:border-marca-400 group-hover:text-marca-600"><ImagePlus className="h-6 w-6" />Foto</span>}
              <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={ev => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  if (f.size > 3 * 1024 * 1024) { toast('A imagem pode ter no máximo 3 MB.', 'erro'); ev.target.value = ''; return; }
                  setFoto(URL.createObjectURL(f));
                }} />
            </label>
            <Campo className="flex-1" rotulo="Nome" nome="nome" defaultValue={produto?.nome} autoFocus={!produto} erro={e.nome} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categoriaId" className="rotulo">Categoria</label>
              <select id="categoriaId" name="categoriaId" defaultValue={produto?.categoriaId ?? ''} className="campo">
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <Link href="/categorias" className="dica inline-block hover:text-marca-700">Gerenciar categorias</Link>
            </div>
            <Campo rotulo={<>Código <span className="font-normal text-slate-400">(opcional)</span></>} nome="codigo" defaultValue={produto?.codigo ?? ''} placeholder="SKU ou código de barras" erro={e.codigo} />
            <CampoDinheiro key={`c${chave}`} rotulo="Custo" nome="custo" valorInicial={custo} aoMudar={setCusto} erro={e.custo} dica="Quanto você paga para ter uma unidade." />
            <CampoDinheiro key={`p${chave}`} rotulo="Preço de venda" nome="precoVenda" valorInicial={preco} aoMudar={setPreco} erro={e.precoVenda} />
            <Campo rotulo="Estoque" nome="estoque" type="number" inputMode="numeric" defaultValue={produto?.estoque ?? 0} erro={e.estoque} />
            <Campo rotulo="Estoque mínimo" nome="estoqueMinimo" type="number" min={0} inputMode="numeric" defaultValue={produto?.estoqueMinimo ?? 0} erro={e.estoqueMinimo} dica="Avisamos no painel quando chegar nesse número." />
          </div>
        </div>

        {/* Calculadora ao lado */}
        <aside className="space-y-4">
          <div className="card-p">
            <h2 className="flex items-center gap-2 font-bold"><Calculator className="h-4 w-4 text-marca-600" /> Calculadora</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between"><dt className="text-slate-500">Margem</dt><dd id="calc-margem" className={preco > 0 ? CHIP[corMargem(margem)] : 'chip-cinza'}>{preco > 0 ? formatarPercentual(margem) : '—'}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-slate-500">Lucro por unidade</dt><dd id="calc-lucro" className={`font-bold ${preco < custo ? 'text-rose-600' : ''}`}>{preco > 0 ? formatarMoeda(preco - custo) : '—'}</dd></div>
            </dl>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <label htmlFor="margem-desejada" className="rotulo">Margem desejada</label>
              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <input id="margem-desejada" inputMode="decimal" value={margemDesejada} onChange={ev => setMargemDesejada(ev.target.value.replace(/[^\d,.]/g, ''))} className="campo pr-7 text-right" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
                </div>
                <span className="text-slate-400">→</span>
                <button type="button" className="btn-suave btn-sm flex-1 py-2" disabled={!sugerido} onClick={() => { setPreco(sugerido!); setChave(k => k + 1); }}>
                  {sugerido ? formatarMoeda(sugerido) : '—'}
                </button>
              </div>
              <p className="dica">Preço sugerido. Toque para usar.</p>
            </div>
            <p className="mt-3 text-xs text-slate-500">Verde acima de 30%, amarelo de 15% a 30%, vermelho abaixo de 15%.</p>
          </div>
          <Enviar className="btn-primario btn-lg w-full" pendente="Salvando…">Salvar produto</Enviar>
        </aside>
      </form>
      {produto && (
        <div className="mt-4">
          <BotaoAcao acao={excluirProdutoAcao.bind(null, produto.id)} className="btn-fantasma text-rose-600" confirmar="Excluir este produto? Se ele já tiver vendas, será apenas desativado.">
            <Trash2 className="h-4 w-4" /> Excluir produto
          </BotaoAcao>
        </div>
      )}
    </>
  );
}
