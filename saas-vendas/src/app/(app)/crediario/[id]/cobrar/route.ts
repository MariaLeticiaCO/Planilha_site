import { NextResponse } from 'next/server';
import { idDaUrl, rota } from '@/server/rota';
import { linkCobranca } from '@/server/services/crediario';

export const dynamic = 'force-dynamic';

/** Redireciona para o link do WhatsApp com a mensagem pronta. */
export const GET = rota(async (s, req) => NextResponse.redirect(await linkCobranca(s, idDaUrl(req, 2))));
