import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { exigirSessao } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';

export const metadata = { title: 'Renove para continuar vendendo' };
export const dynamic = 'force-dynamic';

/** Tela de bloqueio quando o teste ou a assinatura vencer. */
export default async function Bloqueio() {
  const s = await exigirSessao();
  const e = await obterEmpresa(s.empresaId);
  if (e.assinaturaAtiva) redirect('/painel');
  return (
    <div className="card mx-auto mt-6 max-w-lg p-8 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Lock className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-extrabold">{e.plano === 'TESTE' ? 'Seu teste grátis acabou' : 'Sua assinatura venceu'}</h1>
      <p className="mt-2 text-slate-600">Seus dados estão guardados e você continua vendo o painel. Para registrar vendas novas, escolha um plano.</p>
      {s.perfil === 'DONO' ? <Link href="/assinatura" className="btn-primario btn-lg mt-6 w-full">Renovar agora</Link>
        : <p className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Avise o dono da conta para renovar a assinatura.</p>}
      <Link href="/painel" className="btn-secundario mt-3 w-full">Ver o painel</Link>
    </div>
  );
}
