import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Início"><Logo /></Link>
          <nav className="flex items-center gap-2">
            <a href="/#planos" className="btn-fantasma hidden sm:inline-flex">Planos</a>
            <Link href="/login" className="btn-secundario">Entrar</Link>
            <Link href="/cadastro" className="btn-primario hidden min-[400px]:inline-flex">Testar grátis</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo compacto />
          <span className="flex gap-5">
            <Link href="/termos" className="hover:text-marca-700">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-marca-700">Privacidade</Link>
          </span>
          <span>© {new Date().getFullYear()} Controle de Vendas</span>
        </div>
      </footer>
    </div>
  );
}
