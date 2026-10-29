import { describe, expect, it } from 'vitest';
import { assinaturaAtiva, diasRestantesTrial, limiteProdutos, limiteUsuarios, temRecursosPro } from '@/domain/planos';
import { linkWhatsApp, lerNumero, formatarTelefone } from '@/domain/formatos';
import { aplicarPagamento, lerReferencia } from '@/server/services/assinatura';
import { calcularPeriodo, preencherSerie } from '@/server/services/painel';
import { hashSenha, verificarSenha } from '@/server/seguranca';

describe('Assinatura', () => {
  it('trial válido pode vender e expira', () => {
    const e = { plano: 'TESTE' as const, statusAssinatura: 'TRIAL' as const, dataFimTrial: '2026-10-31 12:00:00', dataFimAssinatura: null };
    expect(assinaturaAtiva(e, '2026-10-29 12:00:00')).toBe(true);
    expect(diasRestantesTrial(e, '2026-10-29 12:00:00')).toBe(2);
    expect(assinaturaAtiva(e, '2026-11-01 00:00:00')).toBe(false);
  });
  it('limites do Básico e teste com tudo do Pro', () => {
    expect([limiteProdutos('BASICO'), limiteUsuarios('BASICO'), limiteUsuarios('TESTE'), temRecursosPro('TESTE')]).toEqual([50, 1, 3, true]);
  });
  it('pagamento Pro mensal ativa e é idempotente', () => {
    const e = { plano: 'TESTE' as const, statusAssinatura: 'TRIAL' as const, dataFimTrial: '2026-10-01 00:00:00', dataFimAssinatura: null };
    const uma = aplicarPagamento(e, 'PRO_MENSAL', '2026-11-01');
    const duas = aplicarPagamento(uma, 'PRO_MENSAL', '2026-11-01');
    expect(uma).toMatchObject({ plano: 'PRO', statusAssinatura: 'ATIVA', dataFimAssinatura: '2026-12-04 23:59:59' });
    expect(duas.dataFimAssinatura).toBe(uma.dataFimAssinatura);
  });
  it('Básico é pagamento único sem data fim', () => {
    const e = aplicarPagamento({ plano: 'TESTE', statusAssinatura: 'TRIAL', dataFimTrial: '2026-10-01 00:00:00', dataFimAssinatura: null }, 'BASICO', '2026-10-29');
    expect(e).toMatchObject({ plano: 'BASICO', dataFimAssinatura: null });
    expect(assinaturaAtiva(e, '2031-01-01 00:00:00')).toBe(true);
  });
  it('referência externa do webhook', () => {
    expect(lerReferencia('empresa:12:PRO_ANUAL')).toEqual({ empresaId: 12, opcao: 'PRO_ANUAL' });
    expect(lerReferencia('empresa:x:PRO_ANUAL')).toBeNull();
    expect(lerReferencia(null)).toBeNull();
  });
});

describe('Formatos', () => {
  it('link do WhatsApp com 55 e mensagem codificada', () => {
    expect(linkWhatsApp('(11) 98765-4321', 'Olá, Ana!')).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Ana!');
    expect(linkWhatsApp(null, 'oi')).toBe('https://wa.me/?text=oi');
  });
  it('números no formato brasileiro', () => {
    expect([lerNumero('1.234,56'), lerNumero('12,5'), lerNumero('3.5'), lerNumero('')]).toEqual([1234.56, 12.5, 3.5, 0]);
    expect(formatarTelefone('5511987654321')).toBe('(11) 98765-4321');
  });
});

describe('Dashboard', () => {
  it('períodos', () => {
    const a = '2026-10-29 15:30:00'; // quinta-feira
    expect(calcularPeriodo('semana', null, null, a)).toMatchObject({ inicio: '2026-10-26', fim: '2026-11-02', agrupamento: 'DIA' });
    expect(calcularPeriodo(null, null, null, a)).toMatchObject({ chave: 'hoje', agrupamento: 'HORA' });
    expect(calcularPeriodo('ano', null, null, a)).toMatchObject({ agrupamento: 'MES', fim: '2027-01-01' });
    expect(calcularPeriodo('mes', null, null, a).texto).toBe('Outubro de 2026');
  });
  it('série completa os dias sem venda', () => {
    const s = preencherSerie([{ periodo: '2026-10-03 00:00:00', faturamento: 50, lucro: 20 }], '2026-10-01 00:00:00', '2026-10-06 00:00:00', 'DIA');
    expect(s).toHaveLength(5);
    expect(s[2]).toEqual({ rotulo: '03/10', faturamento: 50, lucro: 20 });
  });
});

describe('Senha (formato do ASP.NET Identity)', () => {
  it('confere hash gerado pelo .NET', () => {
    expect(verificarSenha('Senha1234', 'AQAAAAIAAYagAAAAEDF5fI3SMDF4zFlNMfHKnpS+w6UC1Azc0wAj5XmTDgeUVynx0xXKNn7JKZuTlA5S6w==')).toBe(true);
    expect(verificarSenha('Senha1235', 'AQAAAAIAAYagAAAAEDF5fI3SMDF4zFlNMfHKnpS+w6UC1Azc0wAj5XmTDgeUVynx0xXKNn7JKZuTlA5S6w==')).toBe(false);
  });
  it('gera e confere', () => {
    expect(verificarSenha('abc12345', hashSenha('abc12345'))).toBe(true);
  });
});
