'use server';

import { revalidatePath } from 'next/cache';
import { checkout, simularPagamento } from '@/server/services/assinatura';
import { exigirDono } from '@/server/sessao';
import { executar, type Resultado } from '@/server/acao';
import type { OpcaoPlano } from '@/domain/planos';
import type { Cobranca, FormaAssinatura } from '@/server/infra/asaas';

const OPCOES: OpcaoPlano[] = ['BASICO', 'PRO_MENSAL', 'PRO_ANUAL'];

export async function checkoutAcao(opcao: OpcaoPlano, forma: FormaAssinatura, cpfCnpj: string | null): Promise<Resultado<Cobranca>> {
  const s = await exigirDono();
  if (!OPCOES.includes(opcao) || !['PIX', 'CARTAO'].includes(forma)) return { ok: false, erro: 'Plano inválido.' };
  return executar(() => checkout(s, opcao, forma, cpfCnpj));
}

export async function simularPagamentoAcao(opcao: OpcaoPlano): Promise<Resultado> {
  const s = await exigirDono();
  if (!OPCOES.includes(opcao)) return { ok: false, erro: 'Plano inválido.' };
  const r = await executar(() => simularPagamento(s, opcao));
  revalidatePath('/', 'layout');
  return r;
}
