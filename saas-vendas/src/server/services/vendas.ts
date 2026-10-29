import 'server-only';
import { db, bool, inserir, num, sql } from '../db/conexao';
import { agora, formatarDataHora, formatarData, hoje, lerData, somarDias, diferencaDias } from '@/domain/datas';
import { arredondar, calcularLucro, calcularTaxa, descontoPercentualEmReais } from '@/domain/calculadora';
import { gerarParcelas, INTERVALO_DIAS, type ParcelaGerada } from '@/domain/parcelas';
import { formatarMoeda, linkWhatsApp } from '@/domain/formatos';
import { NaoEncontradoError, RecursoProError, RegraNegocioError, type StatusVenda } from '@/domain/tipos';
import type { NovaVenda } from '@/domain/validacao';
import type { Sessao } from '../sessao';
import { obterEmpresa } from '../contexto';
import { dataOuNula, soma } from './cadastros';

export const ITENS_POR_PAGINA = 20;

export interface VendaRegistrada { vendaId: number; total: number; lucro: number | null; avisos: string[]; linkRecibo: string }

/**
 * Registra a venda: calcula taxa, custo e lucro no servidor, gera as parcelas do crediário e baixa o estoque,
 * tudo numa única transação (ou tudo grava, ou nada grava).
 */
export async function registrarVenda(s: Sessao, dto: NovaVenda): Promise<VendaRegistrada> {
  const empresa = await obterEmpresa(s.empresaId);
  const a = agora();
  if (!empresa.assinaturaAtiva) throw new RegraNegocioError('Seu teste ou assinatura venceu. Renove para registrar vendas novas.');

  // 1. Pelo menos 1 item (itens repetidos são somados)
  const agrupados = new Map<number, number>();
  for (const i of dto.itens) if (i.quantidade > 0) agrupados.set(i.produtoId, (agrupados.get(i.produtoId) ?? 0) + i.quantidade);
  if (!agrupados.size) throw new RegraNegocioError('Adicione pelo menos 1 produto à venda.');

  // 1. Forma de pagamento ativa
  const forma = await db().selectFrom('FormaPagamento').selectAll()
    .where('Id', '=', dto.formaPagamentoId).where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1).executeTakeFirst();
  if (!forma) throw new RegraNegocioError('Escolha uma forma de pagamento ativa.');

  const ids = [...agrupados.keys()];
  const produtos = await db().selectFrom('Produto').selectAll().where('EmpresaId', '=', s.empresaId).where('Id', 'in', ids).execute();
  if (produtos.length !== ids.length || produtos.some(p => !bool(p.Ativo)))
    throw new RegraNegocioError('Um dos produtos do carrinho não está mais disponível.');
  const porId = new Map(produtos.map(p => [p.Id, p]));

  // 3. Preço e custo do momento da venda (nunca vêm da tela)
  const itens = ids.map(id => {
    const p = porId.get(id)!;
    return { produtoId: id, nome: p.Nome, quantidade: agrupados.get(id)!, preco: num(p.PrecoVenda), custo: num(p.Custo), estoque: num(p.Estoque), minimo: num(p.EstoqueMinimo) };
  });
  const bruto = arredondar(itens.reduce((t, i) => t + i.quantidade * i.preco, 0));
  const custo = arredondar(itens.reduce((t, i) => t + i.quantidade * i.custo, 0));

  // 2. Desconto não pode ser maior que o valor bruto
  const desconto = dto.descontoEmPercentual ? descontoPercentualEmReais(bruto, dto.desconto) : arredondar(dto.desconto);
  if (desconto > bruto) throw new RegraNegocioError('O desconto não pode ser maior que o valor da venda.');
  const taxa = calcularTaxa(bruto, desconto, num(forma.TaxaPercentual), num(forma.TaxaFixa));
  const lucro = calcularLucro(bruto, desconto, taxa, custo);
  const liquido = arredondar(bruto - desconto);

  let cliente: { Id: number; Telefone: string | null } | undefined;
  if (dto.clienteId) {
    cliente = await db().selectFrom('Cliente').select(['Id', 'Telefone']).where('Id', '=', dto.clienteId).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
    if (!cliente) throw new NaoEncontradoError('Cliente');
  }

  // Crediário: exige cliente; parcelas automáticas
  let parcelas: ParcelaGerada[] = [];
  if (forma.Tipo === 'CREDIARIO') {
    if (!empresa.temRecursosPro) throw new RecursoProError('O crediário');
    if (!cliente) throw new RegraNegocioError('Venda no crediário exige um cliente.');
    const primeiro = dto.primeiroVencimento ?? somarDias(hoje(), INTERVALO_DIAS);
    if (primeiro < hoje()) throw new RegraNegocioError('O 1º vencimento não pode ser no passado.');
    parcelas = gerarParcelas(liquido, dto.qtdParcelas, primeiro);
  }

  // 7. Estoque negativo gera aviso, mas não bloqueia (configurável)
  const avisos: string[] = [];
  for (const i of itens) {
    const resta = i.estoque - i.quantidade;
    if (resta < 0) {
      if (!empresa.permitirEstoqueNegativo) throw new RegraNegocioError(`Estoque insuficiente de "${i.nome}" (tem ${i.estoque}).`);
      avisos.push(`"${i.nome}" ficou com estoque negativo (${resta}).`);
    } else if (resta <= i.minimo) {
      avisos.push(`"${i.nome}" chegou ao estoque mínimo (${resta}).`);
    }
  }

  // 4 e 5. Venda, itens, parcelas e baixa de estoque numa única transação
  const vendaId = await db().transaction().execute(async trx => {
    const id = await inserir(trx, 'Venda', {
      EmpresaId: s.empresaId, UsuarioId: s.usuarioId, ClienteId: cliente?.Id ?? null, FormaPagamentoId: forma.Id,
      DataVenda: a, ValorBruto: bruto, Desconto: desconto, ValorTaxa: taxa, CustoTotal: custo, Status: 'CONCLUIDA',
      Observacao: dto.observacao?.trim() || null
    });
    for (const i of itens) {
      await inserir(trx, 'ItemVenda', {
        EmpresaId: s.empresaId, VendaId: id, ProdutoId: i.produtoId, Quantidade: i.quantidade, PrecoUnitario: i.preco, CustoUnitario: i.custo
      });
      await trx.updateTable('Produto').set({ Estoque: sql`Estoque - ${i.quantidade}` })
        .where('Id', '=', i.produtoId).where('EmpresaId', '=', s.empresaId).execute();
    }
    for (const p of parcelas) {
      await inserir(trx, 'ParcelaCrediario', {
        EmpresaId: s.empresaId, VendaId: id, ClienteId: cliente!.Id, Numero: p.numero, TotalParcelas: parcelas.length,
        Valor: p.valor, DataVencimento: p.vencimento, Status: 'ABERTA'
      });
    }
    return id;
  });

  const recibo = montarRecibo(empresa.nome, vendaId, a, itens.map(i => ({ nome: i.nome, qtd: i.quantidade, preco: i.preco })), bruto, desconto, forma.Nome, parcelas);
  return { vendaId, total: liquido, lucro: s.perfil === 'DONO' ? lucro : null, avisos, linkRecibo: linkWhatsApp(cliente?.Telefone, recibo) };
}

