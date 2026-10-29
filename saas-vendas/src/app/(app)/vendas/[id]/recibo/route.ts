import { idDaUrl, rota } from '@/server/rota';
import { obterVenda } from '@/server/services/vendas';
import { obterEmpresa } from '@/server/contexto';
import { reciboPdf } from '@/server/infra/exportar';

export const dynamic = 'force-dynamic';

export const GET = rota(async (s, req) => {
  const id = idDaUrl(req, 2);
  const venda = await obterVenda(s, id);
  const empresa = await obterEmpresa(s.empresaId);
  const pdf = await reciboPdf(venda, empresa.nome, empresa.telefone);
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="recibo-${id}.pdf"` }
  });
});
