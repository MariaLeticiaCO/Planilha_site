import 'server-only';
import { NextResponse } from 'next/server';
import { RegraNegocioError } from '@/domain/tipos';
import { obterSessao, type Sessao } from './sessao';

/** Route handlers da área logada: exige sessão e converte regra de negócio em JSON 400. */
export function rota(fn: (s: Sessao, req: Request) => Promise<Response>, opcoes: { somenteDono?: boolean } = {}) {
  return async (req: Request) => {
    const s = await obterSessao();
    if (!s) return NextResponse.json({ ok: false, erro: 'Sua sessão expirou. Entre de novo.', redirect: '/login' }, { status: 401 });
    if (opcoes.somenteDono && s.perfil !== 'DONO') return NextResponse.json({ ok: false, erro: 'Área restrita ao dono.' }, { status: 403 });
    try {
      return await fn(s, req);
    } catch (e) {
      if (e instanceof RegraNegocioError) return NextResponse.json({ ok: false, erro: e.message }, { status: 400 });
      console.error('[erro]', e);
      return NextResponse.json({ ok: false, erro: 'Algo deu errado. Tente de novo em instantes.' }, { status: 500 });
    }
  };
}

export const idDaUrl = (req: Request, posicaoDoFim: number) => Number(new URL(req.url).pathname.split('/').at(-posicaoDoFim));
