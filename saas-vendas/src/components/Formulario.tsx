'use client';

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from './Toaster';

type Resultado = { ok: boolean; erro?: string; mensagem?: string; campos?: Record<string, string> } | null;

/** Mostra o toast do resultado de uma server action (useActionState). */
export function useResultado(estado: Resultado, aoSucesso?: () => void) {
  useEffect(() => {
    if (!estado) return;
    if (estado.ok && estado.mensagem) toast(estado.mensagem);
    if (!estado.ok && estado.erro && !estado.campos) toast(estado.erro, 'erro');
    if (estado.ok) aoSucesso?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}

export function Enviar({ children, className = 'btn-primario', pendente: textoPendente }: { children: ReactNode; className?: string; pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && textoPendente ? textoPendente : children}
    </button>
  );
}

export function ResumoErro({ estado }: { estado: Resultado }) {
  if (!estado || estado.ok || !estado.erro) return null;
  return <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{estado.erro}</div>;
}

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: ReactNode;
  nome: string;
  erro?: string;
  dica?: ReactNode;
}

export function Campo({ rotulo, nome, erro, dica, className, ...resto }: CampoProps) {
  return (
    <div className={className}>
      <label htmlFor={resto.id ?? nome} className="rotulo">{rotulo}</label>
      <input id={nome} name={nome} className={`campo ${erro ? 'campo-erro' : ''}`} aria-invalid={!!erro} aria-describedby={erro ? `${nome}-erro` : undefined} {...resto} />
      {erro ? <span id={`${nome}-erro`} className="erro-campo">{erro}</span> : dica ? <p className="dica">{dica}</p> : null}
    </div>
  );
}

const fmt = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Campo de dinheiro estilo maquininha: cada dígito entra no fim (1 → 0,01 → 0,12 → 1,23).
 * Envia o valor formatado ("1.234,56"); o servidor lê no formato brasileiro.
 */
export function CampoDinheiro({ rotulo, nome, erro, dica, valorInicial = 0, aoMudar, className, ...resto }:
  Omit<CampoProps, 'onChange' | 'value' | 'defaultValue'> & { valorInicial?: number; aoMudar?: (v: number) => void }) {
  const [centavos, setCentavos] = useState(Math.round((valorInicial ?? 0) * 100));
  const mudar = (c: number) => { setCentavos(c); aoMudar?.(c / 100); };
  return (
    <div className={className}>
      {rotulo && <label htmlFor={nome} className="rotulo">{rotulo}</label>}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">R$</span>
        <input
          id={nome} name={nome} inputMode="numeric" autoComplete="off" className={`campo pl-10 ${erro ? 'campo-erro' : ''}`}
          value={fmt(centavos)} aria-invalid={!!erro}
          onChange={e => mudar(Math.min(Number(e.target.value.replace(/\D/g, '') || 0), 99_999_999_99))}
          onKeyDown={e => {
            if (/^\d$/.test(e.key)) { e.preventDefault(); mudar(Math.min(centavos * 10 + Number(e.key), 99_999_999_99)); }
            else if (e.key === 'Backspace') { e.preventDefault(); mudar(Math.floor(centavos / 10)); }
          }}
          onFocus={e => { const el = e.currentTarget; setTimeout(() => el.setSelectionRange(el.value.length, el.value.length)); }}
          {...resto}
        />
      </div>
      {erro ? <span className="erro-campo">{erro}</span> : dica ? <p className="dica">{dica}</p> : null}
    </div>
  );
}

/** Máscara de telefone (11) 98765-4321. */
export function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraDocumento(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function CampoTelefone(props: CampoProps & { valorInicial?: string | null }) {
  const { valorInicial, ...resto } = props;
  const [v, setV] = useState(mascaraTelefone(valorInicial ?? ''));
  return <Campo {...resto} inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" value={v} onChange={e => setV(mascaraTelefone(e.target.value))} />;
}

export function CampoDocumento(props: CampoProps & { valorInicial?: string | null }) {
  const { valorInicial, ...resto } = props;
  const [v, setV] = useState(mascaraDocumento(valorInicial ?? ''));
  return <Campo {...resto} inputMode="numeric" value={v} onChange={e => setV(mascaraDocumento(e.target.value))} />;
}
