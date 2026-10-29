'use client';

import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Formulário GET de filtros: selects com data-auto enviam ao mudar; a busca envia no Enter. */
export function FiltroAuto({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const enviar = (form: HTMLFormElement) => {
    const q = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (String(v)) q.set(k, String(v)); });
    router.push(`${caminho}?${q}`);
  };
  return (
    <form className={className} onSubmit={e => { e.preventDefault(); enviar(e.currentTarget); }}
      onChange={e => { if ((e.target as HTMLElement).hasAttribute('data-auto')) enviar(e.currentTarget); }}>
      {children}
    </form>
  );
}
