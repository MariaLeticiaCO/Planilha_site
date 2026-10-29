import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import type { Perfil } from '@/domain/tipos';

/**
 * Sessão em cookie HttpOnly + Secure com JWT assinado (HS256).
 * Expira em 7 dias e é renovada a cada acesso (middleware).
 * O EmpresaId vem daqui — nunca da tela.
 */
export const COOKIE_SESSAO = 'cv.sessao';
export const DURACAO_SESSAO = 7 * 24 * 60 * 60;

export interface Sessao {
  usuarioId: number;
  empresaId: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export function chaveSessao(): Uint8Array {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_PROVIDER !== 'sqlite')
      throw new Error('Defina SESSION_SECRET (mínimo de 32 caracteres).');
    return new TextEncoder().encode('segredo-de-desenvolvimento-troque-em-producao-123456');
  }
  return new TextEncoder().encode(segredo);
}

export async function assinarSessao(s: Sessao, persistente = true): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(persistente ? '7d' : '12h')
    .sign(chaveSessao());
}

export async function lerToken(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chaveSessao());
    return {
      usuarioId: Number(payload.usuarioId),
      empresaId: Number(payload.empresaId),
      nome: String(payload.nome),
      email: String(payload.email),
      perfil: payload.perfil === 'VENDEDOR' ? 'VENDEDOR' : 'DONO'
    };
  } catch {
    return null;
  }
}

export async function entrar(s: Sessao, persistente = true) {
  (await cookies()).set(COOKIE_SESSAO, await assinarSessao(s, persistente), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSEGURO !== 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: persistente ? DURACAO_SESSAO : undefined
  });
}

export async function sair() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function obterSessao(): Promise<Sessao | null> {
  return lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
}

/** Para páginas e ações da área logada. */
export async function exigirSessao(): Promise<Sessao> {
  const s = await obterSessao();
  if (!s) redirect('/login');
  return s;
}

export async function exigirDono(): Promise<Sessao> {
  const s = await exigirSessao();
  if (s.perfil !== 'DONO') redirect('/acesso-negado');
  return s;
}
