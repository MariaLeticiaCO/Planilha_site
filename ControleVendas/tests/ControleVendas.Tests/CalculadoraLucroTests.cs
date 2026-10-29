using ControleVendas.Domain.Rules;

namespace ControleVendas.Tests;

public class CalculadoraLucroTests
{
    [Fact]
    public void Taxa_usa_percentual_sobre_valor_com_desconto_mais_taxa_fixa()
    {
        // (100 − 10) × 4,99% + 0,50 = 4,491 + 0,50 = 4,99
        Assert.Equal(4.99m, CalculadoraLucro.CalcularTaxa(100m, 10m, 4.99m, 0.50m));
    }

    [Fact]
    public void Taxa_e_zero_quando_venda_fica_zerada()
    {
        Assert.Equal(0m, CalculadoraLucro.CalcularTaxa(50m, 50m, 3m, 1m));
    }

    [Fact]
    public void Lucro_desconta_desconto_taxa_e_custo()
    {
        // (12 − 1,20) − 0,54 − 4,00 = 6,26
        Assert.Equal(6.26m, CalculadoraLucro.CalcularLucro(12m, 1.20m, 0.54m, 4m));
    }

    [Fact]
    public void Lucro_pode_ser_negativo()
    {
        Assert.Equal(-2m, CalculadoraLucro.CalcularLucro(10m, 0m, 0m, 12m));
    }

    [Fact]
    public void Desconto_maior_que_valor_bruto_e_rejeitado()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculadoraLucro.CalcularTaxa(10m, 10.01m, 0, 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculadoraLucro.CalcularLucro(10m, 11m, 0, 0));
    }

    [Fact]
    public void Desconto_negativo_e_rejeitado()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculadoraLucro.CalcularLucro(10m, -1m, 0, 0));
    }

    [Theory]
    [InlineData(200, 10, 20)]
    [InlineData(33.33, 10, 3.33)]
    [InlineData(100, 100, 100)]
    public void Desconto_percentual_vira_reais(decimal bruto, decimal pct, decimal esperado)
    {
        Assert.Equal(esperado, CalculadoraLucro.DescontoPercentualEmReais(bruto, pct));
    }

    [Fact]
    public void Desconto_percentual_acima_de_100_e_rejeitado()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CalculadoraLucro.DescontoPercentualEmReais(100m, 101m));
    }

    [Theory]
    [InlineData(1.20, 3.50, 65.71)]
    [InlineData(10, 10, 0)]
    [InlineData(5, 0, 0)]
    [InlineData(12, 10, -20)]
    public void Margem_sobre_preco_de_venda(decimal custo, decimal preco, decimal esperado)
    {
        Assert.Equal(esperado, CalculadoraLucro.CalcularMargem(custo, preco));
    }

    [Fact]
    public void Preco_sugerido_atinge_a_margem_desejada()
    {
        var preco = CalculadoraLucro.PrecoSugerido(6m, 40m);
        Assert.Equal(10m, preco);
        Assert.Equal(40m, CalculadoraLucro.CalcularMargem(6m, preco));
    }

    [Fact]
    public void Simulador_venda_de_100()
    {
        Assert.Equal(96.51m, CalculadoraLucro.ValorRecebido(100m, 3.49m, 0m));
    }
}
