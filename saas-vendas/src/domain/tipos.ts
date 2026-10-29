// Enums gravados como texto no banco (mesmos valores do controle_vendas_schema.sql).

export const TIPOS_PAGAMENTO = ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO', 'CREDIARIO'] as const;
export type TipoPagamento = (typeof TIPOS_PAGAMENTO)[number];

export type StatusVenda = 'CONCLUIDA' | 'CANCELADA';
/** ATRASADA não é gravada: é calculada na view vw_ParcelasCrediario. */
export type StatusParcela = 'ABERTA' | 'PAGA' | 'CANCELADA';
export type SituacaoParcela = 'ABERTA' | 'ATRASADA' | 'PAGA';
export type Plano = 'TESTE' | 'BASICO' | 'PRO';
export type StatusAssinatura = 'TRIAL' | 'ATIVA' | 'VENCIDA' | 'CANCELADA';
export type Perfil = 'DONO' | 'VENDEDOR';

export const NOME_TIPO_PAGAMENTO: Record<TipoPagamento, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  CREDIARIO: 'Crediário'
};

/** Erro de regra de negócio: a mensagem é mostrada ao usuário. */
export class RegraNegocioError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RegraNegocioError';
  }
}

export class RecursoProError extends RegraNegocioError {
  constructor(recurso: string) {
    super(`${recurso} faz parte do plano Pro. Faça o upgrade em Assinatura.`);
  }
}

export class NaoEncontradoError extends RegraNegocioError {
  constructor(oQue: string) {
    super(`Não encontramos este registro (${oQue.toLowerCase()}).`);
  }
}
