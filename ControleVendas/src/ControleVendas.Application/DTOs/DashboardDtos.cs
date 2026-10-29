namespace ControleVendas.Application.DTOs;

// Os nomes seguem o JSON de /painel/dados descrito no documento do projeto.

public class ResumoDashboardDto
{
    public int QtdVendas { get; set; }
    public decimal Faturamento { get; set; }
    public decimal Taxas { get; set; }
    public decimal Custo { get; set; }
    public decimal Lucro { get; set; }
    public decimal TicketMedio { get; set; }
    public decimal AReceber { get; set; }
    public decimal Atrasado { get; set; }
}

/// <summary>Linha como sai da sp_Dashboard_Serie (sem os períodos vazios).</summary>
public class PontoSerieBrutoDto
{
    public DateTime Periodo { get; set; }
    public decimal Faturamento { get; set; }
    public decimal Lucro { get; set; }
}

public record PontoSerieDto(string Rotulo, decimal Faturamento, decimal Lucro);

public class FormaPagamentoDashboardDto
{
    public string Nome { get; set; } = "";
    public int Qtd { get; set; }
    public decimal Total { get; set; }
    public decimal Taxas { get; set; }
}

public class RankingProdutoDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public int Qtd { get; set; }
    public decimal Total { get; set; }
    public int Estoque { get; set; }
}

public record EstoqueBaixoDto(int Id, string Nome, int Estoque, int EstoqueMinimo);

public record PainelDadosDto(
    string Periodo,
    string PeriodoTexto,
    DateTime Inicio,
    DateTime Fim,
    ResumoDashboardDto Resumo,
    IReadOnlyList<PontoSerieDto> Serie,
    IReadOnlyList<FormaPagamentoDashboardDto> Formas,
    decimal TotalTaxas,
    IReadOnlyList<RankingProdutoDto> MaisVendidos,
    IReadOnlyList<RankingProdutoDto> MenosVendidos,
    IReadOnlyList<EstoqueBaixoDto> EstoqueBaixo);

/// <summary>O que o Vendedor vê no Início: só as próprias vendas do dia.</summary>
public record PainelVendedorDto(int QtdVendas, decimal Total, IReadOnlyList<VendaListaDto> Vendas);
