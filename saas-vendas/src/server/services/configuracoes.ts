import 'server-only';
import { db, bool, bit, inserir, num } from '../db/conexao';
import { agora, lerData } from '@/domain/datas';
import { soDigitos } from '@/domain/formatos';
import { NaoEncontradoError, RegraNegocioError, type Perfil } from '@/domain/tipos';
import type { z } from 'zod';
import type { conviteSchema, negocioSchema, perfilSchema } from '@/domain/validacao';
import type { Sessao } from '../sessao';
import { obterEmpresa } from '../contexto';
import { gerarToken, hashSenha, verificarSenha } from '../seguranca';
import { criarTokenRecuperacao, normalizarEmail } from './auth';
import { enviarEmail, escaparHtml, urlApp } from '../infra/email';
import { cancelarAssinatura } from '../infra/asaas';

export async function salvarNegocio(s: Sessao, dados: z.infer<typeof negocioSchema>, logoUrl?: string | null) {
  await db().updateTable('Empresa').set({
    Nome: dados.nome, SetorId: dados.setorId, Telefone: soDigitos(dados.telefone), PermitirEstoqueNegativo: bit(dados.permitirEstoqueNegativo),
    ...(logoUrl ? { LogoUrl: logoUrl } : {})
  }).where('Id', '=', s.empresaId).execute();
}

export async function obterPerfil(s: Sessao) {
  const u = await db().selectFrom('Usuario').select(['Nome', 'Email', 'Telefone']).where('Id', '=', s.usuarioId).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!u) throw new NaoEncontradoError('Usuário');
  return { nome: u.Nome, email: u.Email, telefone: u.Telefone };
}

export async function salvarPerfil(s: Sessao, dados: z.infer<typeof perfilSchema>) {
  const email = normalizarEmail(dados.email);
  const outro = await db().selectFrom('Usuario').select('Id').where('Email', '=', email).where('Id', '<>', s.usuarioId).executeTakeFirst();
  if (outro) throw new RegraNegocioError('Este e-mail já está em uso.');
  await db().updateTable('Usuario').set({ Nome: dados.nome, Email: email, Telefone: soDigitos(dados.telefone) })
    .where('Id', '=', s.usuarioId).where('EmpresaId', '=', s.empresaId).execute();
}

export async function listarUsuarios(s: Sessao) {
  const linhas = await db().selectFrom('Usuario').select(['Id', 'Nome', 'Email', 'Perfil', 'Ativo', 'UltimoAcesso'])
    .where('EmpresaId', '=', s.empresaId).orderBy('Perfil').orderBy('Nome').execute();
  return linhas.map(u => ({ id: u.Id, nome: u.Nome, email: u.Email, perfil: u.Perfil as Perfil, ativo: bool(u.Ativo), ultimoAcesso: u.UltimoAcesso ? lerData(u.UltimoAcesso) : null }));
}

async function contarAtivos(s: Sessao) {
  const r = await db().selectFrom('Usuario').select(eb => eb.fn.countAll<number>().as('n')).where('EmpresaId', '=', s.empresaId).where('Ativo', '=', 1).executeTakeFirstOrThrow();
  return num(r.n);
}

/** Cria o Vendedor e manda um link (válido por 2 dias) para ele criar a senha. */
export async function convidarVendedor(s: Sessao, dados: z.infer<typeof conviteSchema>) {
  const empresa = await obterEmpresa(s.empresaId);
  if ((await contarAtivos(s)) >= empresa.limiteUsuarios)
    throw new RegraNegocioError(empresa.temRecursosPro ? `Seu plano permite até ${empresa.limiteUsuarios} usuários.` : 'O plano Básico tem 1 usuário. Passe para o Pro para convidar vendedores.');
  const email = normalizarEmail(dados.email);
  if (await db().selectFrom('Usuario').select('Id').where('Email', '=', email).executeTakeFirst())
    throw new RegraNegocioError('Já existe um usuário com este e-mail.');
  const a = agora();
  const id = await inserir(db(), 'Usuario', {
    EmpresaId: s.empresaId, Nome: dados.nome, Email: email, Perfil: 'VENDEDOR', Ativo: 1, TentativasFalhas: 0,
    SenhaHash: hashSenha(gerarToken()), DataCadastro: a
  });
  const token = await criarTokenRecuperacao(id, 48);
  const link = `${urlApp()}/recuperar-senha?token=${token}`;
  await enviarEmail(email, `Convite para vender com ${empresa.nome}`, `
    <p>Olá, ${escaparHtml(dados.nome)}!</p>
    <p>Você foi convidado(a) para registrar vendas de <b>${escaparHtml(empresa.nome)}</b> no Controle de Vendas.</p>
    <p><a href="${link}">Criar minha senha</a> (o link vale por 2 dias).</p>`);
}

export async function alterarAtivoUsuario(s: Sessao, id: number, ativo: boolean) {
  if (id === s.usuarioId) throw new RegraNegocioError('Você não pode desativar o próprio usuário.');
  const u = await db().selectFrom('Usuario').select(['Perfil', 'Ativo']).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).executeTakeFirst();
  if (!u) throw new NaoEncontradoError('Usuário');
  if (u.Perfil === 'DONO') throw new RegraNegocioError('O dono da conta não pode ser desativado.');
  if (ativo && !bool(u.Ativo)) {
    const empresa = await obterEmpresa(s.empresaId);
    if ((await contarAtivos(s)) >= empresa.limiteUsuarios) throw new RegraNegocioError(`Seu plano permite até ${empresa.limiteUsuarios} usuário(s) ativo(s).`);
  }
  await db().updateTable('Usuario').set({ Ativo: bit(ativo) }).where('Id', '=', id).where('EmpresaId', '=', s.empresaId).execute();
}

/** LGPD: exclui a conta e todos os dados (dos filhos para os pais, numa transação). */
export async function excluirConta(s: Sessao, senha: string) {
  if (s.perfil !== 'DONO') throw new RegraNegocioError('Só o dono pode excluir a conta.');
  const u = await db().selectFrom('Usuario').select('SenhaHash').where('Id', '=', s.usuarioId).executeTakeFirstOrThrow();
  if (!verificarSenha(senha, u.SenhaHash)) throw new RegraNegocioError('Senha incorreta.');
  const empresa = await obterEmpresa(s.empresaId);
  if (empresa.gatewayAssinaturaId) await cancelarAssinatura(empresa.gatewayAssinaturaId).catch(() => undefined);
  const id = s.empresaId;
  await db().transaction().execute(async trx => {
    for (const t of ['ParcelaCrediario', 'ItemVenda', 'Venda', 'Cliente', 'Produto', 'Categoria', 'FormaPagamento', 'Usuario'] as const)
      await trx.deleteFrom(t).where('EmpresaId', '=', id).execute();
    await trx.deleteFrom('Empresa').where('Id', '=', id).execute();
  });
}
