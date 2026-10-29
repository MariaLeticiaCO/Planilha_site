import 'server-only';
import { db, num, provedor, sql } from './conexao';
import { hoje, lerData } from '@/domain/datas';

export interface Resumo {
  qtdVendas: number;
  faturamento: number;
  taxas: number;
  custo: number;
  lucro: number;
  ticketMedio: number;
  aReceber: number;
  atrasado: number;
}
export interface PontoBruto { periodo: string; faturamento: number; lucro: number }
export interface FormaDashboard { nome: string; qtd: number; total: number; taxas: number }
export interface RankingProduto { id: number; nome: string; qtd: number; total: number; estoque: number }
export type Agrupamento = 'HORA' | 'DIA' | 'MES';

/**
 * Consultas do dashboard. No SQL Server chamam as 4 procedures do documento
 * (sp_Dashboard_Resumo, _Serie, _FormasPagamento, _RankingProdutos), todas com @EmpresaId, @Inicio e @Fim.
 * No SQLite (demonstração) fazem a mesma conta em TypeScript.
 * O intervalo é [inicio, fim).
 */
export async function resumo(empresaId: number, inicio: string, fim: string): Promise<Resumo> {
  if (provedor === 'mssql') {
    const r = await sql<Record<string, unknown>>`EXEC dbo.sp_Dashboard_Resumo @EmpresaId = ${empresaId}, @Inicio = ${inicio}, @Fim = ${fim}`.execute(db());
    const l = r.rows[0] ?? {};
    return {
      qtdVendas: num(l.QtdVendas), faturamento: num(l.Faturamento), taxas: num(l.Taxas), custo: num(l.Custo),
      lucro: num(l.Lucro), ticketMedio: num(l.TicketMedio), aReceber: num(l.AReceber), atrasado: num(l.Atrasado)
    };
  }
  const vendas = await vendasPeriodo(empresaId, inicio, fim);
  const abertas = await db().selectFrom('ParcelaCrediario').select(['Valor', 'DataVencimento'])
    .where('EmpresaId', '=', empresaId).where('Status', '=', 'ABERTA').execute();
  const h = hoje();
  const faturamento = soma(vendas.map(v => v.liquido));
  return {
    qtdVendas: vendas.length,
    faturamento,
    taxas: soma(vendas.map(v => v.taxa)),
    custo: soma(vendas.map(v => v.custo)),
    lucro: soma(vendas.map(v => v.lucro)),
    ticketMedio: vendas.length ? Math.round((faturamento / vendas.length) * 100) / 100 : 0,
    aReceber: soma(abertas.map(p => num(p.Valor))),
    atrasado: soma(abertas.filter(p => lerData(p.DataVencimento).slice(0, 10) < h).map(p => num(p.Valor)))
  };
}

