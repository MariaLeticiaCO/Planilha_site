namespace ControleVendas.Domain.Rules;

/// <summary>
/// Regras de cálculo da venda (seção 5 do documento):
///   Taxa  = (Valor bruto − Desconto) × TaxaPercentual / 100 + TaxaFixa
///   Lucro = (Valor bruto − Desconto) − Taxa − Custo dos itens
/// </summary>
public static class CalculadoraLucro
{
    public static decimal Arredondar(decimal valor) => Math.Round(valor, 2, MidpointRounding.AwayFromZero);

    public static decimal CalcularTaxa(decimal valorBruto, decimal desconto, decimal taxaPercentual, decimal taxaFixa)
    {
        ValidarDesconto(valorBruto, desconto);
        var baseCalculo = valorBruto - desconto;
        if (baseCalculo == 0) return 0;
        return Arredondar(baseCalculo * taxaPercentual / 100m + taxaFixa);
    }

    public static decimal CalcularLucro(decimal valorBruto, decimal desconto, decimal taxa, decimal custoItens)
    {
        ValidarDesconto(valorBruto, desconto);
        return Arredondar(valorBruto - desconto - taxa - custoItens);
    }

    /// <summary>Converte desconto em % para R$ (sobre o valor bruto).</summary>
    public static decimal DescontoPercentualEmReais(decimal valorBruto, decimal percentual)
    {
        if (percentual < 0 || percentual > 100)
            throw new ArgumentOutOfRangeException(nameof(percentual), "O desconto deve ficar entre 0% e 100%.");
        return Arredondar(valorBruto * percentual / 100m);
    }

    /// <summary>Margem sobre o preço de venda, em %.</summary>
    public static decimal CalcularMargem(decimal custo, decimal precoVenda) =>
        precoVenda <= 0 ? 0 : Arredondar((precoVenda - custo) / precoVenda * 100m);

    /// <summary>Preço que dá a margem desejada sobre o preço de venda.</summary>
    public static decimal PrecoSugerido(decimal custo, decimal margemDesejada)
    {
        if (margemDesejada >= 100) throw new ArgumentOutOfRangeException(nameof(margemDesejada), "A margem precisa ser menor que 100%.");
        return Arredondar(custo / (1 - margemDesejada / 100m));
    }

    /// <summary>Quanto o vendedor recebe numa venda de <paramref name="valor"/> com a taxa informada.</summary>
    public static decimal ValorRecebido(decimal valor, decimal taxaPercentual, decimal taxaFixa) =>
        Arredondar(valor - CalcularTaxa(valor, 0, taxaPercentual, taxaFixa));

    private static void ValidarDesconto(decimal valorBruto, decimal desconto)
    {
        if (desconto < 0) throw new ArgumentOutOfRangeException(nameof(desconto), "O desconto não pode ser negativo.");
        if (desconto > valorBruto) throw new ArgumentOutOfRangeException(nameof(desconto), "O desconto não pode ser maior que o valor bruto.");
    }
}
