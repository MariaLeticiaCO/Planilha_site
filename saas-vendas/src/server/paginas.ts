import 'server-only';
import { notFound } from 'next/navigation';
import { NaoEncontradoError } from '@/domain/tipos';

/** Em páginas: registro inexistente (ou de outra empresa) vira 404. */
export async function ou404<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof NaoEncontradoError) notFound();
    throw e;
  }
}

export const idValido = (v: string) => (/^\d+$/.test(v) ? Number(v) : notFound());
