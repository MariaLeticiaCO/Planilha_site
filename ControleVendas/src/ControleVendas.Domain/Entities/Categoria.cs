namespace ControleVendas.Domain.Entities;

public class Categoria : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public string Nome { get; set; } = "";
    public bool Ativo { get; set; } = true;
    public ICollection<Produto> Produtos { get; set; } = new List<Produto>();
}
