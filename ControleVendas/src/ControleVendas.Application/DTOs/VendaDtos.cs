using ControleVendas.Domain.Enums;

namespace ControleVendas.Application.DTOs;

public class NovaVendaDto
{
    public List<ItemNovaVendaDto> Itens { get; set; } = [];
    /// <summary>Valor digitado no campo de desconto (em R$ ou em %, conforme DescontoEmPercentual).</summary>
    public decimal Desconto { get; set; }
    public bool DescontoEmPercentual { get; set; }
    public int FormaPagamentoId { get; set; }
    public int? ClienteId { get; set; }
    public int QtdParcelas { get; set; } = 1;
    public DateTime? PrimeiroVencimento { get; set; }
    public string? Observacao { get; set; }
}

public class ItemNovaVendaDto
{
    public int ProdutoId { get; set; }
    public int Quantidade { get; set; }
}

public record VendaRegistradaDto(int VendaId, decimal Total, decimal? Lucro, IReadOnlyList<string> Avisos, string LinkRecibo);

public class FiltroVendasDto
{
    public DateTime? Inicio { get; set; }
    public DateTime? Fim { get; set; }
    public int? FormaPagamentoId { get; set; }
    public StatusVenda? Status { get; set; }
    public int Pagina { get; set; } = 1;
}

public record VendaListaDto(int Id, DateTime DataVenda, string? Cliente, string FormaPagamento, decimal Total, decimal? Lucro,
    StatusVenda Status, string Vendedor);

public record PaginaDto<T>(IReadOnlyList<T> Itens, int Pagina, int TotalPaginas, int TotalItens);

public record ItemVendaDetalheDto(string Produto, int Quantidade, decimal PrecoUnitario, decimal? CustoUnitario)
{
    public decimal Subtotal => Quantidade * PrecoUnitario;
}

public record VendaDetalheDto(int Id, DateTime DataVenda, string Vendedor, int? ClienteId, string? Cliente, string? ClienteTelefone,
    string FormaPagamento, decimal ValorBruto, decimal Desconto, decimal ValorTaxa, decimal? CustoTotal, decimal ValorLiquido,
    decimal? Lucro, StatusVenda Status, DateTime? DataCancelamento, string? Observacao,
    IReadOnlyList<ItemVendaDetalheDto> Itens, IReadOnlyList<ParcelaDto> Parcelas, string LinkRecibo);
