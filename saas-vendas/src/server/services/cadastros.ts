import 'server-only';
import { db, bool, bit, contem, inserir, num } from '../db/conexao';
import { agora, lerData } from '@/domain/datas';
import { soDigitos } from '@/domain/formatos';
import { NaoEncontradoError, RegraNegocioError, type TipoPagamento } from '@/domain/tipos';
import type { z } from 'zod';
import type { clienteSchema, formaPagamentoSchema, produtoSchema } from '@/domain/validacao';
import type { Sessao } from '../sessao';
import { obterEmpresa } from '../contexto';

// ======================= Produtos (T09/T10) =======================

export interface ProdutoLista {
  id: number; nome: string; codigo: string | null; categoria: string | null; categoriaId: number | null;
  custo: number; precoVenda: number; margem: number; estoque: number; estoqueMinimo: number; fotoUrl: string | null; ativo: boolean;
}

export async function listarProdutos(s: Sessao, filtro: { busca?: string; categoriaId?: number | null; status?: string }): Promise<ProdutoLista[]> {
  let q = db().selectFrom('Produto as p').leftJoin('Categoria as c', 'c.Id', 'p.CategoriaId')
    .select(['p.Id', 'p.Nome', 'p.Codigo', 'c.Nome as Categoria', 'p.CategoriaId', 'p.Custo', 'p.PrecoVenda', 'p.MargemPercentual',
      'p.Estoque', 'p.EstoqueMinimo', 'p.FotoUrl', 'p.Ativo'])
    .where('p.EmpresaId', '=', s.empresaId);
  if (filtro.busca?.trim()) {
    const b = `%${filtro.busca.trim()}%`;
    q = q.where(eb => eb.or([eb('p.Nome', contem(), b), eb('p.Codigo', contem(), b)]));
  }
  if (filtro.categoriaId) q = q.where('p.CategoriaId', '=', filtro.categoriaId);
  if (filtro.status === 'inativos') q = q.where('p.Ativo', '=', 0);
  else if (filtro.status === 'estoque-baixo') q = q.where('p.Ativo', '=', 1).whereRef('p.Estoque', '<=', 'p.EstoqueMinimo');
  else if (filtro.status !== 'todos') q = q.where('p.Ativo', '=', 1);
  const linhas = await q.orderBy('p.Nome').execute();
  return linhas.map(p => ({
    id: p.Id, nome: p.Nome, codigo: p.Codigo, categoria: p.Categoria, categoriaId: p.CategoriaId, custo: num(p.Custo), precoVenda: num(p.PrecoVenda),
    margem: num(p.MargemPercentual), estoque: num(p.Estoque), estoqueMinimo: num(p.EstoqueMinimo), fotoUrl: p.FotoUrl, ativo: bool(p.Ativo)
  }));
}

export async function obterProduto(s: Sessao, id: number) {
  const p = await db().selectFrom('Produto').selectAll().where('Id', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!p) throw new NaoEncontradoError('Produto');
  return {
    id: p.Id, nome: p.Nome, categoriaId: p.CategoriaId, codigo: p.Codigo, custo: num(p.Custo), precoVenda: num(p.PrecoVenda),
    estoque: num(p.Estoque), estoqueMinimo: num(p.EstoqueMinimo), fotoUrl: p.FotoUrl, ativo: bool(p.Ativo)
  };
}

async function contarAtivos(s: Sessao) {
  const r = await db().selectFrom('Produto').select(eb => eb.fn.countAll<number>().as('n'))
    .where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1).executeTakeFirstOrThrow();
  return num(r.n);
}

