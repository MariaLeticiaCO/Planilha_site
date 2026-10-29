'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from './Toaster';

/** Botão que chama uma server action (com confirmação opcional), mostra o resultado e atualiza a tela. */
export function BotaoAcao({ acao, confirmar, className = 'btn-secundario', children, titulo }: {
  acao: () => Promise<{ ok: boolean; erro?: string; mensagem?: string } | void>;
  confirmar?: string;
  className?: string;
  children: ReactNode;
  titulo?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <button type="button" className={className} disabled={pendente} title={titulo}
      onClick={() => {
        if (confirmar && !window.confirm(confirmar)) return;
        iniciar(async () => {
          const r = await acao();
          if (r && !r.ok && r.erro) toast(r.erro, 'erro');
          else if (r && r.mensagem) toast(r.mensagem);
          router.refresh();
        });
      }}>
      {pendente && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
