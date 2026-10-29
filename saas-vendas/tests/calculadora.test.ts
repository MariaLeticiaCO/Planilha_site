import { describe, expect, it } from 'vitest';
import { calcularLucro, calcularMargem, calcularTaxa, descontoPercentualEmReais, precoSugerido, valorRecebido, corMargem } from '@/domain/calculadora';

describe('CalculadoraLucro', () => {
  it('taxa = (bruto − desconto) × % + fixa', () => {
    expect(calcularTaxa(100, 10, 4.99, 0.5)).toBe(4.99);
  });
  it('taxa zero quando a venda fica zerada', () => {
    expect(calcularTaxa(50, 50, 3, 1)).toBe(0);
  });
  it('lucro desconta desconto, taxa e custo', () => {
    expect(calcularLucro(12, 1.2, 0.54, 4)).toBe(6.26);
  });
  it('lucro pode ser negativo', () => {
    expect(calcularLucro(10, 0, 0, 12)).toBe(-2);
  });
  it('desconto maior que o bruto ou negativo é rejeitado', () => {
    expect(() => calcularTaxa(10, 10.01, 0, 0)).toThrow();
    expect(() => calcularLucro(10, -1, 0, 0)).toThrow();
  });
  it.each([[200, 10, 20], [33.33, 10, 3.33], [100, 100, 100]])('desconto %% em R$ (%s, %s%%)', (bruto, pct, esperado) => {
    expect(descontoPercentualEmReais(bruto, pct)).toBe(esperado);
  });
  it('desconto acima de 100% é rejeitado', () => {
    expect(() => descontoPercentualEmReais(100, 101)).toThrow();
  });
  it.each([[1.2, 3.5, 65.71], [10, 10, 0], [5, 0, 0], [12, 10, -20]])('margem sobre o preço (%s, %s)', (custo, preco, esperado) => {
    expect(calcularMargem(custo, preco)).toBe(esperado);
  });
  it('preço sugerido atinge a margem desejada', () => {
    expect(precoSugerido(6, 40)).toBe(10);
    expect(calcularMargem(6, 10)).toBe(40);
  });
  it('simulador de venda de R$ 100', () => {
    expect(valorRecebido(100, 3.49, 0)).toBe(96.51);
  });
  it('cores da margem', () => {
    expect([corMargem(31), corMargem(30), corMargem(15), corMargem(14.9)]).toEqual(['verde', 'amarelo', 'amarelo', 'vermelho']);
  });
});
