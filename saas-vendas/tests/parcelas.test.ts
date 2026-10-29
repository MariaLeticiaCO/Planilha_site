import { describe, expect, it } from 'vitest';
import { gerarParcelas } from '@/domain/parcelas';

describe('GeradorParcelas', () => {
  it('diferença de centavos vai para a última', () => {
    const p = gerarParcelas(100, 3, '2026-11-10');
    expect(p.map(x => x.valor)).toEqual([33.33, 33.33, 33.34]);
  });
  it('vencimentos a cada 30 dias', () => {
    expect(gerarParcelas(90, 3, '2026-11-10').map(x => x.vencimento)).toEqual(['2026-11-10', '2026-12-10', '2027-01-09']);
  });
  it.each([[10, 3], [0.05, 4], [1234.56, 12], [999.99, 7]])('soma é sempre o valor líquido (%s em %sx)', (valor, qtd) => {
    const p = gerarParcelas(valor, qtd, '2026-11-10');
    expect(p).toHaveLength(qtd);
    expect(Math.round(p.reduce((t, x) => t + x.valor, 0) * 100) / 100).toBe(valor);
  });
  it('quantidade fora do limite e valor zero são rejeitados', () => {
    expect(() => gerarParcelas(100, 0, '2026-11-10')).toThrow();
    expect(() => gerarParcelas(100, 25, '2026-11-10')).toThrow();
    expect(() => gerarParcelas(0, 2, '2026-11-10')).toThrow();
  });
});