export async function serie(empresaId: number, inicio: string, fim: string, agrupamento: Agrupamento): Promise<PontoBruto[]> {
  if (provedor === 'mssql') {
    const r = await sql<Record<string, unknown>>`EXEC dbo.sp_Dashboard_Serie @EmpresaId = ${empresaId}, @Inicio = ${inicio}, @Fim = ${fim}, @Agrupamento = ${agrupamento}`.execute(db());
    return r.rows.map(l => ({ periodo: lerData(l.Periodo), faturamento: num(l.Faturamento), lucro: num(l.Lucro) }));
  }
  const grupos = new Map<string, PontoBruto>();
  for (const v of await vendasPeriodo(empresaId, inicio, fim)) {
    const chave = agrupamento === 'HORA' ? `${v.data.slice(0, 13)}:00:00` : agrupamento === 'MES' ? `${v.data.slice(0, 7)}-01 00:00:00` : `${v.data.slice(0, 10)} 00:00:00`;
    const g = grupos.get(chave) ?? { periodo: chave, faturamento: 0, lucro: 0 };
    g.faturamento += v.liquido;
    g.lucro += v.lucro;
    grupos.set(chave, g);
  }
  return [...grupos.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export async function formasPagamento(empresaId: number, inicio: string, fim: string): Promise<FormaDashboard[]> {
  if (provedor === 'mssql') {
    const r = await sql<Record<string, unknown>>`EXEC dbo.sp_Dashboard_FormasPagamento @EmpresaId = ${empresaId}, @Inicio = ${inicio}, @Fim = ${fim}`.execute(db());
    return r.rows.map(l => ({ nome: String(l.Nome), qtd: num(l.Qtd), total: num(l.Total), taxas: num(l.Taxas) }));
  }
  const grupos = new Map<string, FormaDashboard>();
  for (const v of await vendasPeriodo(empresaId, inicio, fim)) {
    const g = grupos.get(v.forma) ?? { nome: v.forma, qtd: 0, total: 0, taxas: 0 };
    g.qtd++;
    g.total += v.liquido;
    g.taxas += v.taxa;
    grupos.set(v.forma, g);
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total);
}

export async function rankingProdutos(empresaId: number, inicio: string, fim: string, top: number, ordem: 'MAIS' | 'MENOS'): Promise<RankingProduto[]> {
  if (provedor === 'mssql') {
    const r = await sql<Record<string, unknown>>`EXEC dbo.sp_Dashboard_RankingProdutos @EmpresaId = ${empresaId}, @Inicio = ${inicio}, @Fim = ${fim}, @Top = ${top}, @Ordem = ${ordem}`.execute(db());
    return r.rows.map(l => ({ id: num(l.Id), nome: String(l.Nome), qtd: num(l.Qtd), total: num(l.Total), estoque: num(l.Estoque) }));
  }
  const itens = await db().selectFrom('ItemVenda as i').innerJoin('Venda as v', 'v.Id', 'i.VendaId')
    .select(['i.ProdutoId', 'i.Quantidade', 'i.PrecoUnitario'])
    .where('v.EmpresaId', '=', empresaId).where('v.Status', '=', 'CONCLUIDA')
    .where('v.DataVenda', '>=', inicio).where('v.DataVenda', '<', fim).execute();
  const vendidos = new Map<number, { qtd: number; total: number }>();
  for (const i of itens) {
    const g = vendidos.get(i.ProdutoId) ?? { qtd: 0, total: 0 };
    g.qtd += num(i.Quantidade);
    g.total += num(i.Quantidade) * num(i.PrecoUnitario);
    vendidos.set(i.ProdutoId, g);
  }
  const produtos = await db().selectFrom('Produto').select(['Id', 'Nome', 'Estoque', 'Ativo']).where('EmpresaId', '=', empresaId).execute();
  const lista = produtos
    .filter(p => Number(p.Ativo) === 1 || vendidos.has(p.Id))
    .map(p => ({ id: p.Id, nome: p.Nome, qtd: vendidos.get(p.Id)?.qtd ?? 0, total: vendidos.get(p.Id)?.total ?? 0, estoque: num(p.Estoque) }));
  lista.sort(ordem === 'MENOS'
    ? (a, b) => a.qtd - b.qtd || b.estoque - a.estoque || a.nome.localeCompare(b.nome)
    : (a, b) => b.qtd - a.qtd || a.nome.localeCompare(b.nome));
  return lista.slice(0, top);
}

async function vendasPeriodo(empresaId: number, inicio: string, fim: string) {
  const linhas = await db().selectFrom('Venda as v').innerJoin('FormaPagamento as f', 'f.Id', 'v.FormaPagamentoId')
    .select(['v.DataVenda', 'v.ValorLiquido', 'v.ValorTaxa', 'v.CustoTotal', 'v.Lucro', 'f.Nome'])
    .where('v.EmpresaId', '=', empresaId).where('v.Status', '=', 'CONCLUIDA')
    .where('v.DataVenda', '>=', inicio).where('v.DataVenda', '<', fim).execute();
  return linhas.map(l => ({
    data: lerData(l.DataVenda), liquido: num(l.ValorLiquido), taxa: num(l.ValorTaxa), custo: num(l.CustoTotal), lucro: num(l.Lucro), forma: l.Nome
  }));
}

const soma = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
