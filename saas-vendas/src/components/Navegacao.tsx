'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3, Boxes, Crown, CreditCard, Home, LogOut, Menu, Plus, Receipt, Settings, ShoppingCart, Tag, Users, Wallet, X
} from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './ui';
import { sairAcao } from '@/app/acoes/auth';

interface Props { nome: string; empresa: string; dono: boolean }

const itensPrincipais = (dono: boolean) => [
  { href: '/painel', rotulo: 'Início', icone: Home },
  { href: '/vendas/historico', rotulo: 'Vendas', icone: Receipt },
  ...(dono ? [{ href: '/produtos', rotulo: 'Produtos', icone: Boxes }, { href: '/categorias', rotulo: 'Categorias', icone: Tag }] : []),
  { href: '/clientes', rotulo: 'Clientes', icone: Users },
  { href: '/crediario', rotulo: 'Crediário', icone: Wallet },
  ...(dono ? [{ href: '/formas-pagamento', rotulo: 'Formas de pagamento', icone: CreditCard }, { href: '/relatorios', rotulo: 'Relatórios', icone: BarChart3 }] : [])
];

const ativo = (caminho: string, href: string) => caminho === href || caminho.startsWith(href + '/');

/** Menu lateral (computador). */
export function MenuLateral({ nome, empresa, dono }: Props) {
  const caminho = usePathname();
  const link = (href: string, rotulo: string, Icone: typeof Home) => (
    <Link key={href} href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${ativo(caminho, href) ? 'bg-marca-600 text-white shadow-sm shadow-marca-600/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      <Icone className={`h-[18px] w-[18px] ${ativo(caminho, href) ? '' : 'text-slate-400 group-hover:text-slate-600'}`} />
      {rotulo}
    </Link>
  );
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl lg:flex">
      <div className="px-5 pb-5 pt-6"><Link href="/painel"><Logo /></Link></div>
      <div className="px-4">
        <Link href="/vendas/nova" className="btn-primario w-full py-3"><Plus className="h-4 w-4" /> Nova venda</Link>
      </div>
      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-4">
        {itensPrincipais(dono).map(i => link(i.href, i.rotulo, i.icone))}
        <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Conta</p>
        {dono && link('/assinatura', 'Assinatura', Crown)}
        {link('/configuracoes', 'Configurações', Settings)}
      </nav>
      <div className="border-t border-slate-200/80 p-4">
        <div className="flex items-center gap-3">
          <Avatar nome={nome} tamanho="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{nome}</p>
            <p className="truncate text-xs text-slate-500">{empresa} · {dono ? 'Dono' : 'Vendedor'}</p>
          </div>
          <form action={sairAcao}>
            <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Sair" aria-label="Sair"><LogOut className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Barra inferior (celular): Início, Vender, Produtos, Crediário, Menu. */
export function BarraInferior({ nome, empresa, dono }: Props) {
  const caminho = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => setMenuAberto(false), [caminho]);
  if (caminho === '/vendas/nova') return null;

  const item = (href: string, rotulo: string, Icone: typeof Home) => (
    <Link href={href} className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${ativo(caminho, href) ? 'text-marca-700' : 'text-slate-500'}`}>
      <Icone className="h-6 w-6" strokeWidth={ativo(caminho, href) ? 2.4 : 2} />
      {rotulo}
    </Link>
  );

  return (
    <>
      <nav className="pb-seguro fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
        {item('/painel', 'Início', Home)}
        <Link href="/vendas/nova" className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <span className="-mt-6 mb-0.5 inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-marca-500 to-marca-700 text-white shadow-destaque ring-4 ring-[#f6f5fb]">
            <ShoppingCart className="h-6 w-6" />
          </span>
          Vender
        </Link>
        {dono ? item('/produtos', 'Produtos', Boxes) : item('/vendas/historico', 'Vendas', Receipt)}
        {item('/crediario', 'Crediário', Wallet)}
        <button onClick={() => setMenuAberto(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <Menu className="h-6 w-6" /> Menu
        </button>
      </nav>

      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setMenuAberto(false)} />
          <div className="pb-seguro absolute inset-x-0 bottom-0 max-h-[85vh] animate-subir overflow-y-auto rounded-t-3xl bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <Avatar nome={nome} />
              <div className="flex-1"><p className="font-semibold">{nome}</p><p className="text-xs text-slate-500">{empresa} · {dono ? 'Dono' : 'Vendedor'}</p></div>
              <button onClick={() => setMenuAberto(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...itensPrincipais(dono).filter(i => i.href !== '/painel'),
                ...(dono ? [{ href: '/assinatura', rotulo: 'Assinatura', icone: Crown }] : []),
                { href: '/configuracoes', rotulo: 'Configurações', icone: Settings }].map(i => (
                <Link key={i.href} href={i.href} className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 px-2 py-4 text-center text-xs font-semibold text-slate-700 active:bg-marca-50">
                  <i.icone className="h-6 w-6 text-marca-600" />
                  {i.rotulo}
                </Link>
              ))}
            </div>
            <form action={sairAcao} className="mt-3">
              <button className="btn-fantasma w-full text-rose-600"><LogOut className="h-4 w-4" /> Sair</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
