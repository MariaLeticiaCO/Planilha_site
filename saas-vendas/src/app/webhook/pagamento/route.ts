import { NextResponse } from 'next/server';
import { iguaisTempoConstante } from '@/server/seguranca';
import { processarWebhook, type EventoWebhook } from '@/server/services/assinatura';

export const dynamic = 'force-dynamic';

/** Retorno do gateway (Asaas). Valida o token (header asaas-access-token) antes de aceitar a chamada. */
export async function POST(req: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = req.headers.get('asaas-access-token') ?? '';
  if (!esperado || !iguaisTempoConstante(esperado, recebido)) {
    console.warn('[webhook] recusado: token inválido');
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const evento = (await req.json().catch(() => ({}))) as EventoWebhook;
  console.info(`[webhook] ${evento.event} pagamento ${evento.payment?.id ?? '-'}`);
  await processarWebhook(evento);
  return NextResponse.json({ recebido: true });
}
