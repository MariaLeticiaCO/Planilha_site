import { rota } from '@/server/rota';
import { gerarRelatorio } from '@/server/services/relatorios';
import { exigirPro, obterEmpresa } from '@/server/contexto';
import { relatorioExcel, relatorioPdf } from '@/server/infra/exportar';
import { hoje } from '@/domain/datas';

export const dynamic = 'force-dynamic';

/** GET /relatorios/exportar?tipo=&formato=pdf|excel&inicio=&fim= — exportar é do plano Pro. */
export const GET = rota(async (s, req) => {
  await exigirPro(s.empresaId, 'Exportar relatórios');
  const p = new URL(req.url).searchParams;
  const h = hoje();
  const data = (v: string | null, padrao: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : padrao);
  const r = await gerarRelatorio(s, p.get('tipo') ?? 'vendas', data(p.get('inicio'), `${h.slice(0, 7)}-01`), data(p.get('fim'), h));
  const nome = `${r.tipo}-${h}`;
  if (p.get('formato') === 'excel') {
    return new Response(new Uint8Array(await relatorioExcel(r)), {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${nome}.xlsx"` }
    });
  }
  const empresa = await obterEmpresa(s.empresaId);
  return new Response(new Uint8Array(await relatorioPdf(r, empresa.nome)), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nome}.pdf"` }
  });
}, { somenteDono: true });
