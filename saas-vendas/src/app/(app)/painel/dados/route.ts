import { NextResponse } from 'next/server';
import { rota } from '@/server/rota';
import { dadosPainel } from '@/server/services/painel';

export const dynamic = 'force-dynamic';

/** GET /painel/dados?periodo=hoje|semana|mes|ano|personalizado&inicio=&fim= — JSON com cards, série, pizza e rankings. */
export const GET = rota(async (s, req) => {
  const p = new URL(req.url).searchParams;
  return NextResponse.json(await dadosPainel(s, p.get('periodo'), p.get('inicio'), p.get('fim')));
}, { somenteDono: true });
