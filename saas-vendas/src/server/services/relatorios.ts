import 'server-only';
import { db, num } from '../db/conexao';
import { formatarData, hoje, lerData, somarDias } from '@/domain/datas';
import { formatarTelefone } from '@/domain/formatos';
import type { Sessao } from '../sessao';
import { devedores } from './crediario';

export type TipoColuna = 'texto' | 'numero' | 'moeda' | 'percentual';
export interface Coluna { titulo: string; tipo: TipoColuna }
export type Valor = string | number | null;

/** Relatório tabular: a mesma estrutura alimenta a tela, o PDF e o Excel. */
export interface Relatorio { tipo: string; titulo: string; subtitulo: string; colunas: Coluna[]; linhas: Valor[][]; totais: Valor[] | null }

export const TIPOS_RELATORIO = [
  { chave: 'vendas', nome: 'Vendas por período', descricao: 'Faturamento, taxas, custo e lucro dia a dia.' },
  { chave: 'lucro-produto', nome: 'Lucro por produto', descricao: 'Quanto cada produto vendeu e deixou de lucro.' },
  { chave: 'lucro-categoria', nome: 'Lucro por categoria', descricao: 'O mesmo, somado por categoria.' },
  { chave: 'curva-abc', nome: 'Curva ABC', descricao: 'Os produtos que fazem 80% (A), 15% (B) e 5% (C) do faturamento.' },
  { chave: 'crediario-cliente', nome: 'Crediário por cliente', descricao: 'Quem deve, quanto está atrasado e o próximo vencimento.' }
] as const;

const c = (titulo: string, tipo: TipoColuna = 'texto'): Coluna => ({ titulo, tipo });
const r2 = (n: number) => Math.round(n * 100) / 100;
const margem = (fat: number, custo: number) => (fat === 0 ? 0 : Math.round(((fat - custo) / fat) * 1000) / 10);

