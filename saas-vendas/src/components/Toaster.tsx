'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type Toast = { id: number; mensagem: string; tipo: 'sucesso' | 'erro' };

/** Mostra uma mensagem rápida no topo da tela. */
export function toast(mensagem: string, tipo: Toast['tipo'] = 'sucesso') {
  window.dispatchEvent(new CustomEvent('cv:toast', { detail: { mensagem, tipo } }));
}

/** Lê a mensagem deixada pelo servidor (cookie cv.flash) e as enviadas por toast(). */
export function Toaster() {
  const [lista, setLista] = useState<Toast[]>([]);
  const caminho = usePathname();

  useEffect(() => {
    const adicionar = (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setLista(l => [...l, { ...t, id }]);
      setTimeout(() => setLista(l => l.filter(x => x.id !== id)), 4500);
    };
    const ouvir = (e: Event) => adicionar((e as CustomEvent).detail);
    window.addEventListener('cv:toast', ouvir);
    const flash = document.cookie.split('; ').find(c => c.startsWith('cv.flash='));
    if (flash) {
      document.cookie = 'cv.flash=; Max-Age=0; path=/';
      try { adicionar(JSON.parse(decodeURIComponent(decodeURIComponent(flash.slice(9))))); } catch { /* ignora */ }
    }
    return () => window.removeEventListener('cv:toast', ouvir);
  }, [caminho]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {lista.map(t => (
        <div key={t.id} role={t.tipo === 'erro' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-md animate-entrar items-start gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-xl ${t.tipo === 'erro' ? 'bg-rose-600' : 'bg-slate-900'}`}>
          {t.tipo === 'erro' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
          <span className="flex-1">{t.mensagem}</span>
          <button onClick={() => setLista(l => l.filter(x => x.id !== t.id))} aria-label="Fechar" className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
