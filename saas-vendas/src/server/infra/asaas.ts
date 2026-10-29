import 'server-only';
import { hoje, lerData, somarDias } from '@/domain/datas';
import type { OpcaoPlano } from '@/domain/planos';
import { RegraNegocioError } from '@/domain/tipos';

export type FormaAssinatura = 'PIX' | 'CARTAO';

export interface Cobranca {
  pagamentoId: string;
  assinaturaId: string | null;
  linkPagamento: string | null;
  pixQrCodeBase64: string | null;
  pixCopiaECola: string | null;
}

export interface PagamentoHistorico {
  id: string;
  data: string;
  valor: number;
  descricao: string;
  status: string;
  linkPagamento: string | null;
}

/** Sem ASAAS_API_KEY o gateway é simulado (só desenvolvimento): o pagamento é confirmado por um botão. */
export const gatewaySimulado = () => !process.env.ASAAS_API_KEY;

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const base = (process.env.ASAAS_URL ?? 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '');
  const resp = await fetch(`${base}/${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ControleVendas/1.0',
      access_token: process.env.ASAAS_API_KEY ?? ''
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store'
  });
  const texto = await resp.text();
  if (!resp.ok) {
    console.error(`[asaas] ${metodo} ${caminho} falhou (${resp.status}): ${texto}`);
    let msg = 'Não foi possível falar com o gateway de pagamento. Tente de novo.';
    try { msg = JSON.parse(texto).errors?.[0]?.description ?? msg; } catch { /* corpo não é JSON */ }
    throw new RegraNegocioError(msg);
  }
  return (texto ? JSON.parse(texto) : {}) as T;
}

export async function salvarCliente(clienteId: string | null, nome: string, email: string, telefone: string | null, cpfCnpj: string | null): Promise<string> {
  if (gatewaySimulado()) return clienteId ?? `cus_simulado_${Math.random().toString(36).slice(2, 12)}`;
  const r = await chamar<{ id: string }>('POST', clienteId ? `customers/${clienteId}` : 'customers',
    { name: nome, email, mobilePhone: telefone, cpfCnpj });
  return r.id;
}

interface PagamentoAsaas { id: string; value: number; status?: string; description?: string; invoiceUrl?: string; dueDate?: string; paymentDate?: string; dateCreated?: string }

export async function criarCobranca(clienteId: string, opcao: OpcaoPlano, valor: number, descricao: string, forma: FormaAssinatura, referencia: string): Promise<Cobranca> {
  if (gatewaySimulado())
    return { pagamentoId: 'pay_simulado', assinaturaId: opcao === 'BASICO' ? null : 'sub_simulado', linkPagamento: null, pixQrCodeBase64: null, pixCopiaECola: forma === 'PIX' ? '00020126580014BR.GOV.BCB.PIX-SIMULADO' : null };

  const billingType = forma === 'PIX' ? 'PIX' : 'CREDIT_CARD';
  const vencimento = somarDias(hoje(), 1);
  let pagamento: PagamentoAsaas;
  let assinaturaId: string | null = null;

  if (opcao === 'BASICO') {
    pagamento = await chamar<PagamentoAsaas>('POST', 'payments',
      { customer: clienteId, billingType, value: valor, dueDate: vencimento, description: descricao, externalReference: referencia });
  } else {
    const assinatura = await chamar<{ id: string }>('POST', 'subscriptions', {
      customer: clienteId, billingType, value: valor, nextDueDate: vencimento,
      cycle: opcao === 'PRO_ANUAL' ? 'YEARLY' : 'MONTHLY', description: descricao, externalReference: referencia
    });
    assinaturaId = assinatura.id;
    const lista = await chamar<{ data: PagamentoAsaas[] }>('GET', `subscriptions/${assinatura.id}/payments`);
    if (!lista.data.length) throw new RegraNegocioError('O gateway não gerou a primeira cobrança. Tente de novo.');
    pagamento = lista.data[0];
  }

  let pix: { encodedImage?: string; payload?: string } = {};
  if (forma === 'PIX') pix = await chamar('GET', `payments/${pagamento.id}/pixQrCode`);
  return { pagamentoId: pagamento.id, assinaturaId, linkPagamento: pagamento.invoiceUrl ?? null, pixQrCodeBase64: pix.encodedImage ?? null, pixCopiaECola: pix.payload ?? null };
}

const STATUS: Record<string, string> = { RECEIVED: 'Pago', CONFIRMED: 'Pago', RECEIVED_IN_CASH: 'Pago', PENDING: 'Aguardando pagamento', OVERDUE: 'Vencido', REFUNDED: 'Estornado' };

export async function listarPagamentos(clienteId: string): Promise<PagamentoHistorico[]> {
  if (gatewaySimulado()) return [];
  const r = await chamar<{ data: PagamentoAsaas[] }>('GET', `payments?customer=${encodeURIComponent(clienteId)}&limit=50`);
  return r.data
    .map(p => ({
      id: p.id, data: lerData(p.paymentDate ?? p.dateCreated ?? p.dueDate ?? ''), valor: p.value, descricao: p.description ?? '',
      status: STATUS[p.status ?? ''] ?? p.status ?? '-', linkPagamento: p.invoiceUrl ?? null
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

export async function cancelarAssinatura(assinaturaId: string) {
  if (gatewaySimulado()) return;
  await chamar('DELETE', `subscriptions/${assinaturaId}`);
}
