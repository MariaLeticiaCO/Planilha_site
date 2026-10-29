import { RegraNegocioError } from './tipos';
import { somarDias } from './datas';

export const INTERVALO_DIAS = 30;
export const MAX_PARCELAS = 24;

export interface ParcelaGerada {
  numero: number;
  valor: number;
  /** yyyy-MM-dd */
  vencimento: string;
}

/**
 * Valor líquido dividido pela quantidade, com a diferença de centavos na última.
 * O 1º vencimento vem da tela e os seguintes caem a cada 30 dias.
 */
export function gerarParcelas(valorLiquido: number, quantidade: number, primeiroVencimento: string): ParcelaGerada[] {
  if (!(valorLiquido > 0)) throw new RegraNegocioError('O valor do crediário precisa ser maior que zero.');
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_PARCELAS)
    throw new RegraNegocioError(`Informe de 1 a ${MAX_PARCELAS} parcelas.`);

  const totalCentavos = Math.round(valorLiquido * 100);
  const parcelaCentavos = Math.floor(totalCentavos / quantidade);
  const ultimaCentavos = totalCentavos - parcelaCentavos * (quantidade - 1);

  return Array.from({ length: quantidade }, (_, i) => ({
    numero: i + 1,
    valor: (i === quantidade - 1 ? ultimaCentavos : parcelaCentavos) / 100,
    vencimento: somarDias(primeiroVencimento.slice(0, 10), INTERVALO_DIAS * i)
  }));
}
