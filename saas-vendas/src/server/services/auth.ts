import 'server-only';
import { db, bool, inserir } from '../db/conexao';
import { agora, lerData, somarDias } from '@/domain/datas';
import { soDigitos } from '@/domain/formatos';
import { DIAS_TRIAL } from '@/domain/planos';
import { RegraNegocioError, type Perfil } from '@/domain/tipos';
import { gerarToken, hashSenha, hashToken, verificarSenha } from '../seguranca';
import { enviarEmail, escaparHtml, urlApp } from '../infra/email';
import type { Sessao } from '../sessao';

export const MAX_TENTATIVAS = 5;
export const MINUTOS_BLOQUEIO = 15;

export const normalizarEmail = (e: string) => e.trim().toLowerCase();

const paraSessao = (u: { Id: number; EmpresaId: number; Nome: string; Email: string; Perfil: string }): Sessao => ({
  usuarioId: u.Id, empresaId: u.EmpresaId, nome: u.Nome, email: u.Email, perfil: u.Perfil as Perfil
});

/** Cria Empresa (TRIAL de 7 dias) e Usuario (DONO). O onboarding vem em seguida. */
export async function cadastrar(dados: { nome: string; email: string; whatsapp: string; senha: string }): Promise<Sessao> {
  const email = normalizarEmail(dados.email);
  const existe = await db().selectFrom('Usuario').select('Id').where('Email', '=', email).executeTakeFirst();
  if (existe) throw new RegraNegocioError('Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.');

  const a = agora();
  const telefone = soDigitos(dados.whatsapp);
  return db().transaction().execute(async trx => {
    const empresaId = await inserir(trx, 'Empresa', {
      Nome: 'Meu negócio', Telefone: telefone, Plano: 'TESTE', StatusAssinatura: 'TRIAL',
      DataFimTrial: somarDias(a, DIAS_TRIAL), DataCadastro: a, PermitirEstoqueNegativo: 1, OnboardingConcluido: 0
    });
    const usuario = { EmpresaId: empresaId, Nome: dados.nome.trim(), Email: email, Telefone: telefone, Perfil: 'DONO' };
    const id = await inserir(trx, 'Usuario', {
      ...usuario, SenhaHash: hashSenha(dados.senha), Ativo: 1, TentativasFalhas: 0, AceiteTermosEm: a, UltimoAcesso: a, DataCadastro: a
    });
    return paraSessao({ Id: id, ...usuario });
  });
}

/** Confere e-mail e senha. Bloqueia por 15 minutos depois de 5 tentativas erradas. */
export async function autenticar(emailInformado: string, senha: string): Promise<{ sessao?: Sessao; erro?: string }> {
  const erroPadrao = 'E-mail ou senha incorretos.';
  const u = await db().selectFrom('Usuario').selectAll().where('Email', '=', normalizarEmail(emailInformado)).executeTakeFirst();
  if (!u || !bool(u.Ativo)) return { erro: erroPadrao };

  const a = agora();
  const bloqueadoAte = u.BloqueadoAte ? lerData(u.BloqueadoAte) : null;
  if (bloqueadoAte && bloqueadoAte > a) {
    const minutos = Math.max(1, Math.ceil((new Date(bloqueadoAte.replace(' ', 'T') + 'Z').getTime() - new Date(a.replace(' ', 'T') + 'Z').getTime()) / 60000));
    return { erro: `Muitas tentativas erradas. Tente de novo em ${minutos} min ou recupere a senha.` };
  }

  if (!verificarSenha(senha, u.SenhaHash)) {
    const tentativas = u.TentativasFalhas + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      const ate = new Date(new Date(a.replace(' ', 'T') + 'Z').getTime() + MINUTOS_BLOQUEIO * 60000).toISOString();
      await db().updateTable('Usuario').set({ TentativasFalhas: 0, BloqueadoAte: `${ate.slice(0, 10)} ${ate.slice(11, 19)}` }).where('Id', '=', u.Id).execute();
      return { erro: 'Conta bloqueada por 15 minutos após 5 tentativas erradas.' };
    }
    await db().updateTable('Usuario').set({ TentativasFalhas: tentativas }).where('Id', '=', u.Id).execute();
    return { erro: erroPadrao };
  }

  await db().updateTable('Usuario').set({ TentativasFalhas: 0, BloqueadoAte: null, UltimoAcesso: a }).where('Id', '=', u.Id).execute();
  return { sessao: paraSessao(u) };
}