/** Limite do plano Básico (50 produtos) checado aqui, no service. */
export async function salvarProduto(s: Sessao, id: number | null, dados: z.infer<typeof produtoSchema>, fotoUrl?: string | null): Promise<number> {
  const empresa = await obterEmpresa(s.empresaId);
  if (dados.categoriaId) {
    const cat = await db().selectFrom('Categoria').select('Id').where('Id', '=', dados.categoriaId).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
    if (!cat) throw new NaoEncontradoError('Categoria');
  }
  if (dados.codigo) {
    let q = db().selectFrom('Produto').select('Id').where('EmpresaId', '=', s.empresaId).where('Codigo', '=', dados.codigo);
    if (id) q = q.where('Id', '<>', id);
    if (await q.executeTakeFirst()) throw new RegraNegocioError('Já existe um produto com este código.');
  }
  const valores = {
    Nome: dados.nome, CategoriaId: dados.categoriaId, Codigo: dados.codigo ?? null, Custo: dados.custo, PrecoVenda: dados.precoVenda,
    Estoque: dados.estoque, EstoqueMinimo: dados.estoqueMinimo, ...(fotoUrl ? { FotoUrl: fotoUrl } : {})
  };
  if (!id) {
    if ((await contarAtivos(s)) >= empresa.limiteProdutos)
      throw new RegraNegocioError(`Seu plano permite até ${empresa.limiteProdutos} produtos ativos. Desative algum ou passe para o Pro.`);
    return inserir(db(), 'Produto', { ...valores, EmpresaId: s.empresaId, Ativo: 1, DataCadastro: agora() });
  }
  const r = await db().updateTable('Produto').set(valores).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!Number(r.numUpdatedRows)) throw new NaoEncontradoError('Produto');
  return id;
}

