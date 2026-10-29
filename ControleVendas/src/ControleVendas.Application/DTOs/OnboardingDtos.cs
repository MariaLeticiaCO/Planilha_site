using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.DTOs;

public record SetorDto(int Id, string Nome, string Icone, string CategoriasSugeridas);

public class OnboardingDto
{
    // Passo 1
    public string NomeNegocio { get; set; } = "";
    public int? SetorId { get; set; }

    // Passo 2
    public List<FormaOnboardingDto> Formas { get; set; } = [];

    // Passo 3 (opcional — botão "Pular")
    public bool PularProduto { get; set; }
    public string? ProdutoNome { get; set; }
    public decimal? ProdutoCusto { get; set; }
    public decimal? ProdutoPreco { get; set; }
}

public class FormaOnboardingDto
{
    public TipoPagamento Tipo { get; set; }
    public string Nome { get; set; } = "";
    public bool Ativo { get; set; } = true;
    public decimal TaxaPercentual { get; set; }
}
