using ControleVendas.Application.Common;
using ControleVendas.Application.DTOs;
using ControleVendas.Application.Services;
using ControleVendas.Domain.Entities;
using ControleVendas.Domain.Enums;

namespace ControleVendas.Tests;

public class RegrasAplicacaoTests
{
    [Fact]
    public void Empresa_em_trial_valido_pode_vender()
    {
        var agora = new DateTime(2026, 10, 29, 12, 0, 0);
        var e = new Empresa { StatusAssinatura = StatusAssinatura.TRIAL, DataFimTrial = agora.AddDays(2) };
        Assert.True(e.AssinaturaAtiva(agora));
        Assert.Equal(2, e.DiasRestantesTrial(agora));
        Assert.False(e.AssinaturaAtiva(agora.AddDays(3)));
    }

    [Fact]
    public void Basico_tem_limites_e_teste_tem_tudo_do_pro()
    {
        Assert.Equal(50, new Empresa { Plano = Plano.BASICO }.LimiteProdutos);
        Assert.Equal(1, new Empresa { Plano = Plano.BASICO }.LimiteUsuarios);
        Assert.Equal(3, new Empresa { Plano = Plano.TESTE }.LimiteUsuarios);
        Assert.True(new Empresa { Plano = Plano.TESTE }.TemRecursosPro);
    }

    [Fact]
    public void Pagamento_pro_mensal_ativa_e_e_idempotente()
    {
        var e = new Empresa { Plano = Plano.TESTE, StatusAssinatura = StatusAssinatura.TRIAL };
        var venc = new DateTime(2026, 11, 1);
        AssinaturaService.AplicarPagamento(e, OpcaoPlano.PRO_MENSAL, venc);
        var fim = e.DataFimAssinatura;
        AssinaturaService.AplicarPagamento(e, OpcaoPlano.PRO_MENSAL, venc); // webhook repetido
        Assert.Equal(Plano.PRO, e.Plano);
        Assert.Equal(StatusAssinatura.ATIVA, e.StatusAssinatura);
        Assert.Equal(fim, e.DataFimAssinatura);
        Assert.Equal(venc.AddMonths(1).AddDays(AssinaturaService.DiasTolerancia), fim);
    }

    [Fact]
    public void Basico_e_pagamento_unico_sem_data_fim()
    {
        var e = new Empresa { Plano = Plano.TESTE, StatusAssinatura = StatusAssinatura.TRIAL };
        AssinaturaService.AplicarPagamento(e, OpcaoPlano.BASICO, DateTime.Today);
        Assert.Equal(Plano.BASICO, e.Plano);
        Assert.Null(e.DataFimAssinatura);
        Assert.True(e.AssinaturaAtiva(DateTime.Today.AddYears(5)));
    }

    [Theory]
    [InlineData("empresa:12:PRO_ANUAL", true, 12, OpcaoPlano.PRO_ANUAL)]
    [InlineData("empresa:x:PRO_ANUAL", false, 0, OpcaoPlano.BASICO)]
    [InlineData("outra-coisa", false, 0, OpcaoPlano.BASICO)]
    [InlineData(null, false, 0, OpcaoPlano.BASICO)]
    public void Referencia_externa_do_webhook(string? referencia, bool ok, int empresaId, OpcaoPlano opcao)
    {
        Assert.Equal(ok, AssinaturaService.TentarLerReferencia(referencia, out var id, out var op));
        if (ok) { Assert.Equal(empresaId, id); Assert.Equal(opcao, op); }
    }

    [Fact]
    public void Link_whatsapp_usa_ddi_55_e_mensagem_codificada()
    {
        var link = Formatos.LinkWhatsApp("(11) 98765-4321", "Olá, Ana!");
        Assert.Equal("https://wa.me/5511987654321?text=Ol%C3%A1%2C%20Ana%21", link);
        Assert.StartsWith("https://wa.me/?text=", Formatos.LinkWhatsApp(null, "oi"));
    }

    [Fact]
    public void Periodos_do_dashboard()
    {
        var agora = new DateTime(2026, 10, 29, 15, 30, 0); // quinta-feira
        var semana = DashboardService.CalcularPeriodo("semana", null, null, agora);
        Assert.Equal(new DateTime(2026, 10, 26), semana.Inicio);
        Assert.Equal(new DateTime(2026, 11, 2), semana.Fim);
        Assert.Equal("DIA", semana.Agrupamento);

        var hoje = DashboardService.CalcularPeriodo(null, null, null, agora);
        Assert.Equal(("hoje", "HORA"), (hoje.Chave, hoje.Agrupamento));

        var ano = DashboardService.CalcularPeriodo("ano", null, null, agora);
        Assert.Equal(("MES", new DateTime(2027, 1, 1)), (ano.Agrupamento, ano.Fim));

        var mes = DashboardService.CalcularPeriodo("mes", null, null, agora);
        Assert.Equal("Outubro de 2026", mes.Texto);
    }

    [Fact]
    public void Serie_preenche_periodos_sem_venda_com_zero()
    {
        var inicio = new DateTime(2026, 10, 1);
        var serie = DashboardService.PreencherSerie(
            [new PontoSerieBrutoDto { Periodo = inicio.AddDays(2), Faturamento = 50, Lucro = 20 }],
            inicio, inicio.AddDays(5), "DIA");
        Assert.Equal(5, serie.Count);
        Assert.Equal("03/10", serie[2].Rotulo);
        Assert.Equal(50, serie[2].Faturamento);
        Assert.Equal(0, serie[0].Faturamento);
    }
}
