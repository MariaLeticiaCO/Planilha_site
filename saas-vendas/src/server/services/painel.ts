import 'server-only';
import { db, num } from '../db/conexao';
import { agora, deDate, nomeMes, paraDate, somarDias, somarMeses } from '@/domain/datas';
import type { Sessao } from '../sessao';
import { formasPagamento, rankingProdutos, resumo, serie, type Agrupamento, type PontoBruto } from '../db/dashboard';

export type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado';

/** Converte o filtro em intervalo [início, fim) e escolhe o agrupamento do gráfico. */
export function calcularPeriodo(periodo: string | null, inicio: string | null, fim: string | null, a: string) {
  const h = a.slice(0, 10);
  const [ano, mes] = h.split('-').map(Number);
  switch (periodo) {
    case 'semana': {
      const diaSemana = paraDate(h).getUTCDay();
      const segunda = somarDias(h, -((diaSemana + 6) % 7));
      const domingo = somarDias(segunda, 6);
      return { chave: 'semana' as Periodo, inicio: segunda, fim: somarDias(segunda, 7), agrupamento: 'DIA' as Agrupamento,
        texto: `Semana de ${segunda.slice(8, 10)}/${segunda.slice(5, 7)} a ${domingo.slice(8, 10)}/${domingo.slice(5, 7)}` };
    }
    case 'mes': {
      const primeiro = `${h.slice(0, 7)}-01`;
      const nome = nomeMes(mes);
      return { chave: 'mes' as Periodo, inicio: primeiro, fim: somarMeses(primeiro, 1), agrupamento: 'DIA' as Agrupamento,
        texto: `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}` };
    }
    case 'ano':
      return { chave: 'ano' as Periodo, inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01`, agrupamento: 'MES' as Agrupamento, texto: `Ano de ${ano}` };
    case 'personalizado':
      if (inicio && fim && /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fim)) {
        let [de, ate] = [inicio, fim];
        if (ate < de) [de, ate] = [ate, de];
        const fimExclusivo = somarDias(ate, 1);
        const dias = (paraDate(fimExclusivo).getTime() - paraDate(de).getTime()) / 86_400_000;
        return { chave: 'personalizado' as Periodo, inicio: de, fim: fimExclusivo,
          agrupamento: (dias <= 1 ? 'HORA' : dias <= 62 ? 'DIA' : 'MES') as Agrupamento,
          texto: `${de.split('-').reverse().join('/')} a ${ate.split('-').reverse().join('/')}` };
      }
    // eslint-disable-next-line no-fallthrough
    default:
      return { chave: 'hoje' as Periodo, inicio: h, fim: somarDias(h, 1), agrupamento: 'HORA' as Agrupamento,
        texto: `Hoje, ${Number(h.slice(8, 10))} de ${nomeMes(mes)}` };
  }
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Completa com zero os períodos sem venda e gera os rótulos. */
export function preencherSerie(bruta: PontoBruto[], inicio: string, fim: string, agrupamento: Agrupamento) {
  const chave = (d: string) => (agrupamento === 'HORA' ? d.slice(0, 13) : agrupamento === 'MES' ? d.slice(0, 7) : d.slice(0, 10));
  const mapa = new Map<string, { faturamento: number; lucro: number }>();
  for (const p of bruta) {
    const g = mapa.get(chave(p.periodo)) ?? { faturamento: 0, lucro: 0 };
    g.faturamento += p.faturamento;
    g.lucro += p.lucro;
    mapa.set(chave(p.periodo), g);
  }
  const pontos: { rotulo: string; faturamento: number; lucro: number }[] = [];
  let atual = paraDate(agrupamento === 'MES' ? `${inicio.slice(0, 7)}-01` : inicio.slice(0, 10));
  const limite = paraDate(fim.length === 10 ? fim : fim.slice(0, 19));
  do {
    const t = deDate(atual);
    const v = mapa.get(chave(t)) ?? { faturamento: 0, lucro: 0 };
    const rotulo = agrupamento === 'HORA' ? `${t.slice(11, 13)}h` : agrupamento === 'MES' ? `${MESES_CURTOS[atual.getUTCMonth()]}/${t.slice(2, 4)}` : `${t.slice(8, 10)}/${t.slice(5, 7)}`;
    pontos.push({ rotulo, faturamento: Math.round(v.faturamento * 100) / 100, lucro: Math.round(v.lucro * 100) / 100 });
    if (agrupamento === 'HORA') atual = new Date(atual.getTime() + 3_600_000);
    else if (agrupamento === 'MES') atual.setUTCMonth(atual.getUTCMonth() + 1);
    else atual.setUTCDate(atual.getUTCDate() + 1);
  } while (atual < limite && pontos.length < 400);
  return pontos;
}

/** JSON de /painel/dados: cards, série, pizza e rankings. */
export async function dadosPainel(s: Sessao, periodo: string | null, inicio: string | null, fim: string | null) {
  const a = agora();
  const p = calcularPeriodo(periodo, inicio, fim, a);
  const de = `${p.inicio} 00:00:00`;
  const ate = `${p.fim} 00:00:00`;
  const [r, bruta, formas, mais, menos, estoqueBaixo] = await Promise.all([
    resumo(s.empresaId, de, ate),
    serie(s.empresaId, de, ate, p.agrupamento),
    formasPagamento(s.empresaId, de, ate),
    rankingProdutos(s.empresaId, de, ate, 5, 'MAIS'),
    rankingProdutos(s.empresaId, de, ate, 5, 'MENOS'),
    db().selectFrom('Produto').select(['Id', 'Nome', 'Estoque', 'EstoqueMinimo'])
      .where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1).whereRef('Estoque', '<=', 'EstoqueMinimo')
      .orderBy('Estoque').orderBy('Nome').offset(0).limit(10).execute()
  ]);
  const maisVendidos = mais.filter(m => m.qtd > 0);
  const ids = new Set(maisVendidos.map(m => m.id));
  const limiteSerie = p.chave === 'personalizado' || ate < a ? ate : a;
  return {
    periodo: p.chave,
    periodoTexto: p.texto,
    inicio: p.inicio,
    fim: somarDias(p.fim, -1),
    resumo: r,
    serie: preencherSerie(bruta, de, limiteSerie, p.agrupamento),
    formas,
    totalTaxas: Math.round(formas.reduce((t, f) => t + f.taxas, 0) * 100) / 100,
    maisVendidos,
    menosVendidos: menos.filter(m => !ids.has(m.id)),
    estoqueBaixo: estoqueBaixo.map(e => ({ id: e.Id, nome: e.Nome, estoque: num(e.Estoque), estoqueMinimo: num(e.EstoqueMinimo) }))
  };
}

export type DadosPainel = Awaited<ReturnType<typeof dadosPainel>>;
