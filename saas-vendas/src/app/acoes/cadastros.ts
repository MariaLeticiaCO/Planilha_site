'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clienteSchema, errosPorCampo, formaPagamentoSchema, primeiroErro, produtoSchema } from '@/domain/validacao';
import * as svc from '@/server/services/cadastros';
import { exigirDono, exigirSessao } from '@/server/sessao';
import { executar, flash, type Resultado } from '@/server/acao';
import { salvarImagem } from '@/server/infra/armazenamento';

const dados = (f: FormData) => Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === 'string'));

// ---------- Produtos ----------
export async function salvarProdutoAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const id = Number(form.get('id') || 0) || null;
  const v = produtoSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: 'Confira os campos destacados.', campos: errosPorCampo(v.error) };
  const r = await executar(async () => {
    const foto = form.get('foto');
    const url = foto instanceof File && foto.size > 0 ? await salvarImagem(foto, s.empresaId, 'produtos') : null;
    return svc.salvarProduto(s, id, v.data, url);
  });
  if (!r.ok) return r;
  await flash(id ? 'Produto atualizado.' : 'Produto cadastrado.');
  redirect('/produtos');
}

export async function alterarAtivoProdutoAcao(id: number, ativo: boolean): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.alterarAtivoProduto(s, id, ativo));
  revalidatePath('/produtos');
  return r.ok ? { ok: true, mensagem: ativo ? 'Produto reativado.' : 'Produto desativado.' } : r;
}

export async function excluirProdutoAcao(id: number): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.excluirProduto(s, id));
  if (!r.ok) return r;
  await flash(r.dados ? 'Produto excluído.' : 'Este produto já tem vendas, então foi desativado (o histórico continua).');
  redirect('/produtos');
}

// ---------- Categorias ----------
export async function criarCategoriaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.criarCategoria(s, String(form.get('nome') ?? '')));
  revalidatePath('/categorias');
  return r.ok ? { ok: true, mensagem: 'Categoria criada.' } : r;
}

export async function renomearCategoriaAcao(id: number, nome: string): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.renomearCategoria(s, id, nome));
  revalidatePath('/categorias');
  return r.ok ? { ok: true, mensagem: 'Categoria renomeada.' } : r;
}

export async function alterarAtivoCategoriaAcao(id: number, ativo: boolean): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.alterarAtivoCategoria(s, id, ativo));
  revalidatePath('/categorias');
  return r.ok ? { ok: true, mensagem: ativo ? 'Categoria reativada.' : 'Categoria desativada.' } : r;
}

// ---------- Formas de pagamento ----------
export async function salvarFormaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const v = formaPagamentoSchema.safeParse({ ativo: 'true', ...dados(form) });
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(() => svc.salvarForma(s, v.data));
  revalidatePath('/formas-pagamento');
  return r.ok ? { ok: true, mensagem: v.data.id ? 'Taxas atualizadas.' : 'Forma de pagamento criada.' } : r;
}

export async function alterarAtivoFormaAcao(id: number, ativo: boolean): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.alterarAtivoForma(s, id, ativo));
  revalidatePath('/formas-pagamento');
  return r.ok ? { ok: true, mensagem: ativo ? 'Forma de pagamento ativada.' : 'Forma de pagamento desativada.' } : r;
}

export async function criarFaixasCreditoAcao(): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.criarFaixasCredito(s));
  revalidatePath('/formas-pagamento');
  return r.ok ? { ok: true, mensagem: 'Faixas de crédito parcelado criadas. Agora informe a taxa de cada uma.' } : r;
}

// ---------- Clientes ----------
export async function salvarClienteAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirSessao();
  const id = Number(form.get('id') || 0) || null;
  const v = clienteSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: 'Confira os campos destacados.', campos: errosPorCampo(v.error) };
  const r = await executar(() => svc.salvarCliente(s, id, v.data));
  if (!r.ok) return r;
  await flash('Cliente salvo.');
  redirect(`/clientes/${r.dados!.id}`);
}

/** Cadastro rápido no PDV. */
export async function clienteRapidoAcao(nome: string, telefone: string): Promise<Resultado<{ id: number; nome: string; telefone: string | null }>> {
  const s = await exigirSessao();
  const v = clienteSchema.safeParse({ nome, telefone });
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  return executar(() => svc.salvarCliente(s, null, v.data));
}

export async function desativarClienteAcao(id: number): Promise<Resultado> {
  const s = await exigirSessao();
  const r = await executar(() => svc.desativarCliente(s, id));
  if (!r.ok) return r;
  await flash('Cliente removido da lista.');
  redirect('/clientes');
}
