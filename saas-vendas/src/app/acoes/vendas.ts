'use server';

import { revalidatePath } from 'next/cache';
import { novaVendaSchema, primeiroErro } from '@/domain/validacao';
import { cancelarVenda, registrarVenda, type VendaRegistrada } from '@/server/services/vendas';
import { darBaixa } from '@/server/services/crediario';
import { exigirSessao } from '@/server/sessao';
import { executar, type Resultado } from '@/server/acao';
import { obterEmpresa } from '@/server/contexto';

/** Finalizar venda (PDV). O filtro de assinatura ativa fica aqui e no service. */
export async function registrarVendaAcao(dados: unknown): Promise<Resultado<VendaRegistrada> & { redirect?: string }> {
  const s = await exigirSessao();
  if (!(await obterEmpresa(s.empresaId)).assinaturaAtiva)
    return { ok: false, erro: 'Seu teste grátis ou assinatura venceu. Renove para registrar vendas.', redirect: '/assinatura/bloqueio' };
  const v = novaVendaSchema.safeParse(dados);
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(() => registrarVenda(s, v.data));
  if (r.ok) revalidatePath('/painel');
  return r;
}

export async function cancelarVendaAcao(id: number): Promise<Resultado> {
  const s = await exigirSessao();
  const r = await executar(() => cancelarVenda(s, id));
  revalidatePath(`/vendas/${id}`);
  return r.ok ? { ok: true, mensagem: 'Venda cancelada. O estoque foi devolvido e as parcelas em aberto, canceladas.' } : r;
}

export async function darBaixaAcao(parcelaId: number): Promise<Resultado<{ valorPago: number }>> {
  const s = await exigirSessao();
  const r = await executar(() => darBaixa(s, parcelaId));
  if (r.ok) revalidatePath('/crediario');
  return r;
}
