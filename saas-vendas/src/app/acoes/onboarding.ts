'use server';

import { redirect } from 'next/navigation';
import { errosPorCampo, onboardingSchema } from '@/domain/validacao';
import { concluirOnboarding } from '@/server/services/onboarding';
import { exigirDono } from '@/server/sessao';
import { executar, flash, type Resultado } from '@/server/acao';

export async function concluirOnboardingAcao(dados: unknown): Promise<Resultado> {
  const s = await exigirDono();
  const v = onboardingSchema.safeParse(dados);
  if (!v.success) return { ok: false, erro: Object.values(errosPorCampo(v.error))[0], campos: errosPorCampo(v.error) };
  const r = await executar(() => concluirOnboarding(s, v.data));
  if (!r.ok) return r;
  await flash('Tudo pronto! Registre sua primeira venda e veja o lucro aparecer aqui.');
  redirect('/painel');
}
