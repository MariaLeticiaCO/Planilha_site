namespace ControleVendas.Domain.Entities;

public class Cliente : IEntidadeEmpresa
{
    public int Id { get; set; }
    public int EmpresaId { get; set; }
    public string Nome { get; set; } = "";
    /// <summary>Somente dígitos, com DDD (ex.: 11987654321).</summary>
    public string? Telefone { get; set; }
    public string? Documento { get; set; }
    public string? Observacao { get; set; }
    public bool Ativo { get; set; } = true;
    public DateTime DataCadastro { get; set; }
}
