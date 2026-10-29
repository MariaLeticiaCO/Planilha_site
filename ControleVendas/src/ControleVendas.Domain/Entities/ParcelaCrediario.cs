using ControleVendas.Domain.Enums;

namespace ControleVendas.Domain.Entities;

public class ParcelaCrediario : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public int VendaId { get; set; }
    public Venda? Venda { get; set; }
    public int ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    public int Numero { get; set; }
    public int TotalParcelas { get; set; }
    public decimal Valor { get; set; }
    public DateTime DataVencimento { get; set; }
    public DateTime? DataPagamento { get; set; }
    public decimal? ValorPago { get; set; }
    public StatusParcela Status { get; set; } = StatusParcela.ABERTA;
}
