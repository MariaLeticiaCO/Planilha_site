namespace ControleVendas.Domain.Entities;

public class Produto : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public int? CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }
    public string? Codigo { get; set; }
    public string Nome { get; set; } = "";
    public decimal Custo { get; set; }
    public decimal PrecoVenda { get; set; }
    public int Estoque { get; set; }
    public int EstoqueMinimo { get; set; }
    /// <summary>Coluna calculada pelo banco: (Preço − Custo) / Preço × 100.</summary>
    public decimal MargemPercentual { get; private set; }
    public string? FotoUrl { get; set; }
    public bool Ativo { get; set; } = true;
    public DateTime DataCadastro { get; set; }

    public bool EstoqueBaixo => Ativo && Estoque <= EstoqueMinimo;
}
