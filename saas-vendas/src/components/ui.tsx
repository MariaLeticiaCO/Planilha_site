import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { corMargem } from '@/domain/calculadora';
import { formatarPercentual } from '@/domain/formatos';

export function Cabecalho({ titulo, subtitulo, voltar, acoes }: { titulo: ReactNode; subtitulo?: ReactNode; voltar?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {voltar && (
        <Link href={voltar} className="-ml-2 rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-800" aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="titulo-pagina truncate">{titulo}</h1>
        {subtitulo && <p className="subtitulo mt-0.5">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function Vazio({ icone, titulo, texto, acao }: { icone?: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icone && <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-marca-50 text-marca-600">{icone}</span>}
      <p className="font-semibold text-slate-800">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function ChipMargem({ margem }: { margem: number }) {
  const cor = corMargem(margem);
  return <span className={cor === 'verde' ? 'chip-verde' : cor === 'amarelo' ? 'chip-amarelo' : 'chip-vermelho'} title="Margem">{formatarPercentual(margem)}</span>;
}

export function ChipSituacao({ situacao, diasAtraso }: { situacao: string; diasAtraso?: number }) {
  if (situacao === 'PAGA') return <span className="chip-verde">Paga</span>;
  if (situacao === 'CANCELADA') return <span className="chip-cinza">Cancelada</span>;
  if (situacao === 'ATRASADA')
    return <span className="chip-vermelho">{diasAtraso ? `${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'} de atraso` : 'Atrasada'}</span>;
  return <span className="chip-amarelo">A vencer</span>;
}

export function Avatar({ nome, tamanho = 'h-10 w-10 text-sm' }: { nome: string; tamanho?: string }) {
  const p = nome.trim().split(/\s+/);
  const ini = (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0]?.[0] ?? '?').toUpperCase();
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marca-100 to-marca-200 font-bold text-marca-800 ${tamanho}`}>{ini}</span>;
}
