using ControleVendas.Domain.Rules;

namespace ControleVendas.Tests;

public class GeradorParcelasTests
{
    private static readonly DateTime Primeiro = new(2026, 11, 10);

    [Fact]
    public void Diferenca_de_centavos_vai_para_a_ultima()
    {
        var parcelas = GeradorParcelas.Gerar(100m, 3, Primeiro);
        Assert.Equal([33.33m, 33.33m, 33.34m], parcelas.Select(p => p.Valor));
        Assert.Equal(100m, parcelas.Sum(p => p.Valor));
    }

    [Fact]
    public void Vencimentos_a_cada_30_dias_a_partir_do_primeiro()
    {
        var parcelas = GeradorParcelas.Gerar(90m, 3, Primeiro);
        Assert.Equal([Primeiro, Primeiro.AddDays(30), Primeiro.AddDays(60)], parcelas.Select(p => p.Vencimento));
        Assert.Equal([1, 2, 3], parcelas.Select(p => p.Numero));
    }

    [Fact]
    public void Parcela_unica_tem_o_valor_total()
    {
        var p = Assert.Single(GeradorParcelas.Gerar(57.89m, 1, Primeiro));
        Assert.Equal(57.89m, p.Valor);
    }

    [Theory]
    [InlineData(10, 3)]
    [InlineData(0.05, 4)]
    [InlineData(1234.56, 12)]
    [InlineData(999.99, 7)]
    public void Soma_das_parcelas_e_sempre_o_valor_liquido(decimal valor, int qtd)
    {
        var parcelas = GeradorParcelas.Gerar(valor, qtd, Primeiro);
        Assert.Equal(qtd, parcelas.Count);
        Assert.Equal(valor, parcelas.Sum(p => p.Valor));
        Assert.All(parcelas.SkipLast(1), p => Assert.Equal(parcelas[0].Valor, p.Valor));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(25)]
    public void Quantidade_fora_do_limite_e_rejeitada(int qtd)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => GeradorParcelas.Gerar(100m, qtd, Primeiro));
    }

    [Fact]
    public void Valor_zero_e_rejeitado()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => GeradorParcelas.Gerar(0m, 2, Primeiro));
    }
}
