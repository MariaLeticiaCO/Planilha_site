namespace ControleVendas.Domain.Entities;

/// <summary>Guarda preço e custo do momento da venda: mudar o produto depois não altera o lucro passado.</summary>
public class ItemVenda : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public int VendaId { get; set; }
    public Venda? Venda { get; set; }
    public int ProdutoId { get; set; }
    public Produto? Produto { get; set; }
    public int Quantidade { get; set; }
    public decimal PrecoUnitario { get; set; }
    public decimal CustoUnitario { get; set; }

    public decimal Subtotal => Quantidade * PrecoUnitario;
}
