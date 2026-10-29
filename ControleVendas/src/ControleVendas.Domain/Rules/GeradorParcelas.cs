namespace ControleVendas.Domain.Rules;

public record ParcelaGerada(int Numero, decimal Valor, DateTime Vencimento);

/// <summary>
/// Valor líquido dividido pela quantidade, com a diferença de centavos na última.
/// O 1º vencimento vem da tela e os seguintes caem a cada 30 dias.
/// </summary>
public static class GeradorParcelas
{
    public const int IntervaloDias = 30;
    public const int MaxParcelas = 24;

    public static IReadOnlyList<ParcelaGerada> Gerar(decimal valorLiquido, int quantidade, DateTime primeiroVencimento)
    {
        if (valorLiquido <= 0) throw new ArgumentOutOfRangeException(nameof(valorLiquido), "O valor do crediário precisa ser maior que zero.");
        if (quantidade < 1 || quantidade > MaxParcelas)
            throw new ArgumentOutOfRangeException(nameof(quantidade), $"Informe de 1 a {MaxParcelas} parcelas.");

        var valorParcela = Math.Floor(valorLiquido / quantidade * 100m) / 100m;
        var ultima = valorLiquido - valorParcela * (quantidade - 1);

        var parcelas = new List<ParcelaGerada>(quantidade);
        for (var i = 1; i <= quantidade; i++)
        {
            var valor = i == quantidade ? ultima : valorParcela;
            parcelas.Add(new ParcelaGerada(i, valor, primeiroVencimento.Date.AddDays(IntervaloDias * (i - 1))));
        }
        return parcelas;
    }
}