export interface VendaLista {
  id: number; dataVenda: string; cliente: string | null; formaPagamento: string; total: number; lucro: number | null; status: StatusVenda; vendedor: string;
}

export interface FiltroVendas { inicio?: string; fim?: string; formaPagamentoId?: number | null; status?: StatusVenda | null; pagina?: number; clienteId?: number }

function consultaVendas(s: Sessao) {
  let q = db().selectFrom('Venda as v')
    .innerJoin('FormaPagamento as f', 'f.Id', 'v.FormaPagamentoId')
    .innerJoin('Usuario as u', 'u.Id', 'v.UsuarioId')
    .leftJoin('Cliente as c', 'c.Id', 'v.ClienteId')
    .where('v.EmpresaId', '=', s.empresaId);
  // O Vendedor só enxerga as próprias vendas.
  if (s.perfil !== 'DONO') q = q.where('v.UsuarioId', '=', s.usuarioId);
  return q;
}

const mapearVenda = (s: Sessao) => (v: { Id: number; DataVenda: unknown; Cliente: string | null; Forma: string; ValorLiquido: number; Lucro: number; Status: string; Vendedor: string }): VendaLista => ({
  id: v.Id, dataVenda: lerData(v.DataVenda), cliente: v.Cliente, formaPagamento: v.Forma, total: num(v.ValorLiquido),
  lucro: s.perfil === 'DONO' ? num(v.Lucro) : null, status: v.Status as StatusVenda, vendedor: v.Vendedor
});

