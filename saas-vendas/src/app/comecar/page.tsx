import { redirect } from 'next/navigation';
import { exigirDono } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { FORMAS_PADRAO, listarSetores } from '@/server/services/onboarding';
import { Logo } from '@/components/Logo';
import { Wizard } from './Wizard';

export const metadata = { title: 'Configuração inicial' };
export const dynamic = 'force-dynamic';

export default async function Comecar() {
  const s = await exigirDono();
  if ((await obterEmpresa(s.empresaId)).onboardingConcluido) redirect('/painel');
  return (
    <div className="fundo-grade min-h-screen bg-gradient-to-b from-marca-50 via-[#f6f5fb] to-[#f6f5fb]">
      <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Wizard setores={await listarSetores()} formas={FORMAS_PADRAO} nome={s.nome.split(' ')[0]} />
      </div>
    </div>
  );
}
