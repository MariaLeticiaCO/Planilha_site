namespace ControleVendas.Domain.Entities;

/// <summary>Linha da view vw_ParcelasCrediario (somente leitura).</summary>
public class ParcelaCrediarioView : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public int VendaId { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = "";
    public string? ClienteTelefone { get; set; }
    public int Numero { get; set; }
    public int TotalParcelas { get; set; }
    public decimal Valor { get; set; }
    public DateTime DataVencimento { get; set; }
    public DateTime? DataPagamento { get; set; }
    public decimal? ValorPago { get; set; }
    /// <summary>ABERTA, ATRASADA ou PAGA (canceladas ficam fora da view).</summary>
    public string Situacao { get; set; } = "";
    public int DiasAtraso { get; set; }
}
