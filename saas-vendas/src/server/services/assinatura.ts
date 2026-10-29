import 'server-only';
import { db } from '../db/conexao';
import { agora, hoje, lerData, somarDias, somarMeses } from '@/domain/datas';
import { soDigitos } from '@/domain/formatos';
import { assinaturaAtiva, DIAS_TOLERANCIA, obterPlano, type OpcaoPlano } from '@/domain/planos';
import { RegraNegocioError, type Plano, type StatusAssinatura } from '@/domain/tipos';
import type { Sessao } from '../sessao';
import { obterEmpresa } from '../contexto';
import * as gateway from '../infra/asaas';

export const referenciaExterna = (empresaId: number, opcao: OpcaoPlano) => `empresa:${empresaId}:${opcao}`;

export function lerReferencia(ref: string | null | undefined): { empresaId: number; opcao: OpcaoPlano } | null {
  const p = ref?.split(':');
  if (!p || p.length !== 3 || p[0] !== 'empresa' || !/^\d+$/.test(p[1]) || !['BASICO', 'PRO_MENSAL', 'PRO_ANUAL'].includes(p[2])) return null;
  return { empresaId: Number(p[1]), opcao: p[2] as OpcaoPlano };
}

interface EstadoEmpresa { plano: Plano; statusAssinatura: StatusAssinatura; dataFimTrial: string; dataFimAssinatura: string | null }

/**
 * Aplica um pagamento confirmado. Idempotente: o fim do período sai do vencimento da cobrança,
 * então o mesmo webhook repetido não soma tempo.
 */
export function aplicarPagamento(e: EstadoEmpresa, opcao: OpcaoPlano, vencimento: string): EstadoEmpresa {
  // Quem já tem o Pro e compra o Básico continua no Pro até o fim do período pago.
  if (opcao === 'BASICO' && e.plano === 'PRO' && assinaturaAtiva(e, agora())) return e;
  const venc = vencimento.slice(0, 10);
  const novoFim = opcao === 'PRO_MENSAL' ? somarDias(somarMeses(venc, 1), DIAS_TOLERANCIA)
    : opcao === 'PRO_ANUAL' ? somarDias(somarMeses(venc, 12), DIAS_TOLERANCIA) : null;
  const plano = obterPlano(opcao).plano;
  const fim = novoFim == null ? null
    : e.plano === 'PRO' && e.dataFimAssinatura && e.dataFimAssinatura.slice(0, 10) > novoFim ? e.dataFimAssinatura.slice(0, 10) : novoFim;
  return { ...e, plano, statusAssinatura: 'ATIVA', dataFimAssinatura: fim ? `${fim} 23:59:59` : null };
}

async function gravarEstado(empresaId: number, e: EstadoEmpresa, extra: Record<string, unknown> = {}) {
  await db().updateTable('Empresa').set({ Plano: e.plano, StatusAssinatura: e.statusAssinatura, DataFimAssinatura: e.dataFimAssinatura, ...extra })
    .where('Id', '=', empresaId).execute();
}

