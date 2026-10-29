import { NextResponse } from 'next/server';
import { rota } from '@/server/rota';
import { buscarProdutosVenda } from '@/server/services/cadastros';

export const dynamic = 'force-dynamic';

export const GET = rota(async (s, req) => NextResponse.json(await buscarProdutosVenda(s, new URL(req.url).searchParams.get('q'), 30)));
