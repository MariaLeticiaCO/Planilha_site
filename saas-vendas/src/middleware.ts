import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

/**
 * Protege a área logada e renova o cookie de sessão (7 dias com renovação).
 * Regras finas (perfil Dono, onboarding, assinatura) ficam nas páginas e nos services.
 */
const PUBLICAS = ['/', '/login', '/cadastro', '/recuperar-senha', '/termos', '/privacidade', '/offline', '/webhook/pagamento', '/manifest.webmanifest', '/acesso-negado'];
const COOKIE = 'cv.sessao';
const SETE_DIAS = 7 * 24 * 60 * 60;

function chave() {
  const s = process.env.SESSION_SECRET;
  return new TextEncoder().encode(s && s.length >= 32 ? s : 'segredo-de-desenvolvimento-troque-em-producao-123456');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  let payload: Record<string, unknown> | null = null;
  if (token) {
    try { payload = (await jwtVerify(token, chave())).payload as Record<string, unknown>; } catch { payload = null; }
  }

  if (PUBLICAS.includes(pathname)) {
    // Quem já está logado vai direto para o painel.
    if (payload && ['/', '/login', '/cadastro'].includes(pathname)) return NextResponse.redirect(new URL('/painel', req.url));
    return NextResponse.next();
  }

  if (!payload) {
    const ajax = req.headers.get('accept')?.includes('application/json') || req.method !== 'GET';
    if (ajax && !req.headers.get('next-action'))
      return NextResponse.json({ ok: false, erro: 'Sua sessão expirou. Entre de novo.', redirect: '/login' }, { status: 401 });
    const url = new URL('/login', req.url);
    if (req.method === 'GET') url.searchParams.set('returnUrl', pathname + req.nextUrl.search);
    const r = NextResponse.redirect(url);
    if (token) r.cookies.delete(COOKIE);
    return r;
  }

  // Renovação: se passou mais de 1 dia desde a emissão, emite de novo por mais 7 dias.
  const resposta = NextResponse.next();
  const emitido = Number(payload.iat ?? 0);
  const persistente = Number(payload.exp ?? 0) - emitido > 24 * 60 * 60;
  if (persistente && Date.now() / 1000 - emitido > 24 * 60 * 60) {
    const { iat: _iat, exp: _exp, ...dados } = payload;
    const novo = await new SignJWT(dados).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(chave());
    resposta.cookies.set(COOKIE, novo, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: SETE_DIAS,
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSEGURO !== 'true'
    });
  }
  return resposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|img/|uploads/|sw.js|robots.txt).*)']
};
