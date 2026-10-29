namespace ControleVendas.Application.DTOs;

public record ParcelaDto(int Id, int VendaId, int ClienteId, string Cliente, string? Telefone, int Numero, int TotalParcelas,
    decimal Valor, DateTime DataVencimento, DateTime? DataPagamento, decimal? ValorPago, string Situacao, int DiasAtraso);

public record ResumoCrediarioDto(decimal TotalAReceber, decimal Atrasado, decimal VenceEstaSemana, int QtdAtrasadas);

public record DevedorDto(int ClienteId, string Cliente, string? Telefone, int QtdParcelas, decimal TotalDevido, decimal Atrasado,
    DateTime ProximoVencimento);

public record BaixaParcelaDto(int ParcelaId, DateTime DataPagamento, decimal ValorPago);
