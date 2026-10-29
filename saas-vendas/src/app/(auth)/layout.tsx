import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="fundo-grade min-h-screen bg-gradient-to-b from-marca-50 via-[#f6f5fb] to-[#f6f5fb]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-8 sm:py-14">
        <Link href="/" className="mx-auto mb-8" aria-label="Início"><Logo /></Link>
        <div className="card animate-entrar p-6 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/termos" className="hover:text-marca-700">Termos de uso</Link> · <Link href="/privacidade" className="hover:text-marca-700">Política de privacidade</Link>
        </p>
      </div>
    </div>
  );
}
