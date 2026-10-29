using ControleVendas.Domain.Enums;

namespace ControleVendas.Domain.Entities;

public class FormaPagamento : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public TipoPagamento Tipo { get; set; }
    public string Nome { get; set; } = "";
    public decimal TaxaPercentual { get; set; }
    public decimal TaxaFixa { get; set; }
    public bool Ativo { get; set; } = true;
    public int Ordem { get; set; }
}