/** Gera a cobrança: Pix (QR Code) ou link de pagamento com cartão. */
export async function checkout(s: Sessao, opcao: OpcaoPlano, forma: gateway.FormaAssinatura, cpfCnpj: string | null) {
  if (s.perfil !== 'DONO') throw new RegraNegocioError('Só o dono pode assinar.');
  const empresa = await obterEmpresa(s.empresaId);
  if (opcao === 'BASICO' && empresa.plano === 'BASICO' && empresa.statusAssinatura === 'ATIVA') throw new RegraNegocioError('Você já tem o plano Básico.');
  const documento = soDigitos(cpfCnpj);
  if (!gateway.gatewaySimulado() && !(documento && (documento.length === 11 || documento.length === 14)))
    throw new RegraNegocioError('Informe um CPF ou CNPJ válido para emitir a cobrança.');

  const dono = await db().selectFrom('Usuario').select(['Email', 'Telefone']).where('EmpresaId', '=', s.empresaId).where('Perfil', '=', 'DONO').orderBy('Id').executeTakeFirstOrThrow();
  const clienteId = await gateway.salvarCliente(empresa.gatewayClienteId, empresa.nome, dono.Email, dono.Telefone ?? empresa.telefone, documento);
  if (clienteId !== empresa.gatewayClienteId) await db().updateTable('Empresa').set({ GatewayClienteId: clienteId }).where('Id', '=', s.empresaId).execute();

  const plano = obterPlano(opcao);
  const cobranca = await gateway.criarCobranca(clienteId, opcao, plano.preco, `Controle de Vendas — ${plano.nome}`, forma, referenciaExterna(s.empresaId, opcao));
  if (cobranca.assinaturaId && cobranca.assinaturaId !== empresa.gatewayAssinaturaId) {
    // Troca de plano: a assinatura antiga deixa de cobrar.
    if (empresa.gatewayAssinaturaId) await gateway.cancelarAssinatura(empresa.gatewayAssinaturaId).catch(() => undefined);
    await db().updateTable('Empresa').set({ GatewayAssinaturaId: cobranca.assinaturaId }).where('Id', '=', s.empresaId).execute();
  }
  return { ...cobranca, plano };
}

export async function historico(s: Sessao) {
  const empresa = await obterEmpresa(s.empresaId);
  if (!empresa.gatewayClienteId) return [];
  try { return await gateway.listarPagamentos(empresa.gatewayClienteId); } catch { return []; }
}

/** Só em desenvolvimento, sem ASAAS_API_KEY: confirma o pagamento na hora. */
export async function simularPagamento(s: Sessao, opcao: OpcaoPlano) {
  if (!gateway.gatewaySimulado()) throw new RegraNegocioError('Simulação desativada: o gateway real está configurado.');
  const e = await obterEmpresa(s.empresaId);
  await gravarEstado(s.empresaId, aplicarPagamento(e, opcao, hoje()));
}

export interface EventoWebhook {
  event?: string;
  payment?: { id?: string; customer?: string; subscription?: string; externalReference?: string; dueDate?: string; value?: number };
  subscription?: { id?: string; customer?: string; externalReference?: string };
}

/** Webhook do gateway: atualiza Plano e StatusAssinatura. */
export async function processarWebhook(evento: EventoWebhook) {
  const ref = lerReferencia(evento.payment?.externalReference ?? evento.subscription?.externalReference);
  if (!ref) return;
  const linha = await db().selectFrom('Empresa').selectAll().where('Id', '=', ref.empresaId).executeTakeFirst();
  if (!linha) return;
  // O cliente do gateway precisa ser o mesmo da empresa (evita referência forjada).
  const clienteEvento = evento.payment?.customer ?? evento.subscription?.customer;
  if (linha.GatewayClienteId && clienteEvento !== linha.GatewayClienteId) return;

  const e: EstadoEmpresa = {
    plano: linha.Plano as Plano, statusAssinatura: linha.StatusAssinatura as StatusAssinatura,
    dataFimTrial: lerData(linha.DataFimTrial), dataFimAssinatura: linha.DataFimAssinatura ? lerData(linha.DataFimAssinatura) : null
  };
  switch (evento.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await gravarEstado(ref.empresaId, aplicarPagamento(e, ref.opcao, evento.payment?.dueDate ?? hoje()),
        evento.payment?.subscription ? { GatewayAssinaturaId: evento.payment.subscription } : {});
      break;
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      await gravarEstado(ref.empresaId, { ...e, statusAssinatura: 'VENCIDA' });
      break;
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      if (e.plano === 'PRO' && evento.subscription?.id === linha.GatewayAssinaturaId) await gravarEstado(ref.empresaId, { ...e, statusAssinatura: 'CANCELADA' });
      break;
  }
}