export async function recarregarSessao(usuarioId: number): Promise<Sessao | null> {
  const u = await db().selectFrom('Usuario').select(['Id', 'EmpresaId', 'Nome', 'Email', 'Perfil', 'Ativo']).where('Id', '=', usuarioId).executeTakeFirst();
  return u && bool(u.Ativo) ? paraSessao(u) : null;
}

/** Grava o hash de um token novo e devolve o token em claro (vai no link). */
export async function criarTokenRecuperacao(usuarioId: number, horas: number): Promise<string> {
  const token = gerarToken();
  const expira = new Date(new Date(agora().replace(' ', 'T') + 'Z').getTime() + horas * 3_600_000).toISOString();
  await db().updateTable('Usuario').set({ TokenRecuperacaoHash: hashToken(token), TokenExpiraEm: `${expira.slice(0, 10)} ${expira.slice(11, 19)}` })
    .where('Id', '=', usuarioId).execute();
  return token;
}

/** Token válido por 1 hora, enviado por e-mail. Não revela se o e-mail existe. */
export async function solicitarRecuperacao(emailInformado: string) {
  const u = await db().selectFrom('Usuario').select(['Id', 'Nome', 'Email', 'Ativo']).where('Email', '=', normalizarEmail(emailInformado)).executeTakeFirst();
  if (!u || !bool(u.Ativo)) return;
  const token = await criarTokenRecuperacao(u.Id, 1);
  const link = `${urlApp()}/recuperar-senha?token=${token}`;
  await enviarEmail(u.Email, 'Crie uma nova senha — Controle de Vendas', `
    <p>Olá, ${escaparHtml(u.Nome)}!</p>
    <p>Recebemos um pedido para criar uma nova senha. O link vale por 1 hora:</p>
    <p><a href="${link}">Criar nova senha</a></p>
    <p>Se não foi você, ignore este e-mail.</p>`);
}

async function usuarioDoToken(token: string) {
  if (!token) return undefined;
  return db().selectFrom('Usuario').select(['Id', 'Ativo', 'AceiteTermosEm'])
    .where('TokenRecuperacaoHash', '=', hashToken(token)).where('TokenExpiraEm', '>', agora()).executeTakeFirst();
}

export async function tokenValido(token: string): Promise<boolean> {
  const u = await usuarioDoToken(token);
  return !!u && bool(u.Ativo);
}

export async function redefinirSenha(token: string, senha: string) {
  const u = await usuarioDoToken(token);
  if (!u || !bool(u.Ativo)) throw new RegraNegocioError('Este link expirou ou já foi usado. Peça um novo.');
  await db().updateTable('Usuario').set({
    SenhaHash: hashSenha(senha), TokenRecuperacaoHash: null, TokenExpiraEm: null, TentativasFalhas: 0, BloqueadoAte: null,
    AceiteTermosEm: u.AceiteTermosEm ? lerData(u.AceiteTermosEm) : agora()
  }).where('Id', '=', u.Id).execute();
}

export async function trocarSenha(s: Sessao, atual: string, nova: string) {
  const u = await db().selectFrom('Usuario').select(['Id', 'SenhaHash']).where('Id', '=', s.usuarioId).where('EmpresaId', '=', s.empresaId).executeTakeFirstOrThrow();
  if (!verificarSenha(atual, u.SenhaHash)) throw new RegraNegocioError('A senha atual está incorreta.');
  await db().updateTable('Usuario').set({ SenhaHash: hashSenha(nova) }).where('Id', '=', u.Id).execute();
}
