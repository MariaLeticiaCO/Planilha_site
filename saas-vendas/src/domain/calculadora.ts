import { RegraNegocioError } from './tipos';

/**
 * Regras de cálculo da venda (seção 5 do documento):
 *   Taxa  = (Valor bruto − Desconto) × TaxaPercentual / 100 + TaxaFixa
 *   Lucro = (Valor bruto − Desconto) − Taxa − Custo dos itens
 */

/** Arredonda para centavos (meio para cima), evitando erros de ponto flutuante. */
export function arredondar(valor: number): number {
  const sinal = valor < 0 ? -1 : 1;
  return (sinal * Math.round(Math.abs(valor) * 100 + 1e-9)) / 100;
}

function validarDesconto(valorBruto: number, desconto: number) {
  if (desconto < 0) throw new RegraNegocioError('O desconto não pode ser negativo.');
  if (desconto > valorBruto + 1e-9) throw new RegraNegocioError('O desconto não pode ser maior que o valor da venda.');
}

export function calcularTaxa(valorBruto: number, desconto: number, taxaPercentual: number, taxaFixa: number): number {
  validarDesconto(valorBruto, desconto);
  const base = valorBruto - desconto;
  if (base <= 0) return 0;
  return arredondar((base * taxaPercentual) / 100 + taxaFixa);
}

export function calcularLucro(valorBruto: number, desconto: number, taxa: number, custoItens: number): number {
  validarDesconto(valorBruto, desconto);
  return arredondar(valorBruto - desconto - taxa - custoItens);
}

/** Desconto em % convertido para R$ (sobre o valor bruto). */
export function descontoPercentualEmReais(valorBruto: number, percentual: number): number {
  if (percentual < 0 || percentual > 100) throw new RegraNegocioError('O desconto deve ficar entre 0% e 100%.');
  return arredondar((valorBruto * percentual) / 100);
}

/** Margem sobre o preço de venda, em %. */
export function calcularMargem(custo: number, precoVenda: number): number {
  return precoVenda <= 0 ? 0 : arredondar(((precoVenda - custo) / precoVenda) * 100);
}

/** Preço que dá a margem desejada sobre o preço de venda. */
export function precoSugerido(custo: number, margemDesejada: number): number {
  if (margemDesejada >= 100) throw new RegraNegocioError('A margem precisa ser menor que 100%.');
  return arredondar(custo / (1 - margemDesejada / 100));
}

/** Quanto se recebe numa venda de `valor` com a taxa informada (simulador da T12). */
export function valorRecebido(valor: number, taxaPercentual: number, taxaFixa: number): number {
  return arredondar(valor - calcularTaxa(valor, 0, taxaPercentual, taxaFixa));
}

/** Cor da margem: verde acima de 30%, amarelo de 15% a 30%, vermelho abaixo. */
export function corMargem(margem: number): 'verde' | 'amarelo' | 'vermelho' {
  return margem > 30 ? 'verde' : margem >= 15 ? 'amarelo' : 'vermelho';
}
