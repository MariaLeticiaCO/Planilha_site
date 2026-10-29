import Link from 'next/link';
import { Lock } from 'lucide-react';

export const metadata = { title: 'Acesso restrito' };

export default function AcessoNegado() {
  return (
    <div className="text-center">
      <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Lock className="h-6 w-6" /></span>
      <h1 className="text-xl font-bold">Esta área é só do dono</h1>
      <p className="mt-2 text-slate-600">Peça ao dono da conta se precisar de algo daqui.</p>
      <Link href="/painel" className="btn-primario mt-6 w-full">Voltar ao início</Link>
    </div>
  );
}
