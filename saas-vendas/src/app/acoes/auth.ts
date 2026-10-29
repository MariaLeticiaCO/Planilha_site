'use server';

import { redirect } from 'next/navigation';
import { cadastroSchema, errosPorCampo, loginSchema, redefinirSenhaSchema } from '@/domain/validacao';
import { autenticar, cadastrar, redefinirSenha, solicitarRecuperacao } from '@/server/services/auth';
import { entrar, sair } from '@/server/sessao';
import { executar, flash, type Resultado } from '@/server/acao';
import { obterEmpresa } from '@/server/contexto';

const dados = (f: FormData) => Object.fromEntries(f.entries());

export async function cadastrarAcao(_: unknown, form: FormData): Promise<Resultado> {
  const v = cadastroSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: 'Confira os campos destacados.', campos: errosPorCampo(v.error) };
  const r = await executar(() => cadastrar(v.data));
  if (!r.ok) return r;
  await entrar(r.dados!, true);
  redirect('/comecar');
}

export async function loginAcao(_: unknown, form: FormData): Promise<Resultado> {
  const v = loginSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: 'Confira os campos destacados.', campos: errosPorCampo(v.error) };
  const r = await autenticar(v.data.email, v.data.senha);
  if (!r.sessao) return { ok: false, erro: r.erro! };
  await entrar(r.sessao, v.data.lembrar);
  const empresa = await obterEmpresa(r.sessao.empresaId);
  const volta = String(form.get('returnUrl') ?? '');
  if (!empresa.onboardingConcluido && r.sessao.perfil === 'DONO') redirect('/comecar');
  redirect(volta.startsWith('/') && !volta.startsWith('//') ? volta : '/painel');
}

export async function sairAcao() {
  await sair();
  redirect('/login');
}

export async function esqueciSenhaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const email = String(form.get('email') ?? '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, erro: 'Informe um e-mail válido.', campos: { email: 'E-mail inválido.' } };
  await executar(() => solicitarRecuperacao(email));
  return { ok: true, mensagem: email };
}

export async function redefinirSenhaAcao(_: unknown, form: FormData): Promise<Resultado> {
  const v = redefinirSenhaSchema.safeParse(dados(form));
  if (!v.success) return { ok: false, erro: 'Confira os campos destacados.', campos: errosPorCampo(v.error) };
  const r = await executar(() => redefinirSenha(v.data.token, v.data.senha));
  if (!r.ok) return r;
  await flash('Senha criada! Agora é só entrar.');
  redirect('/login');
}