export async function gerarRelatorio(s: Sessao, tipo: string, inicio: string, fim: string): Promise<Relatorio> {
  const de = `${inicio} 00:00:00`;
  const ate = `${somarDias(fim, 1)} 00:00:00`;
  const sub = `${formatarData(inicio)} a ${formatarData(fim)}`;

  if (tipo === 'crediario-cliente') {
    const lista = await devedores(s);
    return {
      tipo, titulo: 'Crediário por cliente', subtitulo: `Posição em ${formatarData(hoje())}`,
      colunas: [c('Cliente'), c('Telefone'), c('Parcelas', 'numero'), c('Total devido', 'moeda'), c('Atrasado', 'moeda'), c('Próx. vencimento')],
      linhas: lista.map(d => [d.cliente, formatarTelefone(d.telefone), d.qtdParcelas, d.totalDevido, d.atrasado, formatarData(d.proximoVencimento)]),
      totais: ['Total', '', lista.reduce((t, d) => t + d.qtdParcelas, 0), r2(lista.reduce((t, d) => t + d.totalDevido, 0)), r2(lista.reduce((t, d) => t + d.atrasado, 0)), '']
    };
  }

  if (tipo === 'vendas' || !TIPOS_RELATORIO.some(t => t.chave === tipo)) {
    const vendas = await db().selectFrom('Venda').select(['DataVenda', 'ValorLiquido', 'ValorTaxa', 'CustoTotal', 'Lucro'])
      .where('EmpresaId', '=', s.empresaId).where('Status', '=', 'CONCLUIDA').where('DataVenda', '>=', de).where('DataVenda', '<', ate).execute();
    const dias = new Map<string, number[]>();
    for (const v of vendas) {
      const d = lerData(v.DataVenda).slice(0, 10);
      const g = dias.get(d) ?? [0, 0, 0, 0, 0];
      g[0]++; g[1] += num(v.ValorLiquido); g[2] += num(v.ValorTaxa); g[3] += num(v.CustoTotal); g[4] += num(v.Lucro);
      dias.set(d, g);
    }
    const linhas = [...dias.entries()].sort().map(([d, g]) => [formatarData(d), g[0], r2(g[1]), r2(g[2]), r2(g[3]), r2(g[4])]);
    const tot = [...dias.values()].reduce((a, g) => a.map((x, i) => x + g[i]), [0, 0, 0, 0, 0]);
    return {
      tipo: 'vendas', titulo: 'Vendas por período', subtitulo: sub,
      colunas: [c('Data'), c('Vendas', 'numero'), c('Faturamento', 'moeda'), c('Taxas', 'moeda'), c('Custo', 'moeda'), c('Lucro', 'moeda')],
      linhas, totais: ['Total', tot[0], r2(tot[1]), r2(tot[2]), r2(tot[3]), r2(tot[4])]
    };
  }

  const itens = (await db().selectFrom('ItemVenda as i').innerJoin('Venda as v', 'v.Id', 'i.VendaId').innerJoin('Produto as p', 'p.Id', 'i.ProdutoId')
    .leftJoin('Categoria as cat', 'cat.Id', 'p.CategoriaId')
    .select(['i.ProdutoId', 'p.Nome as Produto', 'cat.Nome as Categoria', 'i.Quantidade', 'i.PrecoUnitario', 'i.CustoUnitario'])
    .where('i.EmpresaId', '=', s.empresaId).where('v.Status', '=', 'CONCLUIDA').where('v.DataVenda', '>=', de).where('v.DataVenda', '<', ate).execute())
    .map(i => ({ chaveProduto: String(i.ProdutoId), produto: i.Produto, categoria: i.Categoria ?? 'Sem categoria', qtd: num(i.Quantidade),
      fat: num(i.Quantidade) * num(i.PrecoUnitario), custo: num(i.Quantidade) * num(i.CustoUnitario) }));

  const agrupar = (chave: (i: (typeof itens)[number]) => string, nome: (i: (typeof itens)[number]) => string) => {
    const m = new Map<string, { nome: string; qtd: number; fat: number; custo: number }>();
    for (const i of itens) {
      const g = m.get(chave(i)) ?? { nome: nome(i), qtd: 0, fat: 0, custo: 0 };
      g.qtd += i.qtd; g.fat += i.fat; g.custo += i.custo;
      m.set(chave(i), g);
    }
    return [...m.values()];
  };
  const fat = r2(itens.reduce((t, i) => t + i.fat, 0));
  const custo = r2(itens.reduce((t, i) => t + i.custo, 0));
  const qtd = itens.reduce((t, i) => t + i.qtd, 0);

  if (tipo === 'curva-abc') {
    let acumulado = 0;
    const linhas = agrupar(i => i.chaveProduto, i => i.produto).sort((a, b) => b.fat - a.fat).map(p => {
      const part = fat === 0 ? 0 : (p.fat / fat) * 100;
      const antes = acumulado;
      acumulado += part;
      return [antes < 80 ? 'A' : antes < 95 ? 'B' : 'C', p.nome, p.qtd, r2(p.fat), Math.round(part * 10) / 10, Math.round(acumulado * 10) / 10];
    });
    return {
      tipo, titulo: 'Curva ABC de produtos', subtitulo: sub,
      colunas: [c('Classe'), c('Produto'), c('Qtd', 'numero'), c('Faturamento', 'moeda'), c('% do total', 'percentual'), c('% acumulado', 'percentual')],
      linhas, totais: ['', 'Total', qtd, fat, fat === 0 ? 0 : 100, null]
    };
  }

  const porCategoria = tipo === 'lucro-categoria';
  const linhas = agrupar(porCategoria ? i => i.categoria : i => i.chaveProduto, porCategoria ? i => i.categoria : i => i.produto)
    .sort((a, b) => b.fat - b.custo - (a.fat - a.custo))
    .map(g => [g.nome, g.qtd, r2(g.fat), r2(g.custo), r2(g.fat - g.custo), margem(g.fat, g.custo)]);
  return {
    tipo, titulo: porCategoria ? 'Lucro por categoria' : 'Lucro por produto', subtitulo: `${sub} · lucro antes de taxas e descontos`,
    colunas: [c(porCategoria ? 'Categoria' : 'Produto'), c('Qtd', 'numero'), c('Faturamento', 'moeda'), c('Custo', 'moeda'), c('Lucro', 'moeda'), c('Margem', 'percentual')],
    linhas, totais: ['Total', qtd, fat, custo, r2(fat - custo), margem(fat, custo)]
  };
}
