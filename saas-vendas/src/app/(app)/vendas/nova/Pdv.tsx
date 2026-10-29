'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Banknote, Check, ChevronLeft, CreditCard, Landmark, Loader2, Minus, Plus, Search, ShoppingCart, Trash2, UserPlus, Wallet, X
} from 'lucide-react';
import { registrarVendaAcao } from '@/app/acoes/vendas';
import { clienteRapidoAcao } from '@/app/acoes/cadastros';
import { toast } from '@/components/Toaster';
import { mascaraTelefone } from '@/components/Formulario';
import { arredondar } from '@/domain/calculadora';
import { formatarMoeda, formatarTelefone, lerNumero } from '@/domain/formatos';
import type { TipoPagamento } from '@/domain/tipos';
import type { ProdutoVenda, FormaItem } from '@/server/services/cadastros';
import type { VendaRegistrada } from '@/server/services/vendas';

const ICONES: Record<TipoPagamento, typeof Wallet> = { PIX: Landmark, DINHEIRO: Banknote, DEBITO: CreditCard, CREDITO: CreditCard, CREDIARIO: Wallet };
type Cliente = { id: number; nome: string; telefone: string | null };

export function Pdv({ produtos: iniciais, formas, dono, hoje, vencimentoPadrao }: {
  produtos: ProdutoVenda[]; formas: FormaItem[]; dono: boolean; hoje: string; vencimentoPadrao: string;
}) {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState(iniciais);
  const [visiveis, setVisiveis] = useState(iniciais);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<Map<number, number>>(new Map());
  const [desconto, setDesconto] = useState('');
  const [descontoPct, setDescontoPct] = useState(false);
  const [formaId, setFormaId] = useState<number | null>((formas.find(f => f.tipo === 'PIX') ?? formas[0])?.id ?? null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [parcelas, setParcelas] = useState(1);
  const [vencimento, setVencimento] = useState(vencimentoPadrao);
  const [painelAberto, setPainelAberto] = useState(false);
  const [sucesso, setSucesso] = useState<VendaRegistrada | null>(null);
  const [pendente, iniciar] = useTransition();

  // Busca de produto por nome ou código
  useEffect(() => {
    const termo = busca.trim();
    if (!termo) { setVisiveis(catalogo); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/vendas/buscar-produto?q=${encodeURIComponent(termo)}`, { headers: { Accept: 'application/json' } });
      if (r.ok) setVisiveis(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [busca, catalogo]);

  const porId = useMemo(() => new Map([...catalogo, ...visiveis].map(p => [p.id, p])), [catalogo, visiveis]);
  const itens = [...carrinho.entries()].map(([id, qtd]) => ({ produto: porId.get(id)!, qtd })).filter(i => i.produto);
  const forma = formas.find(f => f.id === formaId);
  const crediario = forma?.tipo === 'CREDIARIO';

  // Mesmas regras do servidor (o servidor recalcula tudo ao salvar)
  const bruto = arredondar(itens.reduce((t, i) => t + i.produto.preco * i.qtd, 0));
  const custo = arredondar(itens.reduce((t, i) => t + (i.produto.custo ?? 0) * i.qtd, 0));
  const valorDesconto = lerNumero(desconto);
  const descontoReais = descontoPct ? arredondar((bruto * Math.min(valorDesconto, 100)) / 100) : arredondar(valorDesconto);
  const descontoInvalido = descontoReais > bruto;
  const total = arredondar(bruto - Math.min(descontoReais, bruto));
  const taxa = forma && total > 0 ? arredondar((total * forma.taxaPercentual) / 100 + forma.taxaFixa) : 0;
  const lucro = arredondar(total - taxa - custo);
  const qtdItens = itens.reduce((t, i) => t + i.qtd, 0);
  const valorParcela = Math.floor((total / parcelas) * 100) / 100;
  const ultimaParcela = arredondar(total - valorParcela * (parcelas - 1));

  const mudarQtd = (id: number, qtd: number) => setCarrinho(c => {
    const n = new Map(c);
    if (qtd <= 0) n.delete(id); else n.set(id, qtd);
    return n;
  });
  const adicionar = (id: number) => { mudarQtd(id, (carrinho.get(id) ?? 0) + 1); navigator.vibrate?.(12); };

  const bloqueio = qtdItens === 0 ? 'Adicione produtos' : !forma ? 'Escolha a forma de pagamento' : descontoInvalido ? 'Desconto maior que o valor'
    : crediario && !cliente ? 'Escolha o cliente' : null;

  const finalizar = () => iniciar(async () => {
    const r = await registrarVendaAcao({
      itens: itens.map(i => ({ produtoId: i.produto.id, quantidade: i.qtd })),
      desconto: valorDesconto, descontoEmPercentual: descontoPct, formaPagamentoId: formaId,
      clienteId: cliente?.id ?? null, qtdParcelas: crediario ? parcelas : 1, primeiroVencimento: crediario ? vencimento : null
    });
    if (!r.ok) {
      toast(r.erro, 'erro');
      if ('redirect' in r && r.redirect) router.push(r.redirect);
      return;
    }
    setPainelAberto(false);
    setSucesso(r.dados!);
    // Atualiza o estoque mostrado nos cards
    const baixar = (l: ProdutoVenda[]) => l.map(p => (carrinho.has(p.id) ? { ...p, estoque: p.estoque - carrinho.get(p.id)! } : p));
    setCatalogo(baixar);
    setVisiveis(baixar);
  });

  const novaVenda = () => {
    setCarrinho(new Map()); setDesconto(''); setCliente(null); setParcelas(1); setBusca(''); setSucesso(null);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link href="/painel" className="-ml-2 rounded-xl p-2 text-slate-500 hover:bg-white lg:hidden" aria-label="Voltar"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="titulo-pagina">Nova venda</h1>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-start lg:gap-6">
        {/* ===== Produtos ===== */}
        <section>
          <div className="sticky top-[57px] z-20 -mx-4 bg-[#f6f5fb]/95 px-4 pb-3 pt-1 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="search" value={busca} onChange={e => setBusca(e.target.value)} className="campo py-3 pl-11" placeholder="Buscar produto por nome ou código"
                enterKeyHint="search" aria-label="Buscar produto"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (visiveis.length === 1) adicionar(visiveis[0].id); } }} />
            </label>
          </div>
          {visiveis.length === 0 ? (
            <div className="card py-12 text-center text-slate-500">
              Nenhum produto encontrado. {dono && <Link href="/produtos/novo" className="font-semibold text-marca-700">Cadastrar produto</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {visiveis.map(p => {
                const noCarrinho = carrinho.get(p.id) ?? 0;
                return (
                  <div key={p.id} className={`card flex items-center gap-3 p-2.5 transition ${noCarrinho ? 'ring-2 ring-marca-500' : ''}`}>
                    {p.fotoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.fotoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                      : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-marca-50 to-marca-100 font-display text-lg font-bold text-marca-600">{p.nome[0]?.toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">{p.nome}</p>
                      <p className="text-sm font-bold text-marca-700">{formatarMoeda(p.preco)}</p>
                      <p className="text-xs text-slate-500">{p.codigo ? `${p.codigo} · ` : ''}{p.estoque <= 0 ? <span className="text-rose-600">sem estoque</span> : `estoque ${p.estoque}`}</p>
                    </div>
                    {noCarrinho > 0 && <span className="chip-marca">{noCarrinho}</span>}
                    <button type="button" onClick={() => adicionar(p.id)} aria-label={`Adicionar ${p.nome}`} data-add={p.id}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marca-600 text-white shadow-sm shadow-marca-600/30 transition active:scale-90">
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="h-24 lg:hidden" />
        </section>

        {/* ===== Carrinho e pagamento ===== */}
        <section className={`fixed inset-0 z-50 flex flex-col bg-[#f6f5fb] lg:sticky lg:top-6 lg:z-auto lg:max-h-[calc(100vh-3rem)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:shadow-suave ${painelAberto ? 'animate-subir' : 'max-lg:hidden'}`}
          aria-label="Carrinho">
          <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-3">
            <button type="button" onClick={() => setPainelAberto(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Voltar aos produtos"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="flex flex-1 items-center gap-2 font-bold">Carrinho <span className="chip-marca">{qtdItens}</span></h2>
            {qtdItens > 0 && <button type="button" onClick={() => setCarrinho(new Map())} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" />Limpar</button>}
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {itens.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Toque no <b>+</b> de um produto para começar.</p>
            ) : (
              <ul className="space-y-2">
                {itens.map(({ produto: p, qtd }) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nome}</p>
                      <p className="text-xs text-slate-500">{formatarMoeda(p.preco)} · subtotal <b className="text-slate-700">{formatarMoeda(p.preco * qtd)}</b></p>
                      {qtd > p.estoque && <p className="text-xs font-semibold text-amber-700">Estoque atual: {p.estoque}</p>}
                    </div>
                    <div className="flex items-center rounded-xl bg-slate-100">
                      <button type="button" className="flex h-9 w-9 items-center justify-center text-slate-600" onClick={() => mudarQtd(p.id, qtd - 1)} aria-label="Diminuir"><Minus className="h-4 w-4" /></button>
                      <input inputMode="numeric" aria-label="Quantidade" className="h-9 w-10 border-0 bg-transparent p-0 text-center text-sm font-bold focus:ring-0" value={qtd}
                        onChange={e => mudarQtd(p.id, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))} />
                      <button type="button" className="flex h-9 w-9 items-center justify-center text-slate-600" onClick={() => mudarQtd(p.id, qtd + 1)} aria-label="Aumentar"><Plus className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Desconto em R$ ou % */}
            <div>
              <label htmlFor="desconto" className="rotulo">Desconto</label>
              <div className="flex gap-2">
                <input id="desconto" inputMode="decimal" className={`campo ${descontoInvalido ? 'campo-erro' : ''}`} placeholder="0" value={desconto} onChange={e => setDesconto(e.target.value.replace(/[^\d,.]/g, ''))} />
                <div className="segmentado shrink-0" role="group" aria-label="Tipo de desconto">
                  <button type="button" className={!descontoPct ? 'ativo' : ''} onClick={() => setDescontoPct(false)}>R$</button>
                  <button type="button" className={descontoPct ? 'ativo' : ''} onClick={() => setDescontoPct(true)} data-tipo="percentual">%</button>
                </div>
              </div>
            </div>

            {/* Forma de pagamento em botões grandes */}
            <div>
              <p className="rotulo">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2" id="formas">
                {formas.map(f => {
                  const I = ICONES[f.tipo];
                  const sel = f.id === formaId;
                  return (
                    <button key={f.id} type="button" onClick={() => setFormaId(f.id)} aria-pressed={sel}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold transition ${sel ? 'border-marca-600 bg-marca-50 text-marca-800' : 'border-slate-200 bg-white text-slate-700 hover:border-marca-300'}`}>
                      <I className={`h-5 w-5 shrink-0 ${sel ? 'text-marca-600' : 'text-slate-400'}`} /><span className="truncate">{f.nome}</span>
                    </button>
                  );
                })}
              </div>
              {formas.length === 0 && <p className="text-sm text-rose-600">Nenhuma forma de pagamento ativa. {dono ? <Link href="/formas-pagamento" className="underline">Configure aqui</Link> : 'Peça ao dono para ativar.'}</p>}
            </div>

            <SeletorCliente cliente={cliente} setCliente={setCliente} obrigatorio={crediario} />

            {/* Crediário: parcelas e 1º vencimento */}
            {crediario && (
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
                <div>
                  <label htmlFor="parcelas" className="rotulo">Parcelas</label>
                  <select id="parcelas" className="campo" value={parcelas} onChange={e => setParcelas(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="vencimento" className="rotulo">1º vencimento</label>
                  <input id="vencimento" type="date" className="campo" value={vencimento} min={hoje} onChange={e => setVencimento(e.target.value)} />
                </div>
                {total > 0 && <p className="col-span-2 text-xs text-slate-500">{parcelas === 1 ? `1x de ${formatarMoeda(total)}` : `${parcelas - 1}x de ${formatarMoeda(valorParcela)} + 1x de ${formatarMoeda(ultimaParcela)}`} · a cada 30 dias</p>}
              </div>
            )}
          </div>

          {/* Resumo */}
          <footer className="pb-seguro border-t border-slate-200/80 bg-white p-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd>{formatarMoeda(bruto)}</dd></div>
              <div className={`flex justify-between ${descontoInvalido ? 'text-rose-600' : 'text-slate-500'}`}><dt>Desconto</dt><dd>− {formatarMoeda(Math.min(descontoReais, bruto))}</dd></div>
              <div className="flex justify-between text-slate-500"><dt>Taxa estimada</dt><dd>{formatarMoeda(taxa)}</dd></div>
              <div className="flex items-baseline justify-between pt-1"><dt className="font-semibold">Total</dt><dd className="font-display text-2xl font-extrabold" id="resumo-total">{formatarMoeda(total)}</dd></div>
              {dono && (
                <div className={`flex justify-between rounded-lg px-3 py-1.5 font-semibold ${lucro < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <dt>Lucro desta venda</dt><dd id="resumo-lucro">{formatarMoeda(lucro)}</dd>
                </div>
              )}
            </dl>
            <button type="button" id="finalizar" className="btn-primario btn-lg mt-3 w-full" disabled={!!bloqueio || pendente} onClick={finalizar}>
              {pendente ? <><Loader2 className="h-5 w-5 animate-spin" /> Registrando…</> : bloqueio ?? 'Finalizar venda'}
            </button>
          </footer>
        </section>
      </div>

      {/* Barra do celular: abre o carrinho */}
      {!painelAberto && (
        <div className="pb-seguro fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 p-3 backdrop-blur lg:hidden">
          <button type="button" id="abrir-carrinho" className="btn-primario btn-lg w-full justify-between" disabled={qtdItens === 0} onClick={() => setPainelAberto(true)}>
            <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />{qtdItens ? `${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'} · Ver carrinho` : 'Carrinho vazio'}</span>
            <span className="font-display font-extrabold">{formatarMoeda(total)}</span>
          </button>
        </div>
      )}

      {/* Tela de sucesso */}
      {sucesso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sucesso-titulo" id="sucesso">
          <div className="w-full max-w-sm animate-entrar rounded-3xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-9 w-9" strokeWidth={3} /></span>
            <h2 id="sucesso-titulo" className="mt-3 text-xl font-extrabold">Venda registrada!</h2>
            <p className="mt-1 font-display text-3xl font-extrabold" id="sucesso-total">{formatarMoeda(sucesso.total)}</p>
            {sucesso.lucro != null && <p className="mt-1 font-semibold text-emerald-600" id="sucesso-lucro">Lucro: {formatarMoeda(sucesso.lucro)}</p>}
            {sucesso.avisos.length > 0 && (
              <ul className="mt-3 space-y-1 text-left text-xs text-amber-800" id="sucesso-avisos">
                {sucesso.avisos.map(a => <li key={a} className="flex gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{a}</li>)}
              </ul>
            )}
            <div className="mt-5 space-y-2">
              <a href={sucesso.linkRecibo} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-lg w-full" id="sucesso-recibo">Enviar recibo no WhatsApp</a>
              <button type="button" onClick={novaVenda} className="btn-primario btn-lg w-full" id="sucesso-nova"><Plus className="h-5 w-5" /> Nova venda</button>
              <Link href={`/vendas/${sucesso.vendaId}`} className="btn-secundario w-full">Ver detalhes</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Cliente: busca por nome/telefone ou cadastro rápido. Obrigatório no crediário. */
function SeletorCliente({ cliente, setCliente, obrigatorio }: { cliente: Cliente | null; setCliente: (c: Cliente | null) => void; obrigatorio: boolean }) {
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<Cliente[] | null>(null);
  const [rapido, setRapido] = useState(false);
  const [novo, setNovo] = useState({ nome: '', telefone: '' });
  const [salvando, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!termo.trim()) { setSugestoes(null); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/clientes/buscar?q=${encodeURIComponent(termo.trim())}`, { headers: { Accept: 'application/json' } });
      if (r.ok) setSugestoes(await r.json());
    }, 250);
    return () => clearTimeout(t);
  }, [termo]);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setSugestoes(null); };
    document.addEventListener('click', fora);
    return () => document.removeEventListener('click', fora);
  }, []);

  const salvarRapido = () => iniciar(async () => {
    if (!novo.nome.trim()) { toast('Informe o nome do cliente.', 'erro'); return; }
    const r = await clienteRapidoAcao(novo.nome, novo.telefone);
    if (!r.ok) { toast(r.erro, 'erro'); return; }
    setCliente(r.dados!); setRapido(false); setNovo({ nome: '', telefone: '' }); setTermo('');
    toast('Cliente cadastrado.');
  });

  return (
    <div>
      <p className="rotulo">Cliente {obrigatorio ? <span className="text-rose-600">(obrigatório no crediário)</span> : <span className="font-normal text-slate-400">(opcional)</span>}</p>
      {cliente ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-marca-200 bg-marca-50 px-3 py-2.5" id="cliente-escolhido">
          <span className="min-w-0"><b className="block truncate text-sm">{cliente.nome}</b><span className="text-xs text-slate-500">{formatarTelefone(cliente.telefone)}</span></span>
          <button type="button" onClick={() => setCliente(null)} className="rounded-lg p-1 text-slate-500 hover:bg-white" aria-label="Trocar cliente"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <>
          <div className="relative" ref={caixa}>
            <input type="search" className="campo" placeholder="Buscar por nome ou telefone" value={termo} onChange={e => setTermo(e.target.value)} aria-label="Buscar cliente" />
            {sugestoes && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {sugestoes.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Nenhum cliente. Use “Cadastrar cliente novo”.</li>}
                {sugestoes.map(c => (
                  <li key={c.id}><button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { setCliente(c); setSugestoes(null); setTermo(''); }}>
                    <b>{c.nome}</b> <span className="text-xs text-slate-500">{formatarTelefone(c.telefone)}</span>
                  </button></li>
                ))}
              </ul>
            )}
          </div>
          {!rapido ? (
            <button type="button" onClick={() => { setRapido(true); setNovo(n => ({ ...n, nome: termo })); }} className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-marca-700" id="abrir-cliente-rapido">
              <UserPlus className="h-3.5 w-3.5" /> Cadastrar cliente novo
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <input className="campo" placeholder="Nome do cliente" value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} id="rapido-nome" autoFocus />
              <input className="campo" placeholder="WhatsApp com DDD" inputMode="tel" value={novo.telefone} onChange={e => setNovo(n => ({ ...n, telefone: mascaraTelefone(e.target.value) }))} id="rapido-telefone" />
              <div className="flex gap-2">
                <button type="button" className="btn-secundario btn-sm flex-1" onClick={() => setRapido(false)}>Cancelar</button>
                <button type="button" className="btn-primario btn-sm flex-1" onClick={salvarRapido} disabled={salvando} id="salvar-cliente-rapido">{salvando && <Loader2 className="h-3 w-3 animate-spin" />}Salvar cliente</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
