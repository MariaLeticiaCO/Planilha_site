import type { Plano, StatusAssinatura } from './tipos';
import { paraDate } from './datas';

export type OpcaoPlano = 'BASICO' | 'PRO_MENSAL' | 'PRO_ANUAL';

export interface PlanoInfo {
  opcao: OpcaoPlano;
  plano: Plano;
  nome: string;
  preco: number;
  periodicidade: string;
  inclui: string[];
}

// Seção 1 do documento, "Modelo de cobrança".
export const PLANOS: PlanoInfo[] = [
  { opcao: 'BASICO', plano: 'BASICO', nome: 'Básico', preco: 29.9, periodicidade: 'pagamento único',
    inclui: ['1 usuário', 'Até 50 produtos', 'Dashboard de lucro', 'Registro de vendas'] },
  { opcao: 'PRO_MENSAL', plano: 'PRO', nome: 'Pro mensal', preco: 9.9, periodicidade: 'por mês',
    inclui: ['Produtos ilimitados', 'Crediário com cobrança no WhatsApp', '3 usuários', 'Relatórios em PDF e Excel'] },
  { opcao: 'PRO_ANUAL', plano: 'PRO', nome: 'Pro anual', preco: 89, periodicidade: 'por ano',
    inclui: ['Tudo do Pro mensal', '2 meses e meio grátis'] }
];

export function obterPlano(opcao: OpcaoPlano): PlanoInfo {
  const p = PLANOS.find(x => x.opcao === opcao);
  if (!p) throw new Error('Plano inválido');
  return p;
}

export const DIAS_TRIAL = 7;
export const DIAS_TOLERANCIA = 3;

export interface EstadoAssinatura {
  plano: Plano;
  statusAssinatura: StatusAssinatura;
  dataFimTrial: string;
  dataFimAssinatura: string | null;
}

/** Trial ou assinatura em dia: pode registrar vendas novas. */
export function assinaturaAtiva(e: EstadoAssinatura, agora: string): boolean {
  switch (e.statusAssinatura) {
    case 'TRIAL': return e.dataFimTrial >= agora;
    case 'ATIVA': return e.dataFimAssinatura == null || e.dataFimAssinatura >= agora;
    // Cancelada continua valendo até o fim do período já pago.
    case 'CANCELADA': return e.dataFimAssinatura != null && e.dataFimAssinatura >= agora;
    default: return false;
  }
}

export function diasRestantesTrial(e: EstadoAssinatura, agora: string): number {
  if (e.statusAssinatura !== 'TRIAL') return 0;
  return Math.max(0, Math.ceil((paraDate(e.dataFimTrial).getTime() - paraDate(agora).getTime()) / 86_400_000));
}

/** O teste dá acesso a tudo do Pro. */
export const temRecursosPro = (plano: Plano) => plano === 'PRO' || plano === 'TESTE';
export const limiteProdutos = (plano: Plano) => (temRecursosPro(plano) ? Number.MAX_SAFE_INTEGER : 50);
export const limiteUsuarios = (plano: Plano) => (temRecursosPro(plano) ? 3 : 1);
