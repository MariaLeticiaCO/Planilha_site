import 'server-only';
import { cache } from 'react';
import { db, bool, num } from './db/conexao';
import { agora, lerData } from '@/domain/datas';
import { assinaturaAtiva, diasRestantesTrial, limiteProdutos, limiteUsuarios, temRecursosPro } from '@/domain/planos';
import type { Plano, StatusAssinatura } from '@/domain/tipos';
import { NaoEncontradoError, RecursoProError } from '@/domain/tipos';

export interface EmpresaContexto {
  id: number;
  nome: string;
  setorId: number | null;
  telefone: string | null;
  logoUrl: string | null;
  plano: Plano;
  statusAssinatura: StatusAssinatura;
  dataFimTrial: string;
  dataFimAssinatura: string | null;
  gatewayClienteId: string | null;
  gatewayAssinaturaId: string | null;
  permitirEstoqueNegativo: boolean;
  onboardingConcluido: boolean;
  assinaturaAtiva: boolean;
  diasRestantesTrial: number;
  temRecursosPro: boolean;
  limiteProdutos: number;
  limiteUsuarios: number;
}

/** Empresa da sessão, lida uma vez por requisição. */
export const obterEmpresa = cache(async (empresaId: number): Promise<EmpresaContexto> => {
  const e = await db().selectFrom('Empresa').selectAll().where('Id', '=', empresaId).executeTakeFirst();
  if (!e) throw new NaoEncontradoError('Empresa');
  const estado = {
    plano: e.Plano as Plano,
    statusAssinatura: e.StatusAssinatura as StatusAssinatura,
    dataFimTrial: lerData(e.DataFimTrial),
    dataFimAssinatura: e.DataFimAssinatura ? lerData(e.DataFimAssinatura) : null
  };
  const a = agora();
  return {
    id: e.Id,
    nome: e.Nome,
    setorId: e.SetorId == null ? null : num(e.SetorId),
    telefone: e.Telefone,
    logoUrl: e.LogoUrl,
    ...estado,
    gatewayClienteId: e.GatewayClienteId,
    gatewayAssinaturaId: e.GatewayAssinaturaId,
    permitirEstoqueNegativo: bool(e.PermitirEstoqueNegativo),
    onboardingConcluido: bool(e.OnboardingConcluido),
    assinaturaAtiva: assinaturaAtiva(estado, a),
    diasRestantesTrial: diasRestantesTrial(estado, a),
    temRecursosPro: temRecursosPro(estado.plano),
    limiteProdutos: limiteProdutos(estado.plano),
    limiteUsuarios: limiteUsuarios(estado.plano)
  };
});

export async function exigirPro(empresaId: number, recurso: string) {
  if (!(await obterEmpresa(empresaId)).temRecursosPro) throw new RecursoProError(recurso);
}
