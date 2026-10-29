using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.DTOs;

public class ProdutoDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public int? CategoriaId { get; set; }
    public string? Codigo { get; set; }
    public decimal Custo { get; set; }
    public decimal PrecoVenda { get; set; }
    public int Estoque { get; set; }
    public int EstoqueMinimo { get; set; }
    public string? FotoUrl { get; set; }
    public bool Ativo { get; set; } = true;
}

public record ProdutoListaDto(int Id, string Nome, string? Codigo, string? Categoria, decimal Custo, decimal PrecoVenda,
    decimal MargemPercentual, int Estoque, int EstoqueMinimo, string? FotoUrl, bool Ativo)
{
    public bool EstoqueBaixo => Ativo && Estoque <= EstoqueMinimo;
}

public class FiltroProdutosDto
{
    public string? Busca { get; set; }
    public int? CategoriaId { get; set; }
    /// <summary>ativos (padrão), inativos, todos, estoque-baixo</summary>
    public string Status { get; set; } = "ativos";
}

/// <summary>Produto como aparece no PDV. Custo só vai para o Dono.</summary>
public record ProdutoVendaDto(int Id, string Nome, string? Codigo, decimal Preco, decimal? Custo, int Estoque, string? FotoUrl);

public record CategoriaDto(int Id, string Nome, bool Ativo, int QtdProdutos);

public class FormaPagamentoDto
{
    public int Id { get; set; }
    public TipoPagamento Tipo { get; set; }
    public string Nome { get; set; } = "";
    public decimal TaxaPercentual { get; set; }
    public decimal TaxaFixa { get; set; }
    public bool Ativo { get; set; } = true;
}

public class ClienteDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string? Telefone { get; set; }
    public string? Documento { get; set; }
    public string? Observacao { get; set; }
}

public record ClienteListaDto(int Id, string Nome, string? Telefone, decimal TotalDevido, decimal TotalAtrasado);

public record ClienteDetalheDto(ClienteDto Cliente, decimal TotalComprado, decimal TotalDevido,
    IReadOnlyList<VendaListaDto> Compras, IReadOnlyList<ParcelaDto> Parcelas);
