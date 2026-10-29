import { exigirDono } from '@/server/sessao';
import { obterEmpresa } from '@/server/contexto';
import { historico } from '@/server/services/assinatura';
import { gatewaySimulado } from '@/server/infra/asaas';
import { PLANOS } from '@/domain/planos';
import { Cabecalho } from '@/components/ui';
import { Assinatura } from './Assinatura';

export const metadata = { title: 'Assinatura' };
export const dynamic = 'force-dynamic';

/** T17 — Assinatura. */
export default async function PaginaAssinatura() {
  const s = await exigirDono();
  const [e, pagamentos] = await Promise.all([obterEmpresa(s.empresaId), historico(s)]);
  return (
    <>
      <Cabecalho titulo="Assinatura" />
      <Assinatura planos={PLANOS} pagamentos={pagamentos} simulado={gatewaySimulado()}
        status={{ plano: e.plano, status: e.statusAssinatura, ativa: e.assinaturaAtiva, diasTrial: e.diasRestantesTrial, fimTrial: e.dataFimTrial, fimAssinatura: e.dataFimAssinatura }} />
    </>
  );
}
