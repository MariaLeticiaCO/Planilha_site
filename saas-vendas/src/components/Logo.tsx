import { TrendingUp } from 'lucide-react';

export function Logo({ compacto = false, claro = false }: { compacto?: boolean; claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-flex ${compacto ? 'h-8 w-8' : 'h-9 w-9'} items-center justify-center rounded-xl bg-gradient-to-br from-marca-500 to-marca-800 text-white shadow-destaque`}>
        <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-[15px] font-extrabold tracking-tight ${claro ? 'text-white' : 'text-slate-900'}`}>Controle de Vendas</span>
        <span className={`block text-[11px] font-medium ${claro ? 'text-marca-200' : 'text-slate-500'}`}>lucro de verdade</span>
      </span>
    </span>
  );
}
