import 'server-only';
import { db, num } from '../db/conexao';
import { agora, formatarData, hoje, lerData, somarDias } from '@/domain/datas';
import { formatarMoeda, linkWhatsApp } from '@/domain/formatos';
import { NaoEncontradoError, RegraNegocioError } from '@/domain/tipos';
import type { Sessao } from '../sessao';
import { exigirPro, obterEmpresa } from '../contexto';
import { dataOuNula, soma } from './cadastros';
import type { ParcelaItem } from './vendas';

export type Aba = 'atrasadas' | 'a-vencer' | 'pagas';

function base(s: Sessao) {
  return db().selectFrom('vw_ParcelasCrediario').selectAll().where('EmpresaId', '=', s.empresaId);
}

const mapear = (p: Record<string, unknown>): ParcelaItem => ({
  id: num(p.Id), vendaId: num(p.VendaId), clienteId: num(p.ClienteId), cliente: String(p.ClienteNome), telefone: (p.ClienteTelefone as string) ?? null,
  numero: num(p.Numero), totalParcelas: num(p.TotalParcelas), valor: num(p.Valor), dataVencimento: lerData(p.DataVencimento).slice(0, 10),
  dataPagamento: dataOuNula(p.DataPagamento), valorPago: p.ValorPago == null ? null : num(p.ValorPago),
  situacao: p.Situacao as ParcelaItem['situacao'], diasAtraso: num(p.DiasAtraso)
});

export async function resumoCrediario(s: Sessao) {
  const abertas = (await base(s).where('Situacao', '<>', 'PAGA').execute()).map(mapear);
  const fimSemana = somarDias(hoje(), 7);
  return {
    totalAReceber: soma(abertas.map(p => p.valor)),
    atrasado: soma(abertas.filter(p => p.situacao === 'ATRASADA').map(p => p.valor)),
    venceEstaSemana: soma(abertas.filter(p => p.situacao === 'ABERTA' && p.dataVencimento < fimSemana).map(p => p.valor)),
    qtdAtrasadas: abertas.filter(p => p.situacao === 'ATRASADA').length
  };
}

export async function listarParcelas(s: Sessao, aba: Aba, clienteId?: number): Promise<ParcelaItem[]> {
  let q = base(s);
  if (clienteId) q = q.where('ClienteId', '=', clienteId);
  if (aba === 'atrasadas') q = q.where('Situacao', '=', 'ATRASADA').orderBy('DataVencimento').orderBy('ClienteNome');
  else if (aba === 'pagas') q = q.where('Situacao', '=', 'PAGA').orderBy('DataPagamento', 'desc').offset(0).limit(200);
  else q = q.where('Situacao', '=', 'ABERTA').orderBy('DataVencimento').orderBy('ClienteNome');
  return (await q.execute()).map(mapear);
}

export async function parcelasDoCliente(s: Sessao, clienteId: number) {
  return (await base(s).where('ClienteId', '=', clienteId).orderBy('DataVencimento').execute()).map(mapear);
}

/** Visão agrupada: total devido por pessoa. */
export async function devedores(s: Sessao) {
  const abertas = (await base(s).where('Situacao', '<>', 'PAGA').execute()).map(mapear);
  const grupos = new Map<number, ParcelaItem[]>();
  for (const p of abertas) grupos.set(p.clienteId, [...(grupos.get(p.clienteId) ?? []), p]);
  return [...grupos.entries()]
    .map(([clienteId, ps]) => ({
      clienteId, cliente: ps[0].cliente, telefone: ps[0].telefone, qtdParcelas: ps.length, totalDevido: soma(ps.map(p => p.valor)),
      atrasado: soma(ps.filter(p => p.situacao === 'ATRASADA').map(p => p.valor)),
      proximoVencimento: ps.map(p => p.dataVencimento).sort()[0]
    }))
    .sort((a, b) => b.atrasado - a.atrasado || b.totalDevido - a.totalDevido);
}

/** Dá baixa no valor total da parcela (pagamento parcial fica para a versão 2). */
export async function darBaixa(s: Sessao, parcelaId: number) {
  await exigirPro(s.empresaId, 'O crediário');
  const p = await db().selectFrom('ParcelaCrediario').select(['Id', 'Status', 'Valor']).where('Id', '=', parcelaId).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!p) throw new NaoEncontradoError('Parcela');
  if (p.Status !== 'ABERTA') throw new RegraNegocioError('Esta parcela não está em aberto.');
  const data = agora();
  await db().updateTable('ParcelaCrediario').set({ Status: 'PAGA', DataPagamento: data, ValorPago: num(p.Valor) })
    .where('Id', '=', parcelaId).where('EmpresaId', '=', s.empresaId).where('Status', '=', 'ABERTA').execute();
  return { parcelaId, dataPagamento: data, valorPago: num(p.Valor) };
}

/** https://wa.me/55{telefone}?text={mensagem} com nome, valor e vencimento já preenchidos. */
export async function linkCobranca(s: Sessao, parcelaId: number) {
  const linha = await base(s).where('Id', '=', parcelaId).executeTakeFirst();
  if (!linha) throw new NaoEncontradoError('Parcela');
  const p = mapear(linha);
  const empresa = await obterEmpresa(s.empresaId);
  const primeiroNome = p.cliente.split(/\s+/)[0];
  const situacao = p.situacao === 'ATRASADA'
    ? `que venceu em ${formatarData(p.dataVencimento)} (${p.diasAtraso} ${p.diasAtraso === 1 ? 'dia' : 'dias'} de atraso)`
    : `com vencimento em ${formatarData(p.dataVencimento)}`;
  const msg = `Olá, ${primeiroNome}! Tudo bem? 😊\nPassando para lembrar da parcela ${p.numero}/${p.totalParcelas} de *${formatarMoeda(p.valor)}* da sua compra na ${empresa.nome}, ${situacao}.\nPode pagar por Pix ou como preferir. Qualquer dúvida, é só me chamar. Obrigado!`;
  return linkWhatsApp(p.telefone, msg);
}