export async function alterarAtivoProduto(s: Sessao, id: number, ativo: boolean) {
  if (ativo) {
    const empresa = await obterEmpresa(s.empresaId);
    if ((await contarAtivos(s)) >= empresa.limiteProdutos) throw new RegraNegocioError(`Seu plano permite até ${empresa.limiteProdutos} produtos ativos.`);
  }
  await db().updateTable('Produto').set({ Ativo: bit(ativo) }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

/** Produto com venda registrada não é excluído, só desativado. Devolve true se excluiu. */
export async function excluirProduto(s: Sessao, id: number): Promise<boolean> {
  await obterProduto(s, id);
  const temVenda = await db().selectFrom('ItemVenda').select('Id').where('ProdutoId', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (temVenda) {
    await alterarAtivoProduto(s, id, false);
    return false;
  }
  await db().deleteFrom('Produto').where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
  return true;
}

export interface ProdutoVenda { id: number; nome: string; codigo: string | null; preco: number; custo: number | null; estoque: number; fotoUrl: string | null }

/** Busca do PDV por nome ou código. O custo só vai para o Dono (para mostrar o lucro da venda). */
export async function buscarProdutosVenda(s: Sessao, termo: string | null, limite = 60): Promise<ProdutoVenda[]> {
  let q = db().selectFrom('Produto').select(['Id', 'Nome', 'Codigo', 'PrecoVenda', 'Custo', 'Estoque', 'FotoUrl'])
    .where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1);
  if (termo?.trim()) {
    const t = termo.trim();
    q = q.where(eb => eb.or([eb('Nome', contem(), `%${t}%`), eb('Codigo', '=', t)]));
  }
  const linhas = await q.orderBy('Nome').offset(0).limit(limite).execute();
  return linhas.map(p => ({
    id: p.Id, nome: p.Nome, codigo: p.Codigo, preco: num(p.PrecoVenda), custo: s.perfil === 'DONO' ? num(p.Custo) : null,
    estoque: num(p.Estoque), fotoUrl: p.FotoUrl
  }));
}

// ======================= Categorias (T11) =======================

export interface CategoriaItem { id: number; nome: string; ativo: boolean; qtdProdutos: number }

export async function listarCategorias(s: Sessao, somenteAtivas = false): Promise<CategoriaItem[]> {
  let q = db().selectFrom('Categoria as c')
    .select(eb => ['c.Id', 'c.Nome', 'c.Ativo',
      eb.selectFrom('Produto as p').select(e => e.fn.countAll<number>().as('n')).whereRef('p.CategoriaId', '=', 'c.Id').where('p.Ativo', '=', 1).as('Qtd')])
    .where('c.EmpresaId', '=', s.empresaId);
  if (somenteAtivas) q = q.where('c.Ativo', '=', 1);
  const linhas = await q.orderBy('c.Ativo', 'desc').orderBy('c.Nome').execute();
  return linhas.map(c => ({ id: c.Id, nome: c.Nome, ativo: bool(c.Ativo), qtdProdutos: num(c.Qtd) }));
}

function validarNomeCategoria(nome: string) {
  const n = (nome ?? '').trim();
  if (!n) throw new RegraNegocioError('Informe o nome da categoria.');
  if (n.length > 60) throw new RegraNegocioError('O nome pode ter no máximo 60 caracteres.');
  return n;
}

async function nomeCategoriaEmUso(s: Sessao, nome: string, exceto?: number) {
  let q = db().selectFrom('Categoria').select('Id').where('EmpresaId', '=', s.empresaId).where('Nome', '=', nome);
  if (exceto) q = q.where('Id', '<>', exceto);
  return !!(await q.executeTakeFirst());
}

export async function criarCategoria(s: Sessao, nome: string) {
  const n = validarNomeCategoria(nome);
  if (await nomeCategoriaEmUso(s, n)) throw new RegraNegocioError('Já existe uma categoria com este nome.');
  await inserir(db(), 'Categoria', { EmpresaId: s.empresaId, Nome: n, Ativo: 1 });
}

export async function renomearCategoria(s: Sessao, id: number, nome: string) {
  const n = validarNomeCategoria(nome);
  if (await nomeCategoriaEmUso(s, n, id)) throw new RegraNegocioError('Já existe uma categoria com este nome.');
  await db().updateTable('Categoria').set({ Nome: n }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

export async function alterarAtivoCategoria(s: Sessao, id: number, ativo: boolean) {
  await db().updateTable('Categoria').set({ Ativo: bit(ativo) }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

// ======================= Formas de pagamento (T12) =======================

export interface FormaItem { id: number; tipo: TipoPagamento; nome: string; taxaPercentual: number; taxaFixa: number; ativo: boolean }

export async function listarFormas(s: Sessao, somenteAtivas = false): Promise<FormaItem[]> {
  let q = db().selectFrom('FormaPagamento').selectAll().where('EmpresaId', '=', s.empresaId);
  if (somenteAtivas) q = q.where('Ativo', '=', 1);
  const linhas = await q.orderBy('Ordem').orderBy('Nome').execute();
  return linhas.map(f => ({ id: f.Id, tipo: f.Tipo as TipoPagamento, nome: f.Nome, taxaPercentual: num(f.TaxaPercentual), taxaFixa: num(f.TaxaFixa), ativo: bool(f.Ativo) }));
}

async function proximaOrdem(s: Sessao) {
  const r = await db().selectFrom('FormaPagamento').select(eb => eb.fn.max('Ordem').as('m')).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  return num(r?.m) + 1;
}

export async function salvarForma(s: Sessao, dados: z.infer<typeof formaPagamentoSchema>) {
  let q = db().selectFrom('FormaPagamento').select('Id').where('EmpresaId', '=', s.empresaId).where('Nome', '=', dados.nome);
  if (dados.id) q = q.where('Id', '<>', dados.id);
  if (await q.executeTakeFirst()) throw new RegraNegocioError('Já existe uma forma de pagamento com este nome.');
  const valores = { Tipo: dados.tipo, Nome: dados.nome, TaxaPercentual: dados.taxaPercentual, TaxaFixa: dados.taxaFixa, Ativo: bit(dados.ativo) };
  if (!dados.id) {
    await inserir(db(), 'FormaPagamento', { ...valores, EmpresaId: s.empresaId, Ordem: await proximaOrdem(s) });
    return;
  }
  await db().updateTable('FormaPagamento').set(valores).where('Id', '=', dados.id).where('EmpresaId', '=', s.empresaId).execute();
}

export async function alterarAtivoForma(s: Sessao, id: number, ativo: boolean) {
  await db().updateTable('FormaPagamento').set({ Ativo: bit(ativo) }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

/** Crédito parcelado vira uma forma por faixa (ex.: "Crédito 2–6x", "Crédito 7–12x"). */
export async function criarFaixasCredito(s: Sessao) {
  const existentes = (await listarFormas(s)).map(f => f.nome);
  await db().updateTable('FormaPagamento').set({ Nome: 'Crédito 1x' })
    .where('EmpresaId', '=', s.empresaId).where('Tipo', '=', 'CREDITO').where('Nome', '=', 'Crédito').execute();
  let ordem = await proximaOrdem(s);
  for (const faixa of ['Crédito 2–6x', 'Crédito 7–12x'].filter(f => !existentes.includes(f)))
    await inserir(db(), 'FormaPagamento', { EmpresaId: s.empresaId, Tipo: 'CREDITO', Nome: faixa, TaxaPercentual: 0, TaxaFixa: 0, Ativo: 1, Ordem: ordem++ });
}

// ======================= Clientes (T13) =======================

export interface ClienteLista { id: number; nome: string; telefone: string | null; totalDevido: number; totalAtrasado: number }

export async function listarClientes(s: Sessao, busca?: string): Promise<ClienteLista[]> {
  let q = db().selectFrom('Cliente').select(['Id', 'Nome', 'Telefone']).where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1);
  if (busca?.trim()) {
    const b = busca.trim();
    const d = soDigitos(b);
    q = q.where(eb => eb.or([eb('Nome', contem(), `%${b}%`), ...(d ? [eb('Telefone', 'like', `%${d}%`)] : [])]));
  }
  const clientes = await q.orderBy('Nome').offset(0).limit(500).execute();
  const devidos = await db().selectFrom('vw_ParcelasCrediario').select(['ClienteId', 'Valor', 'Situacao'])
    .where('EmpresaId', '=', s.empresaId).where('Situacao', '<>', 'PAGA').execute();
  return clientes.map(c => {
    const meus = devidos.filter(d => d.ClienteId === c.Id);
    return {
      id: c.Id, nome: c.Nome, telefone: c.Telefone,
      totalDevido: soma(meus.map(d => num(d.Valor))),
      totalAtrasado: soma(meus.filter(d => d.Situacao === 'ATRASADA').map(d => num(d.Valor)))
    };
  });
}

/** Busca rápida do PDV. */
export async function buscarClientes(s: Sessao, termo: string) {
  const lista = await listarClientes(s, termo);
  return lista.slice(0, 15).map(c => ({ id: c.id, nome: c.nome, telefone: c.telefone }));
}

export async function obterCliente(s: Sessao, id: number) {
  const c = await db().selectFrom('Cliente').selectAll().where('Id', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!c) throw new NaoEncontradoError('Cliente');
  return { id: c.Id, nome: c.Nome, telefone: c.Telefone, documento: c.Documento, observacao: c.Observacao, ativo: bool(c.Ativo) };
}

export async function salvarCliente(s: Sessao, id: number | null, dados: z.infer<typeof clienteSchema>) {
  const valores = { Nome: dados.nome, Telefone: soDigitos(dados.telefone), Documento: soDigitos(dados.documento), Observacao: dados.observacao ?? null };
  if (!id) {
    const novoId = await inserir(db(), 'Cliente', { ...valores, EmpresaId: s.empresaId, Ativo: 1, DataCadastro: agora() });
    return { id: novoId, nome: valores.Nome, telefone: valores.Telefone };
  }
  await obterCliente(s, id);
  await db().updateTable('Cliente').set(valores).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
  return { id, nome: valores.Nome, telefone: valores.Telefone };
}

export async function desativarCliente(s: Sessao, id: number) {
  const aberta = await db().selectFrom('vw_ParcelasCrediario').select('Id')
    .where('EmpresaId', '=', s.empresaId).where('ClienteId', '=', id).where('Situacao', '<>', 'PAGA').executeTakeFirst();
  if (aberta) throw new RegraNegocioError('Este cliente ainda tem parcelas em aberto no crediário.');
  await db().updateTable('Cliente').set({ Ativo: 0 }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

export const soma = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
export const dataOuNula = (v: unknown) => (v == null ? null : lerData(v));
