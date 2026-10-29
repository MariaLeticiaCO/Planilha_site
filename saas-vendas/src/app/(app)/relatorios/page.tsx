import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { exigirDono } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { gerarRelatorio, TIPOS_RELATORIO } from '@/server/services/relatorios';
import { formatarValor } from '@/server/infra/exportar';
import { hoje } from '@/domain/datas';
import { Cabecalho } from '@/components/ui';
import { FiltroAuto } from '@/components/FiltroAuto';

export const metadata = { title: 'Relatórios' };
export const dynamic = 'force-dynamic';

const data = (v: string | undefined, padrao: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : padrao);

/** T15 — Relatórios. Exportar em PDF ou Excel é do plano Pro. */
export default async function Relatorios({ searchParams }: { searchParams: Promise<{ tipo?: string; inicio?: string; fim?: string }> }) {
  const s = await exigirDono();
  const b = await searchParams;
  const h = hoje();
  const tipo = TIPOS_RELATORIO.some(t => t.chave === b.tipo) ? b.tipo! : 'vendas';
  const inicio = data(b.inicio, `${h.slice(0, 7)}-01`);
  const fim = data(b.fim, h);
  const [r, empresa] = await Promise.all([gerarRelatorio(s, tipo, inicio, fim), obterEmpresa(s.empresaId)]);
  const exportar = (f: string) => `/relatorios/exportar?${new URLSearchParams({ tipo, formato: f, inicio, fim })}`;
  const direita = (t: string) => (t !== 'texto' ? 'text-right' : '');

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo={TIPOS_RELATORIO.find(t => t.chave === tipo)?.descricao}
        acoes={empresa.temRecursosPro ? (
          <>
            <a href={exportar('pdf')} className="btn-secundario btn-sm"><Download className="h-4 w-4" /> PDF</a>
            <a href={exportar('excel')} className="btn-secundario btn-sm"><Download className="h-4 w-4" /> Excel</a>
          </>
        ) : <Link href="/assinatura" className="btn-suave btn-sm"><Lock className="h-4 w-4" /> Exportar (Pro)</Link>} />

      <FiltroAuto className="card-p grid grid-cols-2 gap-3 md:grid-cols-4 md:items-end">
        <div className="col-span-2">
          <label htmlFor="tipo" className="rotulo">Relatório</label>
          <select id="tipo" name="tipo" defaultValue={tipo} className="campo" data-auto>
            {TIPOS_RELATORIO.map(t => <option key={t.chave} value={t.chave}>{t.nome}</option>)}
          </select>
        </div>
        {tipo !== 'crediario-cliente' && (
          <>
            <div><label htmlFor="inicio" className="rotulo">De</label><input id="inicio" name="inicio" type="date" defaultValue={inicio} className="campo" data-auto /></div>
            <div><label htmlFor="fim" className="rotulo">Até</label><input id="fim" name="fim" type="date" defaultValue={fim} className="campo" data-auto /></div>
          </>
        )}
      </FiltroAuto>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-bold">{r.titulo}</h2><p className="text-xs text-slate-500">{r.subtitulo}</p>
        </div>
        {r.linhas.length === 0 ? <p className="p-10 text-center text-slate-500">Nada para mostrar nesse período.</p> : (
          <div className="overflow-x-auto">
            <table className="tabela whitespace-nowrap">
              <thead><tr>{r.colunas.map(c => <th key={c.titulo} className={direita(c.tipo)}>{c.titulo}</th>)}</tr></thead>
              <tbody>
                {r.linhas.map((l, i) => (
                  <tr key={i}>
                    {r.colunas.map((c, j) => (
                      <td key={j} className={`${direita(c.tipo)} ${c.tipo === 'moeda' && typeof l[j] === 'number' && (l[j] as number) < 0 ? 'text-rose-600' : ''}`}>
                        {tipo === 'curva-abc' && j === 0 ? <span className={l[0] === 'A' ? 'chip-verde' : l[0] === 'B' ? 'chip-amarelo' : 'chip-cinza'}>{l[0]}</span> : formatarValor(c, l[j])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {r.totais && (
                <tfoot><tr className="bg-marca-50/60 font-bold">{r.colunas.map((c, j) => <td key={j} className={`px-4 py-3 ${direita(c.tipo)}`}>{formatarValor(c, r.totais![j])}</td>)}</tr></tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </>
  );
}
