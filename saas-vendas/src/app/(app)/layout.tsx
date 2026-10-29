import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';
import { obterSessao } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { MenuLateral, BarraInferior } from '@/components/Navegacao';
import { Avatar } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { NaoEncontradoError } from '@/domain/tipos';

export const dynamic = 'force-dynamic';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const s = await obterSessao();
  if (!s) redirect('/login');
  let empresa;
  try { empresa = await obterEmpresa(s.empresaId); } catch (e) { if (e instanceof NaoEncontradoError) redirect('/login'); throw e; }
  // Quem ainda não fez a configuração inicial vai para o onboarding.
  if (!empresa.onboardingConcluido) redirect(s.perfil === 'DONO' ? '/comecar' : '/acesso-negado');
  const dono = s.perfil === 'DONO';

  return (
    <div className="min-h-screen">
      <MenuLateral nome={s.nome} empresa={empresa.nome} dono={dono} />
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
            <Link href="/painel"><Logo compacto /></Link>
            <Link href="/configuracoes" aria-label="Minha conta"><Avatar nome={s.nome} tamanho="h-9 w-9 text-xs" /></Link>
          </div>
        </header>

        {!empresa.assinaturaAtiva ? (
          <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" />{empresa.plano === 'TESTE' ? 'Seu teste grátis acabou.' : 'Sua assinatura venceu.'} Você vê o painel, mas não registra vendas novas.</span>
              {dono && <Link href="/assinatura" className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-rose-700">Renovar agora</Link>}
            </div>
          </div>
        ) : empresa.plano === 'TESTE' && dono ? (
          <div className="border-b border-marca-100 bg-gradient-to-r from-marca-50 to-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
              <span className="flex items-center gap-1.5 text-marca-800"><Sparkles className="h-4 w-4" />Teste grátis: <b>{empresa.diasRestantesTrial} {empresa.diasRestantesTrial === 1 ? 'dia restante' : 'dias restantes'}</b></span>
              <Link href="/assinatura" className="font-semibold text-marca-700 hover:underline">Ver planos</Link>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8 mb-nav">{children}</main>
      </div>
      <BarraInferior nome={s.nome} empresa={empresa.nome} dono={dono} />
    </div>
  );
}
