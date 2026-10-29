import 'server-only';
import { cookies } from 'next/headers';
import { RegraNegocioError } from '@/domain/tipos';

/** Resultado padrão das server actions usadas pelos formulários. */
export type Resultado<T = unknown> = { ok: true; dados?: T; mensagem?: string } | { ok: false; erro: string; campos?: Record<string, string> };

/**
 * Executa a ação e transforma regra de negócio em mensagem para a tela.
 * Erros inesperados são registrados no log e viram uma mensagem genérica.
 * (redirect() do Next lança um erro especial, que é repassado.)
 */
export async function executar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, dados: await fn() };
  } catch (e) {
    if (e instanceof RegraNegocioError) return { ok: false, erro: e.message };
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
    console.error('[erro]', e);
    return { ok: false, erro: 'Algo deu errado. Tente de novo em instantes.' };
  }
}

/** Mensagem que aparece como toast na próxima página (cookie de vida curta, lido no navegador). */
export async function flash(mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') {
  (await cookies()).set('cv.flash', encodeURIComponent(JSON.stringify({ mensagem, tipo })), { path: '/', maxAge: 30, sameSite: 'lax' });
}
