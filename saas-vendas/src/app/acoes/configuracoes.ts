'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { conviteSchema, negocioSchema, perfilSchema, primeiroErro, trocarSenhaSchema } from '@/domain/validacao';
import * as svc from '@/server/services/configuracoes';
import { recarregarSessao, trocarSenha } from '@/server/services/auth';
import { entrar, exigirDono, exigirSessao, sair } from '@/server/sessao';
import { executar, flash, type Resultado } from '@/server/acao';
import { salvarImagem } from '@/server/infra/armazenamento';
import { RegraNegocioError } from '@/domain/tipos';

const dados = (f: FormData) => Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === 'string'));

export async function salvarNegocioAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const v = negocioSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(async () => {
    const logo = form.get('logo');
    const url = logo instanceof File && logo.size > 0 ? await salvarImagem(logo, s.empresaId, 'logo') : null;
    await svc.salvarNegocio(s, v.data, url);
  });
  revalidatePath('/', 'layout');
  return r.ok ? { ok: true, mensagem: 'Dados do negócio salvos.' } : r;
}

export async function salvarPerfilAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirSessao();
  const v = perfilSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(() => svc.salvarPerfil(s, v.data));
  if (!r.ok) return r;
  const nova = await recarregarSessao(s.usuarioId);
  if (nova) await entrar(nova, true);
  revalidatePath('/', 'layout');
  return { ok: true, mensagem: 'Perfil atualizado.' };
}

export async function trocarSenhaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirSessao();
  const v = trocarSenhaSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(() => trocarSenha(s, v.data.senhaAtual, v.data.novaSenha));
  return r.ok ? { ok: true, mensagem: 'Senha alterada.' } : r;
}

export async function convidarAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const v = conviteSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: primeiroErro(v.error) };
  const r = await executar(() => svc.convidarVendedor(s, v.data));
  revalidatePath('/configuracoes');
  return r.ok ? { ok: true, mensagem: `Convite enviado para ${v.data.email}.` } : r;
}

export async function alterarAtivoUsuarioAcao(id: number, ativo: boolean): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(() => svc.alterarAtivoUsuario(s, id, ativo));
  revalidatePath('/configuracoes');
  return r.ok ? { ok: true, mensagem: ativo ? 'Usuário reativado.' : 'Usuário desativado.' } : r;
}

/** LGPD: excluir a conta e os dados. */
export async function excluirContaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const s = await exigirDono();
  const r = await executar(async () => {
    if (String(form.get('confirmacao') ?? '').trim().toUpperCase() !== 'EXCLUIR') throw new RegraNegocioError('Digite EXCLUIR para confirmar.');
    await svc.excluirConta(s, String(form.get('senha') ?? ''));
  });
  if (!r.ok) return r;
  await sair();
  await flash('Sua conta e todos os dados foram excluídos.');
  redirect('/login');
}
