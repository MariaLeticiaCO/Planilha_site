namespace ControleVendas.Domain.Entities;

/// <summary>Setor escolhido no onboarding. Tabela global (não pertence a uma empresa).</summary>
public class Setor
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    /// <summary>Nome do ícone exibido no card do onboarding.</summary>
    public string Icone { get; set; } = "";
    /// <summary>Categorias criadas para a empresa ao escolher o setor, separadas por ";".</summary>
    public string CategoriasSugeridas { get; set; } = "";
    public int Ordem { get; set; }

    public IEnumerable<string> ListarCategoriasSugeridas() =>
        CategoriasSugeridas.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