export async function listarVendas(s: Sessao, filtro: FiltroVendas) {
  let q = consultaVendas(s);
  if (filtro.inicio) q = q.where('v.DataVenda', '>=', `${filtro.inicio} 00:00:00`);
  if (filtro.fim) q = q.where('v.DataVenda', '<', `${somarDias(filtro.fim, 1)} 00:00:00`);
  if (filtro.formaPagamentoId) q = q.where('v.FormaPagamentoId', '=', filtro.formaPagamentoId);
  if (filtro.status) q = q.where('v.Status', '=', filtro.status);
  if (filtro.clienteId) q = q.where('v.ClienteId', '=', filtro.clienteId);

  const total = num((await q.select(eb => eb.fn.countAll<number>().as('n')).executeTakeFirstOrThrow()).n);
  const totalPaginas = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  const pagina = Math.min(Math.max(1, filtro.pagina ?? 1), totalPaginas);
  const linhas = await q
    .select(['v.Id', 'v.DataVenda', 'c.Nome as Cliente', 'f.Nome as Forma', 'v.ValorLiquido', 'v.Lucro', 'v.Status', 'u.Nome as Vendedor'])
    .orderBy('v.DataVenda', 'desc').orderBy('v.Id', 'desc')
    .offset((pagina - 1) * ITENS_POR_PAGINA).limit(ITENS_POR_PAGINA).execute();
  return { itens: linhas.map(mapearVenda(s)), pagina, totalPaginas, totalItens: total };
}

export interface ParcelaItem {
  id: number; vendaId: number; clienteId: number; cliente: string; telefone: string | null; numero: number; totalParcelas: number;
  valor: number; dataVencimento: string; dataPagamento: string | null; valorPago: number | null; situacao: 'ABERTA' | 'ATRASADA' | 'PAGA' | 'CANCELADA'; diasAtraso: number;
}

export async function obterVenda(s: Sessao, id: number) {
  const v = await consultaVendas(s)
    .select(['v.Id', 'v.DataVenda', 'v.ClienteId', 'c.Nome as Cliente', 'c.Telefone as ClienteTelefone', 'f.Nome as Forma', 'u.Nome as Vendedor',
      'v.ValorBruto', 'v.Desconto', 'v.ValorTaxa', 'v.CustoTotal', 'v.ValorLiquido', 'v.Lucro', 'v.Status', 'v.DataCancelamento', 'v.Observacao'])
    .where('v.Id', '=', id).executeTakeFirst();
  if (!v) throw new NaoEncontradoError('Venda');
  const dono = s.perfil === 'DONO';
  const itens = await db().selectFrom('ItemVenda as i').innerJoin('Produto as p', 'p.Id', 'i.ProdutoId')
    .select(['p.Nome', 'i.Quantidade', 'i.PrecoUnitario', 'i.CustoUnitario'])
    .where('i.VendaId', '=', id).where('i.EmpresaId', '=', s.empresaId).orderBy('i.Id').execute();
  const parcelasDb = await db().selectFrom('ParcelaCrediario').selectAll().where('VendaId', '=', id).where('EmpresaId', '=', s.empresaId).orderBy('Numero').execute();
  const cancelada = v.Status === 'CANCELADA';
  const h = hoje();
  const parcelas: ParcelaItem[] = parcelasDb
    .filter(p => p.Status !== 'CANCELADA' || cancelada)
    .map(p => {
      const venc = lerData(p.DataVencimento).slice(0, 10);
      const situacao = p.Status === 'PAGA' ? 'PAGA' : p.Status === 'CANCELADA' ? 'CANCELADA' : venc < h ? 'ATRASADA' : 'ABERTA';
      return {
        id: p.Id, vendaId: id, clienteId: p.ClienteId, cliente: v.Cliente ?? '', telefone: v.ClienteTelefone, numero: p.Numero, totalParcelas: p.TotalParcelas,
        valor: num(p.Valor), dataVencimento: venc, dataPagamento: dataOuNula(p.DataPagamento), valorPago: p.ValorPago == null ? null : num(p.ValorPago),
        situacao, diasAtraso: situacao === 'ATRASADA' ? diferencaDias(venc, h) : 0
      };
    });
  const empresa = await obterEmpresa(s.empresaId);
  const recibo = montarRecibo(empresa.nome, id, lerData(v.DataVenda), itens.map(i => ({ nome: i.Nome, qtd: num(i.Quantidade), preco: num(i.PrecoUnitario) })),
    num(v.ValorBruto), num(v.Desconto), v.Forma,
    parcelas.filter(p => p.situacao !== 'CANCELADA').map(p => ({ numero: p.numero, valor: p.valor, vencimento: p.dataVencimento })));
  return {
    id, dataVenda: lerData(v.DataVenda), vendedor: v.Vendedor, clienteId: v.ClienteId, cliente: v.Cliente, clienteTelefone: v.ClienteTelefone,
    formaPagamento: v.Forma, valorBruto: num(v.ValorBruto), desconto: num(v.Desconto), valorTaxa: num(v.ValorTaxa),
    custoTotal: dono ? num(v.CustoTotal) : null, valorLiquido: num(v.ValorLiquido), lucro: dono ? num(v.Lucro) : null,
    status: v.Status as StatusVenda, dataCancelamento: dataOuNula(v.DataCancelamento), observacao: v.Observacao,
    itens: itens.map(i => ({ produto: i.Nome, quantidade: num(i.Quantidade), precoUnitario: num(i.PrecoUnitario), custoUnitario: dono ? num(i.CustoUnitario) : null })),
    parcelas, linkRecibo: linkWhatsApp(v.ClienteTelefone, recibo)
  };
}

