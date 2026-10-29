import { NextResponse } from 'next/server';
import { rota } from '@/server/rota';
import { buscarClientes } from '@/server/services/cadastros';

export const dynamic = 'force-dynamic';

export const GET = rota(async (s, req) => NextResponse.json(await buscarClientes(s, new URL(req.url).searchParams.get('q') ?? '')));