export type VendaDetalhe = Awaited<ReturnType<typeof obterVenda>>;

/** Venda não é excluída, só cancelada: devolve o estoque e cancela as parcelas abertas. Só o Dono. */
export async function cancelarVenda(s: Sessao, id: number) {
  if (s.perfil !== 'DONO') throw new RegraNegocioError('Só o dono pode cancelar vendas.');
  const v = await db().selectFrom('Venda').select(['Id', 'Status']).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!v) throw new NaoEncontradoError('Venda');
  if (v.Status === 'CANCELADA') throw new RegraNegocioError('Esta venda já foi cancelada.');
  const itens = await db().selectFrom('ItemVenda').select(['ProdutoId', 'Quantidade']).where('VendaId', '=', id).where('EmpresaId', '=', s.empresaId).execute();
  await db().transaction().execute(async trx => {
    await trx.updateTable('Venda').set({ Status: 'CANCELADA', DataCancelamento: agora() }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
    await trx.updateTable('ParcelaCrediario').set({ Status: 'CANCELADA' })
      .where('VendaId', '=', id).where('EmpresaId', '=', s.empresaId).where('Status', '=', 'ABERTA').execute();
    for (const i of itens)
      await trx.updateTable('Produto').set({ Estoque: sql`Estoque + ${num(i.Quantidade)}` })
        .where('Id', '=', i.ProdutoId).where('EmpresaId', '=', s.empresaId).execute();
  });
}

/** Início do Vendedor: só as próprias vendas do dia, sem lucro. */
export async function painelVendedor(s: Sessao) {
  const h = hoje();
  const linhas = await consultaVendas(s)
    .select(['v.Id', 'v.DataVenda', 'c.Nome as Cliente', 'f.Nome as Forma', 'v.ValorLiquido', 'v.Lucro', 'v.Status', 'u.Nome as Vendedor'])
    .where('v.UsuarioId', '=', s.usuarioId).where('v.DataVenda', '>=', `${h} 00:00:00`).where('v.DataVenda', '<', `${somarDias(h, 1)} 00:00:00`)
    .orderBy('v.DataVenda', 'desc').execute();
  const vendas = linhas.map(l => ({ ...mapearVenda(s)(l), lucro: null }));
  const concluidas = vendas.filter(v => v.status === 'CONCLUIDA');
  return { qtdVendas: concluidas.length, total: soma(concluidas.map(v => v.total)), vendas };
}

export function montarRecibo(empresa: string, vendaId: number, data: string, itens: { nome: string; qtd: number; preco: number }[],
  bruto: number, desconto: number, forma: string, parcelas: ParcelaGerada[]): string {
  const l: string[] = [`*${empresa}*`, `Recibo da venda nº ${vendaId} — ${formatarDataHora(data)}`, ''];
  for (const i of itens) l.push(`${i.qtd}x ${i.nome} — ${formatarMoeda(i.qtd * i.preco)}`);
  l.push('');
  if (desconto > 0) l.push(`Subtotal: ${formatarMoeda(bruto)}`, `Desconto: ${formatarMoeda(desconto)}`);
  l.push(`*Total: ${formatarMoeda(arredondar(bruto - desconto))}*`, `Pagamento: ${forma}`);
  if (parcelas.length) {
    l.push('', `Crediário em ${parcelas.length}x:`);
    for (const p of parcelas) l.push(`${p.numero}ª — ${formatarMoeda(p.valor)} vence ${formatarData(p.vencimento)}`);
  }
  l.push('', 'Obrigado pela preferência! 💜');
  return l.join('\n');
}
